import axios from 'axios'

// Базова адреса API (Azure). Можна перевизначити через .env -> VITE_API_URL
export const API_URL = (
  import.meta.env.VITE_API_URL ||
  'https://readyplayerone-d5cehnc2b0dreacv.germanywestcentral-01.azurewebsites.net'
).replace(/\/$/, '')

// Єдиний axios-інстанс. withCredentials потрібен, щоб браузер надсилав refresh-cookie
export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

let accessToken = ''
let refreshPromise = null
let sessionExpiredListener = () => {}

export const onSessionExpired = (fn) => { sessionExpiredListener = fn }
export function setAccessToken(token) { accessToken = token || '' }
export function clearAccessToken() { accessToken = '' }

const pickToken = (d) => d?.accessToken ?? d?.AccessToken ?? ''

// Ролі з JWT (для адмін-інтерфейсу)
export function getRoles() {
  try {
    const payload = JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    const r = payload.role ?? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? []
    return Array.isArray(r) ? r : [r]
  } catch {
    return []
  }
}

// Текст помилки з відповіді сервера (ProblemDetails / ValidationProblem / Identity errors)
export function errorMessage(error, fallback) {
  const d = error?.response?.data
  if (!d) return error?.response ? fallback : 'Сервер недоступний. Перевірте з’єднання.'
  if (typeof d === 'string' && d.trim()) return d
  const errors = d.errors ?? d.Errors
  if (Array.isArray(errors)) {
    const text = errors.map((e) => (typeof e === 'string' ? e : e.description ?? e.Description ?? '')).filter(Boolean).join(', ')
    if (text) return text
  } else if (errors && typeof errors === 'object') {
    const text = Object.values(errors).flat().join(', ')
    if (text) return text
  }
  return d.message ?? d.Message ?? d.detail ?? d.title ?? fallback
}

// POST /api/Auth/refresh — один спільний запит на всі паралельні 401/403
function refreshAccessToken() {
  if (!refreshPromise) {
    // окремий виклик axios без інтерсепторів, щоб не зациклитись
    refreshPromise = axios
      .post(`${API_URL}/api/Auth/refresh`, null, { withCredentials: true })
      .then(({ data }) => {
        const token = pickToken(data)
        if (!token) throw new Error('Сервер не повернув access-токен')
        accessToken = token
        return token
      })
      .catch((e) => {
        accessToken = ''
        throw e
      })
      .finally(() => { refreshPromise = null })
  }
  return refreshPromise
}

// Додаємо Bearer-токен до кожного запиту
api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

// Unauthorized / Forbidden -> оновлюємо токен через auth/refresh і повторюємо запит один раз
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    const isAuthCall = /\/api\/Auth\/(login|register|refresh|logout|confirm-email)/i.test(original?.url || '')
    if (original && (status === 401 || status === 403) && !original._retry && !isAuthCall) {
      original._retry = true
      const hadSession = !!accessToken
      try {
        await refreshAccessToken()
        original.headers.Authorization = `Bearer ${accessToken}`
        return api(original)
      } catch {
        clearAccessToken()
        if (hadSession) sessionExpiredListener() // користувач був залогінений, але сесія померла
      }
    }
    return Promise.reject(error)
  },
)

// Повний URL для картинок (аватар/обкладинка можуть прийти як відносний шлях)
export const assetUrl = (url) => (!url ? null : /^(https?:|blob:|data:)/.test(url) ? url : `${API_URL}${url}`)

/* ---------------- Auth ---------------- */

export async function register(userName, email, password) {
  try {
    await api.post('/api/Auth/register', { userName, email, password })
  } catch (e) {
    throw new Error(errorMessage(e, 'Не вдалося зареєструвати акаунт'))
  }
}

export async function login(email, password) {
  try {
    const { data } = await api.post('/api/Auth/login', { email, password })
    const token = pickToken(data)
    if (!token) throw new Error('Сервер не повернув access-токен')
    setAccessToken(token)
  } catch (e) {
    throw new Error(e.response ? errorMessage(e, 'Невірний email або пароль') : e.message)
  }
}

export async function logout() {
  try { await api.post('/api/Auth/logout') } catch { /* ignore */ }
  clearAccessToken()
}

// GET /api/Auth/me (+ GET /api/users/{id}, щоб підтягнути аватар і bio) -> профіль або null
export async function fetchProfile() {
  try {
    const { data: d } = await api.get('/api/Auth/me')
    const id = d.userId ?? d.UserId ?? d.id ?? d.Id
    const profile = {
      id,
      nick: d.displayName ?? d.DisplayName ?? d.userName ?? d.UserName ?? 'Гравець',
      email: d.email ?? d.Email ?? '',
      avatarUrl: d.avatarUrl ?? d.AvatarUrl ?? null,
      bio: d.bio ?? d.Bio ?? '',
      roles: getRoles(),
    }
    if (id && !profile.avatarUrl) {
      try {
        const { data: u } = await api.get(`/api/users/${id}`)
        profile.avatarUrl = u.avatarUrl ?? u.AvatarUrl ?? null
        profile.bio = profile.bio || (u.bio ?? u.Bio ?? '')
        profile.nick = u.displayName ?? u.DisplayName ?? profile.nick
      } catch { /* публічний профіль необов'язковий */ }
    }
    return profile
  } catch {
    return null
  }
}

// GET /api/Auth/confirm-email?userId=...&token=...   (уточнити за Swagger)
export async function confirmEmail(userId, token) {
  await api.get('/api/Auth/confirm-email', { params: { userId, token } })
}

/* ---------------- Аватар власного профілю (уточнити за Swagger) ---------------- */

export async function uploadAvatar(file) {
  const body = new FormData()
  body.append('avatar', file)
  try {
    const { data } = await api.post('/api/profile/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data?.avatarUrl ?? data?.AvatarUrl ?? null
  } catch (e) {
    throw new Error(errorMessage(e, 'Не вдалося завантажити аватар'))
  }
}

export async function deleteAvatar() {
  try {
    await api.delete('/api/profile/avatar')
  } catch (e) {
    throw new Error(errorMessage(e, 'Не вдалося видалити аватар'))
  }
}

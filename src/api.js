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

// Payload access-токена (JWT) — звідси беремо ролі й дані користувача
function jwtPayload() {
  try {
    return JSON.parse(atob(accessToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  } catch {
    return {}
  }
}

const CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/'

// Ролі з JWT (для адмін-інтерфейсу)
export function getRoles() {
  const p = jwtPayload()
  const r = p.role ?? p['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? []
  return Array.isArray(r) ? r : [r]
}

// Текст помилки з відповіді сервера (ProblemDetails / ValidationProblem / Identity errors)
export function errorMessage(error, fallback) {
  const d = error?.response?.data
  if (!d) return error?.response ? fallback : 'Сервер недоступний. Перевірте з’єднання.'
  if (typeof d === 'string') return d.trim() && !d.trim().startsWith('<') ? d : fallback
  const errors = Array.isArray(d) ? d : d.errors ?? d.Errors
  const one = (e) => (typeof e === 'string' ? e : e?.description ?? e?.Description ?? e?.message ?? e?.Message ?? '')
  if (Array.isArray(errors)) {
    const text = errors.map(one).filter(Boolean).join(', ')
    if (text) return text
  } else if (errors && typeof errors === 'object') {
    const text = Object.values(errors).flat().join(', ')
    if (text) return text
  }
  return d.message ?? d.Message ?? d.error ?? d.Error ?? d.detail ?? d.title ?? fallback
}

// POST /api/Auth/refresh — один спільний запит на всі паралельні 401/403
export function refreshAccessToken() {
  if (!refreshPromise) {
    // окремий виклик axios без інтерсепторів, щоб не зациклитись
    refreshPromise = axios
      .post(`${API_URL}/api/auth/refresh`, null, { withCredentials: true })
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
    const isAuthCall = /\/api\/Auth\/(login|register|refresh|logout|confirm-email|resend-confirmation)/i.test(original?.url || '')
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
    if (!e.response) throw new Error(e.message)
    const err = new Error(errorMessage(e, 'Невірний email або пароль'))
    // 403 або текст про підтвердження -> email ще не підтверджено
    if (e.response.status === 403 || /confirm|verif|підтверд|подтверд/i.test(err.message)) err.code = 'EMAIL_NOT_CONFIRMED'
    throw err
  }
}

export async function logout() {
  try { await api.post('/api/Auth/logout') } catch { /* ignore */ }
  clearAccessToken()
}

// Профіль користувача. Спершу GET /api/Auth/me; якщо такого ендпойнта немає — беремо дані з JWT.
export async function fetchProfile() {
  if (!accessToken) return null
  let d = null
  try {
    d = (await api.get('/api/Auth/me')).data
  } catch {
    if (!accessToken) return null // сесія померла
  }
  const p = jwtPayload()
  const id = d?.userId ?? d?.UserId ?? d?.id ?? d?.Id ?? p.sub ?? p[`${CLAIM}nameidentifier`] ?? p.nameid
  const userName = d?.userName ?? d?.UserName ?? p.unique_name ?? p.name ?? p[`${CLAIM}name`]
  const email = d?.email ?? d?.Email ?? p.email ?? p[`${CLAIM}emailaddress`] ?? ''
  if (!id && !userName && !email) return null
  const profile = {
    id,
    nick: d?.displayName ?? d?.DisplayName ?? userName ?? 'Гравець',
    email,
    avatarUrl: d?.avatarUrl ?? d?.AvatarUrl ?? null,
    bio: d?.bio ?? d?.Bio ?? '',
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
}

// Відновлення сесії при завантаженні сторінки: POST /api/Auth/refresh (refresh-cookie) -> access-токен -> профіль
export async function restoreSession() {
  try {
    await refreshAccessToken()
  } catch {
    return null // користувач не залогінений
  }
  return fetchProfile()
}

// POST /api/Auth/resend-confirmation  { email } — повторно надіслати лист із підтвердженням
export async function resendConfirmation(email) {
  try {
    await api.post('/api/Auth/resend-confirmation', { email })
  } catch (e) {
    throw new Error(errorMessage(e, 'Не вдалося надіслати лист. Спробуйте пізніше.'))
  }
}

// POST /api/Auth/confirm-email  { userId, token }
// Токен з листа — це base64 від Identity-токена ("CfDJ8..."). Спершу шлемо як є (бекенд сам декодує),
// а якщо сервер відповів 400 — пробуємо ще раз із розкодованим токеном.
export async function confirmEmail(userId, token) {
  try {
    await api.post('/api/Auth/confirm-email', { userId, token })
  } catch (e) {
    let decoded = ''
    try { decoded = atob(token) } catch { /* токен не base64 */ }
    if (e.response?.status === 400 && decoded.startsWith('CfDJ')) {
      await api.post('/api/Auth/confirm-email', { userId, token: decoded })
      return
    }
    throw e
  }
}

/* ---------------- Аватар власного профілю: PUT / DELETE /api/users/me/avatar ---------------- */

// Swagger не показує ім'я form-поля для IFormFile, тому надсилаємо файл під типовими іменами (зайві ASP.NET ігнорує)
export function fileForm(file, ...names) {
  const body = new FormData()
  for (const n of ['file', ...names]) body.append(n, file)
  return body
}

export async function uploadAvatar(file) {
  const body = fileForm(file, 'avatar', 'image')
  try {
    const { data } = await api.put('/api/users/me/avatar', body, { headers: { 'Content-Type': 'multipart/form-data' } })
    return data?.avatarUrl ?? data?.AvatarUrl ?? null
  } catch (e) {
    throw new Error(errorMessage(e, 'Не вдалося завантажити аватар'))
  }
}

export async function deleteAvatar() {
  try {
    await api.delete('/api/users/me/avatar')
  } catch (e) {
    throw new Error(errorMessage(e, 'Не вдалося видалити аватар'))
  }
}

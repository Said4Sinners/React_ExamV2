import { api } from './api'
import { get, normalizeGame, normalizePaged, normalizeSession, normalizeUser } from './normalize'

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null))

/* ---------- Games ---------- */
export async function getGames(page = 1, pageSize = 100) {
  const { data } = await api.get('/api/games', { params: { page, pageSize } })
  return normalizePaged(data, page, pageSize, normalizeGame).items
}
export async function getGame(id) {
  const { data } = await api.get(`/api/games/${id}`)
  return normalizeGame(data)
}
// ⚠ у списку Scalar такого ендпойнта немає — звірити, чи він існує
export const uploadGameCover = (id, file) => {
  const body = new FormData()
  body.append('cover', file)
  return api.post(`/api/games/${id}/cover`, body, { headers: { 'Content-Type': 'multipart/form-data' } })
}

/* ---------- Sessions ---------- */
export async function getSessions({ gameId, mode, status, page = 1, pageSize = 10 }) {
  const { data } = await api.get('/api/game-sessions', { params: clean({ gameId, mode, status, page, pageSize }) })
  return normalizePaged(data, page, pageSize, normalizeSession)
}
export async function getSession(id) {
  const { data } = await api.get(`/api/game-sessions/${id}`)
  return normalizeSession(data)
}
export async function createSession(body) {
  const res = await api.post('/api/game-sessions', body)
  const d = res.data
  const id = typeof d === 'object' ? get(d, 'id') : d || res.headers?.location?.split('/').pop()
  return { id }
}

// Дія над сесією. method — HTTP-метод, який очікуємо від API; якщо сервер відповів 405
// (метод не дозволений), одразу пробуємо протилежний (PUT <-> POST), щоб не залежати від помилки в методі.
const act = async (id, path, body, method = 'post') => {
  const url = `/api/game-sessions/${id}/${path}`
  try {
    return await api.request({ url, method, data: body })
  } catch (e) {
    if (e.response?.status !== 405) throw e
    return api.request({ url, method: method === 'put' ? 'post' : 'put', data: body })
  }
}

export const joinSession = (id) => act(id, 'join')
export const leaveSession = (id) => act(id, 'leave')
export const createTeam = (id, name) => act(id, 'teams', { name })
export const joinTeam = (id, teamId) => act(id, `teams/${teamId}/join`)
export const leaveTeam = (id) => act(id, 'teams/leave')

// Методи звірені зі Scalar: ready — PUT, start / complete / cancel — POST
// ready: сервер очікує у тілі голе булеве значення (true / false), а не об'єкт
export const setReady = (id, isReady) => act(id, 'ready', JSON.stringify(!!isReady), 'put')
export const startSession = (id) => act(id, 'start')
export const completeSession = (id) => act(id, 'complete')
export const cancelSession = (id) => act(id, 'cancel')

export const updateSession = (id, body) => api.put(`/api/game-sessions/${id}`, body).then(() => ({ id }))
export const deleteSession = (id) => api.delete(`/api/game-sessions/${id}`)
export const deleteTeam = (id, teamId) => api.delete(`/api/game-sessions/${id}/teams/${teamId}`)

/* ---------- Users ---------- */
export async function getUsers({ search, page = 1, pageSize = 12 }) {
  const { data } = await api.get('/api/users', { params: clean({ search, page, pageSize }) })
  return normalizePaged(data, page, pageSize, normalizeUser)
}
export async function getUser(id) {
  const { data } = await api.get(`/api/users/${id}`)
  return normalizeUser(data)
}

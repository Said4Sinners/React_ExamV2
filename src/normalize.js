// Сервер може віддавати camelCase або PascalCase, а enum — рядком чи числом. Усе приводимо до одного вигляду.
export const get = (o, ...keys) => {
  if (!o || typeof o !== 'object') return undefined
  for (const k of keys) {
    const v = o[k] ?? o[k.charAt(0).toUpperCase() + k.slice(1)]
    if (v !== undefined && v !== null) return v
  }
  return undefined
}

export const same = (a, b) => a != null && b != null && String(a).toLowerCase() === String(b).toLowerCase()

export const MODES = ['FreeForAll', 'TeamBased', 'Cooperative']
export const STATUSES = ['Waiting', 'InProgress', 'Completed', 'Cancelled']
export const MODE_IDS = { FreeForAll: 0, TeamBased: 1, Cooperative: 2 }
export const MODE_LABELS = { FreeForAll: 'Кожен сам за себе', TeamBased: 'Командний', Cooperative: 'Кооператив' }
export const STATUS_LABELS = { Waiting: 'Очікування', InProgress: 'У грі', Completed: 'Завершена', Cancelled: 'Скасована' }

const enumName = (v, list) => {
  if (v == null) return undefined
  if (typeof v === 'number') return list[v]
  return list.find((x) => x.toLowerCase() === String(v).toLowerCase()) ?? String(v)
}

export function normalizePaged(d, page, pageSize, map) {
  const raw = Array.isArray(d) ? d : get(d, 'items', 'data', 'results') ?? []
  const items = raw.map(map)
  const total = Array.isArray(d) ? items.length : Number(get(d, 'totalCount', 'total', 'totalItems') ?? items.length)
  const size = Number(get(d, 'pageSize') ?? pageSize)
  return {
    items,
    total,
    page: Number(get(d, 'page', 'pageNumber') ?? page),
    totalPages: Number(get(d, 'totalPages') ?? Math.max(1, Math.ceil(total / size))),
  }
}

export const normalizeGame = (g) => ({
  id: get(g, 'id'),
  name: get(g, 'name') ?? 'Гра',
  description: get(g, 'description') ?? '',
  genre: get(g, 'genre', 'genreName') ?? '',
  coverImageUrl: get(g, 'coverImageUrl') ?? null,
})

export const normalizeUser = (u) => ({
  id: get(u, 'id', 'userId'),
  name: get(u, 'displayName', 'userName', 'nickName') ?? 'Гравець',
  userName: get(u, 'userName') ?? '',
  avatarUrl: get(u, 'avatarUrl') ?? null,
  bio: get(u, 'bio') ?? '',
})

function normalizeParticipant(p) {
  const user = get(p, 'user')
  return {
    userId: get(p, 'userId') ?? get(user, 'id'),
    name: get(p, 'userName', 'displayName', 'nickName') ?? get(user, 'displayName', 'userName') ?? 'Гравець',
    avatarUrl: get(p, 'avatarUrl') ?? get(user, 'avatarUrl') ?? null,
    isReady: !!get(p, 'isReady'),
    teamId: get(p, 'teamId') ?? null,
  }
}

export function normalizeSession(s) {
  const game = get(s, 'game')
  const host = get(s, 'host')
  const teamsRaw = (get(s, 'teams') ?? []).map((t) => ({
    id: get(t, 'id'),
    name: get(t, 'name') ?? 'Команда',
    max: get(t, 'maxPlayers', 'maxMembers'),
    raw: get(t, 'members', 'participants') ?? [],
  }))
  let partsRaw = get(s, 'participants') ?? []
  if (!partsRaw.length) partsRaw = teamsRaw.flatMap((t) => t.raw.map((m) => ({ ...m, teamId: get(m, 'teamId') ?? t.id })))
  const participants = partsRaw.map(normalizeParticipant)
  const perTeam = Number(get(s, 'playersPerTeam') ?? 0) || null

  return {
    id: get(s, 'id'),
    gameId: get(s, 'gameId') ?? get(game, 'id'),
    gameName: get(s, 'gameName') ?? get(game, 'name') ?? '',
    hostId: get(s, 'hostId') ?? get(host, 'id'),
    hostName: get(s, 'hostName', 'hostUserName', 'hostDisplayName') ?? get(host, 'displayName', 'userName') ?? '—',
    name: get(s, 'name', 'title') ?? 'Сесія',
    mode: enumName(get(s, 'mode'), MODES) ?? 'FreeForAll',
    status: enumName(get(s, 'status'), STATUSES) ?? 'Waiting',
    maxPlayers: Number(get(s, 'maxPlayers') ?? 0),
    currentPlayers: Number(get(s, 'currentPlayers', 'participantsCount', 'participantCount', 'playersCount') ?? participants.length),
    requiredTeams: Number(get(s, 'requiredTeams') ?? 0) || null,
    playersPerTeam: perTeam,
    participants,
    teams: teamsRaw.map((t) => {
      const members = participants.filter((p) => same(p.teamId, t.id))
      return { id: t.id, name: t.name, max: t.max ?? perTeam, members: members.length ? members : t.raw.map(normalizeParticipant) }
    }),
  }
}

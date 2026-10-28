import { useEffect, useState } from 'react'
import { getGames } from './api'
import { FALLBACK_GAMES, PALETTES } from './data'

// Сервер повертає лише { id, name, description }. genre / online — необов'язкові
function normalize(g, i) {
  return {
    id: g.id ?? g.Id ?? i,
    name: g.name ?? g.Name ?? 'Гра',
    genre: g.genre ?? g.Genre ?? 'Інше',
    online: Number(g.online ?? g.Online ?? 0),
    description: g.description ?? g.Description ?? '',
    c: PALETTES[i % PALETTES.length],
  }
}

export function useGames() {
  const [state, setState] = useState({ games: [], loading: true, demo: false, error: '' })

  useEffect(() => {
    let active = true
    getGames(1, 100)
      .then((data) => {
        // Відповідь: PagedResult { items: [...] }
        const list = Array.isArray(data) ? data : (data?.items ?? [])
        if (active) setState({ games: list.map(normalize), loading: false, demo: false, error: '' })
      })
      .catch((e) => {
        console.error('GET /api/Games failed:', e)
        const status = e.response ? `HTTP ${e.response.status}` : 'немає відповіді'
        if (active) setState({ games: FALLBACK_GAMES, loading: false, demo: true, error: status })
      })
    return () => { active = false }
  }, [])

  return state
}

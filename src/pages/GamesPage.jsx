import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Cover, CardsSkeleton, PageHead, StateBox } from '../components/ui'
import { useFetch } from '../hooks'
import { getGames } from '../services'

export default function GamesPage() {
  const { data, loading, error, reload } = useFetch(() => getGames(1, 100), [])
  const [genre, setGenre] = useState('Усі')
  const [q, setQ] = useState('')
  const games = useMemo(() => data ?? [], [data])

  const genres = useMemo(() => [...new Set(games.map((g) => g.genre).filter(Boolean))], [games])
  const shown = useMemo(
    () => games.filter((g) => (genre === 'Усі' || g.genre === genre) && g.name.toLowerCase().includes(q.trim().toLowerCase())),
    [games, genre, q],
  )

  return (
    <section>
      <PageHead eyebrow="GAMECLUB LIBRARY" title="Бібліотека ігор" text="Обери гру, подивись відкриті сесії та збери команду." />

      <div className="toolbar">
        {genres.length > 0 && (
          <div className="chips">
            {['Усі', ...genres].map((g) => (
              <button key={g} className={'chip' + (genre === g ? ' active' : '')} onClick={() => setGenre(g)}>
                <b>{g === 'Усі' ? games.length : games.filter((x) => x.genre === g).length}</b>{g}
              </button>
            ))}
          </div>
        )}
        <input className="search" placeholder="Пошук гри..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <StateBox loading={loading} error={error} onRetry={() => reload()} empty={!shown.length} skeleton={<CardsSkeleton />}>
        <div className="cards">
          {shown.map((g) => (
            <Link className="mode" key={g.id} to={`/games/${g.id}`}>
              <Cover game={g} className="cover-fill" />
              <span className="play">ВІДКРИТИ</span>
              <h3>{g.name}</h3>
              {g.genre && <small>{g.genre}</small>}
            </Link>
          ))}
        </div>
      </StateBox>
    </section>
  )
}

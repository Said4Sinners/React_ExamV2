import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Avatar, StateBox, StatusBadge } from '../components/ui'
import { useFetch } from '../hooks'
import { MODE_LABELS, same } from '../normalize'
import { getUser } from '../services'

export default function PlayerPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const { data: p, loading, error, reload } = useFetch(() => getUser(id), [id])

  return (
    <section>
      <Link className="back" to="/players">← Усі гравці</Link>
      <StateBox loading={loading} error={error} onRetry={() => reload()}>
        {p && (
          <div className="profile-card public-card">
            <div className="profile-avatar-wrap">
              <Avatar name={p.name} url={p.avatarUrl} size={156} />
            </div>
            <div className="profile-details">
              <span className="eyebrow">ПУБЛІЧНИЙ ПРОФІЛЬ</span>
              <h2>{p.name}</h2>
              {p.userName && p.userName !== p.name && <p className="profile-email">@{p.userName}</p>}
              {p.bio ? <p className="profile-bio">{p.bio}</p> : <p className="muted">Гравець ще нічого не розповів про себе.</p>}
              {user && same(user.id, p.id) && <Link className="btn primary" to="/profile">Мій профіль</Link>}
            </div>
          </div>
        )}
        {p && (
          <>
            <h3 className="section-title">Активні сесії</h3>
            {p.activeSessions.length ? (
              <div className="list">
                {p.activeSessions.map((s) => (
                  <div className="row session-row" key={s.id}>
                    {s.gameName && <Link to={`/games/${s.gameId}`} className="badge">{s.gameName}</Link>}
                    <div className="grow">
                      <b>{s.name}</b><br />
                      <small>{MODE_LABELS[s.mode] ?? s.mode}</small>
                    </div>
                    <StatusBadge status={s.status} />
                    <Link className="btn sm primary" to={`/sessions/${s.id}`}>Відкрити лобі</Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty">Немає активних сесій</div>
            )}
          </>
        )}
      </StateBox>
    </section>
  )
}

import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { Avatar, StateBox } from '../components/ui'
import { useFetch } from '../hooks'
import { same } from '../normalize'
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
      </StateBox>
    </section>
  )
}

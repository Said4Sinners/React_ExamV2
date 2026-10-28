import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorMessage } from '../api'
import SessionCard from '../components/SessionCard'
import SessionFormModal from '../components/SessionFormModal'
import { Cover, Pagination, RowsSkeleton, StateBox } from '../components/ui'
import { useFetch } from '../hooks'
import { getGame, getSessions, uploadGameCover } from '../services'

// Тільки для адміністратора
function CoverUpload({ gameId, onDone }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return setErr('Оберіть файл зображення.')
    setBusy(true)
    setErr('')
    try {
      await uploadGameCover(gameId, file)
      onDone()
    } catch (ex) {
      setErr(errorMessage(ex, 'Не вдалося завантажити обкладинку'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="admin-box">
      <label className="btn sm upload-btn">
        {busy ? 'Завантаження...' : 'Змінити обкладинку (admin)'}
        <input type="file" accept="image/*" onChange={onFile} disabled={busy} />
      </label>
      {err && <span className="err">{err}</span>}
    </div>
  )
}

export default function GamePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { requireAuth, isAdmin } = useAuth()
  const [page, setPage] = useState(1)
  const [creating, setCreating] = useState(false)

  const game = useFetch(() => getGame(id), [id])
  const sessions = useFetch(() => getSessions({ gameId: id, status: 'Waiting', page, pageSize: 8 }), [id, page])

  return (
    <section>
      <Link className="back" to="/games">← Усі ігри</Link>
      <StateBox loading={game.loading} error={game.error} onRetry={() => game.reload()}>
        {game.data && (
          <div className="game-hero">
            <Cover game={game.data} className="game-hero-cover" />
            <div className="game-hero-info">
              {game.data.genre && <span className="badge">{game.data.genre}</span>}
              <h1>{game.data.name}</h1>
              {game.data.description && <p className="muted">{game.data.description}</p>}
              <div className="hero-actions">
                <button className="btn primary" onClick={() => requireAuth(() => setCreating(true))}>+ Створити сесію</button>
                {isAdmin && <CoverUpload gameId={id} onDone={() => game.reload()} />}
              </div>
            </div>
          </div>
        )}
      </StateBox>

      <div className="head-row section-title">
        <span className="eyebrow">ВІДКРИТІ СЕСІЇ{sessions.data ? ` · ${sessions.data.total}` : ''}</span>
      </div>
      <StateBox
        loading={sessions.loading}
        error={sessions.error}
        onRetry={() => sessions.reload()}
        empty={!sessions.data?.items.length}
        emptyText="Поки немає відкритих сесій — створи першу!"
        skeleton={<RowsSkeleton />}
      >
        <div className="list">{sessions.data?.items.map((s) => <SessionCard key={s.id} s={s} />)}</div>
        <Pagination page={page} totalPages={sessions.data?.totalPages ?? 1} onChange={setPage} />
      </StateBox>

      {creating && (
        <SessionFormModal
          gameId={id}
          onClose={() => setCreating(false)}
          onSaved={(s) => navigate(s.id ? `/sessions/${s.id}` : '/sessions')}
        />
      )}
    </section>
  )
}

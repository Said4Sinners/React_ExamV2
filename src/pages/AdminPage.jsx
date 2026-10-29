import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import ModerationPanel from '../components/Moderation'
import { PageHead, Pagination, RowsSkeleton, StateBox, StatusBadge } from '../components/ui'
import { useFetch } from '../hooks'
import { MODE_LABELS, STATUS_LABELS } from '../normalize'
import { getSession, getSessions } from '../services'

function AdminSessions() {
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(null)

  const list = useFetch(() => getSessions({ status, page, pageSize: 8 }), [status, page])
  const detail = useFetch(() => (selected ? getSession(selected) : Promise.resolve(null)), [selected], { poll: selected ? 8000 : 0 })
  const items = list.data?.items ?? []

  return (
    <section>
      <PageHead eyebrow="ADMIN" title="Панель адміністратора" text="Оберіть сесію, щоб викинути гравця, забанити його або розбанити." />

      <div className="toolbar">
        <select className="search" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="">Усі статуси</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div className="admin-grid">
        <div>
          <StateBox loading={list.loading} error={list.error} onRetry={() => list.reload()} empty={!items.length} emptyText="Сесій немає." skeleton={<RowsSkeleton />}>
            <div className="list">
              {items.map((s) => (
                <button type="button" key={s.id} className={'row admin-session' + (selected === s.id ? ' active' : '')} onClick={() => setSelected(s.id)}>
                  <span className="grow">
                    <b>{s.name}</b><br />
                    <small>{[s.gameName, MODE_LABELS[s.mode] ?? s.mode].filter(Boolean).join(' · ')}</small>
                  </span>
                  <StatusBadge status={s.status} />
                  <b>{s.currentPlayers}/{s.maxPlayers}</b>
                </button>
              ))}
            </div>
            <Pagination page={page} totalPages={list.data?.totalPages ?? 1} onChange={setPage} />
          </StateBox>
        </div>

        <div>
          {!selected && <div className="empty">← Оберіть сесію зі списку.</div>}
          {selected && (
            <StateBox loading={detail.loading && !detail.data} error={detail.error} onRetry={() => detail.reload()} skeleton={<RowsSkeleton />}>
              {detail.data && (
                <ModerationPanel
                  key={selected}
                  session={detail.data}
                  showLink
                  onChanged={() => Promise.all([detail.reload(true), list.reload(true)])}
                />
              )}
            </StateBox>
          )}
        </div>
      </div>
    </section>
  )
}

export default function AdminPage() {
  const { user, isAdmin, booting, openAuth } = useAuth()
  if (booting) return <RowsSkeleton />
  if (!isAdmin) {
    return (
      <div className="confirm-box">
        <h1>Лише для адміністраторів</h1>
        <p className="muted">{user ? 'У вашого акаунта немає прав адміністратора.' : 'Увійдіть в акаунт адміністратора.'}</p>
        {user ? <Link className="btn primary" to="/games">До ігор</Link> : <button className="btn primary" onClick={() => openAuth('login')}>Увійти</button>}
      </div>
    )
  }
  return <AdminSessions />
}

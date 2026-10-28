import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import SessionCard from '../components/SessionCard'
import SessionFormModal from '../components/SessionFormModal'
import { PageHead, Pagination, RowsSkeleton, StateBox } from '../components/ui'
import { useFetch } from '../hooks'
import { MODE_LABELS, STATUS_LABELS } from '../normalize'
import { getGames, getSessions } from '../services'

const PAGE_SIZE = 10

export default function SessionsPage() {
  const navigate = useNavigate()
  const { requireAuth } = useAuth()
  const [sp, setSp] = useSearchParams()
  const [creating, setCreating] = useState(false)

  // фільтри й сторінка живуть в URL — посилання та F5 працюють
  const f = { gameId: sp.get('gameId') || '', mode: sp.get('mode') || '', status: sp.get('status') || '', page: Number(sp.get('page')) || 1 }
  const setParam = (k, v) => {
    const next = new URLSearchParams(sp)
    if (v) next.set(k, v)
    else next.delete(k)
    if (k !== 'page') next.delete('page')
    setSp(next)
  }

  const games = useFetch(() => getGames(1, 100), [])
  const res = useFetch(() => getSessions({ ...f, pageSize: PAGE_SIZE }), [f.gameId, f.mode, f.status, f.page])
  const items = (res.data?.items ?? []).filter((s) => !f.mode || s.mode === f.mode)

  return (
    <section>
      <PageHead eyebrow="GAMECLUB LOBBY" title="Ігрові сесії" text="Усі сесії клубу. Відфільтруй за грою, режимом або статусом.">
        <button className="btn primary" onClick={() => requireAuth(() => setCreating(true))}>+ Створити сесію</button>
      </PageHead>

      <div className="toolbar">
        <select className="search" value={f.gameId} onChange={(e) => setParam('gameId', e.target.value)}>
          <option value="">Усі ігри</option>
          {(games.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <select className="search" value={f.mode} onChange={(e) => setParam('mode', e.target.value)}>
          <option value="">Усі режими</option>
          {Object.entries(MODE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        <select className="search" value={f.status} onChange={(e) => setParam('status', e.target.value)}>
          <option value="">Усі статуси</option>
          {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <StateBox loading={res.loading} error={res.error} onRetry={() => res.reload()} empty={!items.length} emptyText="Сесій за цими фільтрами немає." skeleton={<RowsSkeleton />}>
        <div className="list">{items.map((s) => <SessionCard key={s.id} s={s} showGame />)}</div>
        <Pagination page={f.page} totalPages={res.data?.totalPages ?? 1} onChange={(p) => setParam('page', p > 1 ? String(p) : '')} />
      </StateBox>

      {creating && (
        <SessionFormModal
          gameId={f.gameId}
          onClose={() => setCreating(false)}
          onSaved={(s) => navigate(s.id ? `/sessions/${s.id}` : '/sessions')}
        />
      )}
    </section>
  )
}

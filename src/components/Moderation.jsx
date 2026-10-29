import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorMessage } from '../api'
import { useEscape, useFetch } from '../hooks'
import { same } from '../normalize'
import { banParticipant, getSessionBans, kickParticipant, unbanUser } from '../services'
import { Avatar, StateBox, UserLink, UserLinkAuto } from './ui'

const fmtDate = (v) => {
  const d = v ? new Date(v) : null
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' }) : ''
}

function BanDialog({ name, busy, onConfirm, onClose }) {
  const [reason, setReason] = useState('')
  useEscape(onClose)
  return (
    <div className="overlay">
      <div className="modal has-x" role="dialog" aria-modal="true">
        <button type="button" className="close" onClick={onClose} aria-label="Закрити">×</button>
        <h3>Забанити «{name}»?</h3>
        <form className="form" onSubmit={(e) => { e.preventDefault(); onConfirm(reason) }}>
          <p className="muted">Гравець не зможе приєднатися до цієї сесії, доки його не розблокують.</p>
          <label>Причина (необов’язково)
            <textarea rows={3} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </label>
          <button className="btn danger" disabled={busy}>{busy ? 'Бан...' : 'Забанити'}</button>
        </form>
      </div>
    </div>
  )
}

// Модерація однієї сесії: учасники (викинути / забанити) + список забанених (розбанити). Лише для адміна.
export default function ModerationPanel({ session: s, onChanged, showLink = false }) {
  const { user } = useAuth()
  const bans = useFetch(() => getSessionBans(s.id), [s.id])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [banTarget, setBanTarget] = useState(null)

  const run = async (fn) => {
    setBusy(true)
    setError('')
    try {
      await fn()
      await Promise.all([bans.reload(true), onChanged?.()])
      return true
    } catch (e) {
      const status = e.response?.status
      setError(errorMessage(e, '') || (status === 403 ? 'Недостатньо прав для цієї дії' : `Не вдалося виконати дію${status ? ` (код ${status})` : ''}`))
      return false
    } finally {
      setBusy(false)
    }
  }

  const kick = (p) => {
    if (window.confirm(`Викинути «${p.name}» із сесії?`)) run(() => kickParticipant(s.id, p.userId))
  }
  const ban = async (reason) => {
    if (await run(() => banParticipant(s.id, banTarget.userId, reason))) setBanTarget(null)
  }

  return (
    <div className="admin-panel">
      <div className="head-row">
        <span className="eyebrow">МОДЕРАЦІЯ · {s.name}</span>
        {showLink && <Link className="btn sm" to={`/sessions/${s.id}`}>Відкрити лобі</Link>}
      </div>

      {error && <div className="notice error">{error}</div>}

      <div>
        <div className="mod-title">Учасники · {s.participants.length}</div>
        <div className="list">
          {s.participants.map((p) => {
            const self = same(p.userId, user?.id)
            return (
              <div className="row participant" key={p.userId}>
                <Avatar name={p.name} url={p.avatarUrl} size={34} />
                <div className="grow">
                  <UserLink id={p.userId} name={p.name} />
                  {same(p.userId, s.hostId) && <span className="badge host-badge">Хост</span>}
                </div>
                {!self && (
                  <div className="host-buttons">
                    <button className="btn sm" disabled={busy} onClick={() => kick(p)}>Викинути</button>
                    <button className="btn sm danger" disabled={busy} onClick={() => setBanTarget(p)}>Забанити</button>
                  </div>
                )}
              </div>
            )
          })}
          {!s.participants.length && <div className="empty">У сесії немає учасників.</div>}
        </div>
      </div>

      <div>
        <div className="mod-title">Забанені{bans.data ? ` · ${bans.data.length}` : ''}</div>
        <StateBox loading={bans.loading && !bans.data} error={bans.error} onRetry={() => bans.reload()} empty={!bans.data?.length} emptyText="Забанених немає." skeleton={<div className="empty">Завантаження...</div>}>
          <div className="list">
            {bans.data?.map((b) => (
              <div className="row participant" key={b.userId}>
                <Avatar name={b.name || '?'} url={b.avatarUrl} size={34} />
                <div className="grow">
                  <UserLinkAuto id={b.userId} name={b.name} />
                  <div className="ban-meta">{[b.reason, fmtDate(b.bannedAt)].filter(Boolean).join(' · ') || 'Без причини'}</div>
                </div>
                <button className="btn sm primary" disabled={busy} onClick={() => run(() => unbanUser(s.id, b.userId))}>Розбанити</button>
              </div>
            ))}
          </div>
        </StateBox>
      </div>

      {banTarget && <BanDialog name={banTarget.name} busy={busy} onConfirm={ban} onClose={() => !busy && setBanTarget(null)} />}
    </div>
  )
}

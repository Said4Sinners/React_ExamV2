import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { errorMessage } from '../api'
import SessionFormModal from '../components/SessionFormModal'
import { Avatar, RowsSkeleton, StateBox, StatusBadge, UserLink } from '../components/ui'
import { useFetch } from '../hooks'
import { MODE_LABELS, same } from '../normalize'
import {
  cancelSession, completeSession, createTeam, deleteSession, deleteTeam, getSession,
  joinSession, joinTeam, leaveSession, leaveTeam, setReady, startSession,
} from '../services'

export default function SessionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, requireAuth } = useAuth()
  // лобі: актуальні дані + тихе опитування API кожні 5 с
  const { data: s, loading, error, reload } = useFetch(() => getSession(id), [id], { poll: 5000 })
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  const [editing, setEditing] = useState(false)
  const [teamName, setTeamName] = useState('')

  // Виконує дію, блокує кнопки на час запиту і після успіху перезапитує сесію
  const run = async (fn, after) => {
    setBusy(true)
    setActionError('')
    try {
      await fn()
      if (after) after()
      else await reload(true)
    } catch (e) {
      const status = e.response?.status
      setActionError(errorMessage(e, '') || `Не вдалося виконати дію${status ? ` (код ${status})` : ''}`)
    } finally {
      setBusy(false)
    }
  }
  const confirmRun = (text, fn, after) => { if (window.confirm(text)) run(fn, after) }

  return (
    <section>
      <Link className="back" to="/sessions">← Усі сесії</Link>
      <StateBox loading={loading && !s} error={error} onRetry={() => reload()} skeleton={<RowsSkeleton />}>
        {s && (() => {
          const me = user ? s.participants.find((p) => same(p.userId, user.id)) : null
          const isHost = !!user && same(s.hostId, user.id)
          const waiting = s.status === 'Waiting'
          const live = s.status === 'InProgress'
          const full = s.currentPlayers >= s.maxPlayers
          const isTeam = s.mode === 'TeamBased'
          const teamsLimitReached = s.requiredTeams && s.teams.length >= s.requiredTeams

          return (
            <>
              <div className="lobby-head">
                <div>
                  <div className="lobby-meta">
                    <Link className="badge" to={`/games/${s.gameId}`}>{s.gameName || 'Гра'}</Link>
                    <StatusBadge status={s.status} />
                    <span className="muted">{MODE_LABELS[s.mode] ?? s.mode}</span>
                  </div>
                  <h1>{s.name}</h1>
                  <p className="muted">Хост: <UserLink id={s.hostId} name={s.hostName} /> · Гравців: <b>{s.currentPlayers}/{s.maxPlayers}</b></p>
                </div>

                <div className="lobby-actions">
                  {/* дії учасника */}
                  {!me && waiting && (
                    <button className="btn primary" disabled={busy || (!!user && full)} onClick={() => requireAuth(() => run(() => joinSession(id)))}>
                      {user && full ? 'Сесія заповнена' : 'Приєднатися'}
                    </button>
                  )}
                  {me && waiting && (
                    <button className={'btn' + (me.isReady ? '' : ' primary')} disabled={busy} onClick={() => run(() => setReady(id, !me.isReady))}>
                      {me.isReady ? 'Скасувати готовність' : 'Я готовий'}
                    </button>
                  )}
                  {me && (waiting || live) && (
                    <button className="btn" disabled={busy} onClick={() => confirmRun('Покинути сесію?', () => leaveSession(id))}>Покинути сесію</button>
                  )}
                </div>
              </div>

              {actionError && <div className="notice error">{actionError}</div>}

              {/* керування хоста */}
              {isHost && (
                <div className="host-panel">
                  <span className="eyebrow">КЕРУВАННЯ СЕСІЄЮ</span>
                  <div className="host-buttons">
                    {waiting && <button className="btn sm" disabled={busy} onClick={() => setEditing(true)}>Редагувати</button>}
                    {waiting && <button className="btn sm primary" disabled={busy} onClick={() => run(() => startSession(id))}>Запустити</button>}
                    {live && <button className="btn sm primary" disabled={busy} onClick={() => run(() => completeSession(id))}>Завершити</button>}
                    {(waiting || live) && (
                      <button className="btn sm" disabled={busy} onClick={() => confirmRun('Скасувати сесію?', () => cancelSession(id))}>Скасувати</button>
                    )}
                    {!live && (
                      <button className="btn sm danger" disabled={busy} onClick={() => confirmRun('Видалити сесію назавжди?', () => deleteSession(id), () => navigate('/sessions'))}>Видалити</button>
                    )}
                  </div>
                </div>
              )}

              <div className={isTeam ? 'lobby-grid' : ''}>
                {/* учасники */}
                <div>
                  <div className="head-row section-title"><span className="eyebrow">УЧАСНИКИ · {s.participants.length}</span></div>
                  <div className="list">
                    {s.participants.map((p) => {
                      const team = s.teams.find((t) => same(t.id, p.teamId))
                      return (
                        <div className="row participant" key={p.userId}>
                          <Avatar name={p.name} url={p.avatarUrl} size={36} />
                          <div className="grow">
                            <UserLink id={p.userId} name={p.name} />
                            {same(p.userId, s.hostId) && <span className="badge host-badge">Хост</span>}
                            {isTeam && <small className="muted"> · {team ? team.name : 'без команди'}</small>}
                          </div>
                          <span className={'ready' + (p.isReady ? ' yes' : '')}>{p.isReady ? 'Готовий' : 'Не готовий'}</span>
                        </div>
                      )
                    })}
                    {!s.participants.length && <div className="empty">У сесії ще немає учасників.</div>}
                  </div>
                </div>

                {/* команди — тільки для TeamBased */}
                {isTeam && (
                  <div>
                    <div className="head-row section-title">
                      <span className="eyebrow">КОМАНДИ · {s.teams.length}{s.requiredTeams ? `/${s.requiredTeams}` : ''}</span>
                    </div>

                    {isHost && waiting && !teamsLimitReached && (
                      <form
                        className="team-form"
                        onSubmit={(e) => {
                          e.preventDefault()
                          if (teamName.trim()) run(() => createTeam(id, teamName.trim()), async () => { setTeamName(''); await reload(true) })
                        }}
                      >
                        <input className="search" placeholder="Назва команди" value={teamName} maxLength={40} onChange={(e) => setTeamName(e.target.value)} />
                        <button className="btn sm primary" disabled={busy || !teamName.trim()}>Створити команду</button>
                      </form>
                    )}

                    <div className="team-grid">
                      {s.teams.map((t) => {
                        const inTeam = !!me && (same(me.teamId, t.id) || t.members.some((m) => same(m.userId, me.userId)))
                        const places = t.max ? t.max - t.members.length : null
                        const teamFull = places !== null && places <= 0
                        return (
                          <div className="team-card" key={t.id}>
                            <div className="head-row">
                              <b>{t.name}</b>
                              <small className="muted">{places === null ? `${t.members.length} гр.` : teamFull ? 'Немає місць' : `Вільно: ${places}`}</small>
                            </div>
                            <ul>
                              {t.members.map((m) => <li key={m.userId}><UserLink id={m.userId} name={m.name} /></li>)}
                              {!t.members.length && <li className="muted">Порожня</li>}
                            </ul>
                            <div className="host-buttons">
                              {me && waiting && !inTeam && (
                                <button className="btn sm primary" disabled={busy || teamFull} onClick={() => run(() => joinTeam(id, t.id))}>Приєднатися до команди</button>
                              )}
                              {me && waiting && inTeam && (
                                <button className="btn sm" disabled={busy} onClick={() => run(() => leaveTeam(id))}>Покинути команду</button>
                              )}
                              {isHost && waiting && (
                                <button className="btn sm danger" disabled={busy} onClick={() => confirmRun(`Видалити команду «${t.name}»?`, () => deleteTeam(id, t.id))}>Видалити</button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {!s.teams.length && <div className="empty">Команд ще немає.</div>}
                    </div>
                  </div>
                )}
              </div>
              <p className="muted poll-note">Лобі оновлюється автоматично кожні 5 секунд.</p>

              {editing && (
                <SessionFormModal session={s} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); reload(true) }} />
              )}
            </>
          )
        })()}
      </StateBox>
    </section>
  )
}

import { useState } from 'react'
import { errorMessage } from '../api'
import { useFetch } from '../hooks'
import { MODE_IDS, MODE_LABELS } from '../normalize'
import { createSession, getGames, updateSession } from '../services'

// Створення сесії (gameId — гра, вибрана автоматично) або редагування (session)
export default function SessionFormModal({ gameId, session, onClose, onSaved }) {
  const edit = !!session
  const games = useFetch(() => getGames(1, 100), [])
  const [f, setF] = useState({
    gameId: String(session?.gameId ?? gameId ?? ''),
    name: session?.name ?? '',
    mode: session?.mode ?? 'FreeForAll',
    maxPlayers: session?.maxPlayers || 5,
    teams: session?.requiredTeams ?? 2,
    perTeam: session?.playersPerTeam ?? 5,
  })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const team = f.mode === 'TeamBased'

  const submit = async (e) => {
    e.preventDefault()
    if (!f.gameId) return setErr('Оберіть гру')
    if (f.name.trim().length < 3) return setErr('Назва: мінімум 3 символи')
    const max = team ? Number(f.teams) * Number(f.perTeam) : Number(f.maxPlayers)
    if (!(max >= 2)) return setErr('У сесії має бути щонайменше 2 гравці')
    const body = {
      gameId: f.gameId,
      name: f.name.trim(),
      mode: MODE_IDS[f.mode],
      maxPlayers: max,
      requiredTeams: team ? Number(f.teams) : null,
      playersPerTeam: team ? Number(f.perTeam) : null,
    }
    setErr('')
    setBusy(true)
    try {
      onSaved(edit ? await updateSession(session.id, body) : await createSession(body))
    } catch (ex) {
      setErr(errorMessage(ex, 'Не вдалося зберегти сесію'))
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <h3>{edit ? 'Редагування сесії' : 'Нова ігрова сесія'}</h3>
        <form className="form" onSubmit={submit}>
          <label>Гра
            <select value={f.gameId} onChange={set('gameId')} disabled={edit || games.loading}>
              {games.loading && <option value={f.gameId}>Завантаження...</option>}
              {!f.gameId && !games.loading && <option value="">— оберіть гру —</option>}
              {(games.data ?? []).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          {games.error && <div className="err">{games.error}</div>}
          <label>Назва<input value={f.name} onChange={set('name')} placeholder="Вечірня катка" maxLength={60} /></label>
          <label>Режим
            <select value={f.mode} onChange={set('mode')} disabled={edit}>
              {Object.entries(MODE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </label>
          {team ? (
            <div className="two-fields">
              <label>Команд<input type="number" min="2" max="10" value={f.teams} onChange={set('teams')} /></label>
              <label>Гравців у команді<input type="number" min="1" max="10" value={f.perTeam} onChange={set('perTeam')} /></label>
            </div>
          ) : (
            <label>Макс. гравців<input type="number" min="2" max="100" value={f.maxPlayers} onChange={set('maxPlayers')} /></label>
          )}
          {err && <div className="err">{err}</div>}
          <button className="btn primary" disabled={busy}>{busy ? 'Збереження...' : edit ? 'Зберегти' : 'Створити'}</button>
        </form>
      </div>
    </div>
  )
}

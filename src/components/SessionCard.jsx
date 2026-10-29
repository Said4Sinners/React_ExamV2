import { Link } from 'react-router-dom'
import { MODE_LABELS } from '../normalize'
import { HostLink, StatusBadge } from './ui'

export default function SessionCard({ s, showGame }) {
  const pct = s.maxPlayers ? Math.min(100, (s.currentPlayers / s.maxPlayers) * 100) : 0
  return (
    <div className="row session-row">
      {showGame && <Link to={`/games/${s.gameId}`} className="badge">{s.gameName || 'Гра'}</Link>}
      <div className="grow">
        <b>{s.name}</b><br />
        <small>Хост: <HostLink id={s.hostId} name={s.hostName} /> · {MODE_LABELS[s.mode] ?? s.mode}</small>
      </div>
      <StatusBadge status={s.status} />
      <div className="bar"><i style={{ width: `${pct}%` }} /></div>
      <b>{s.currentPlayers}/{s.maxPlayers}</b>
      <Link className="btn sm primary" to={`/sessions/${s.id}`}>Відкрити лобі</Link>
    </div>
  )
}

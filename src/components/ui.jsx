import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { assetUrl } from '../api'
import { STATUS_LABELS } from '../normalize'

export function Avatar({ name = '?', url, size = 32 }) {
  const [badUrl, setBadUrl] = useState(null)
  const src = url && url !== badUrl ? assetUrl(url) : null
  const style = { width: size, height: size, fontSize: size * 0.42 }
  return src
    ? <img className="ava avatar-img" style={style} src={src} alt={name} onError={() => setBadUrl(url)} />
    : <div className="ava" style={style}>{(name || '?').charAt(0).toUpperCase()}</div>
}

const PALETTES = [
  ['#f59e0b', '#7c2d12'], ['#ef4444', '#450a0a'], ['#fb7185', '#4c0519'], ['#38bdf8', '#082f49'],
  ['#f97316', '#431407'], ['#a855f7', '#2e1065'], ['#a16207', '#27272a'], ['#22c55e', '#052e16'],
]
const palette = (key) => {
  let h = 0
  for (const c of String(key)) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTES[h % PALETTES.length]
}

// Обкладинка гри: CoverImageUrl, а якщо її немає або вона не завантажилась — градієнт із літерою
export function Cover({ game, className = '' }) {
  const [badUrl, setBadUrl] = useState(null)
  const url = game.coverImageUrl
  const src = url && url !== badUrl ? assetUrl(url) : null
  const [a, b] = palette(game.id ?? game.name)
  return (
    <div className={`cover ${className}`} style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}>
      {src ? <img src={src} alt="" onError={() => setBadUrl(url)} /> : <span className="letter">{game.name.charAt(0)}</span>}
    </div>
  )
}

export const StatusBadge = ({ status }) => <span className={`status st-${status}`}>{STATUS_LABELS[status] ?? status}</span>

// Єдиний блок станів: завантаження / помилка / порожньо
export function StateBox({ loading, error, onRetry, empty, emptyText = 'Нічого не знайдено', skeleton, children }) {
  if (loading) return skeleton ?? <div className="empty">Завантаження...</div>
  if (error) {
    return (
      <div className="notice error">
        <span>{error}</span>
        {onRetry && <button className="btn sm" onClick={onRetry}>Повторити</button>}
      </div>
    )
  }
  if (empty) return <div className="empty">{emptyText}</div>
  return children
}

export const CardsSkeleton = () => (
  <div className="cards">{Array.from({ length: 8 }, (_, i) => <div className="mode skeleton" key={i} />)}</div>
)
export const RowsSkeleton = () => (
  <div className="list">{Array.from({ length: 5 }, (_, i) => <div className="row skeleton" style={{ height: 64 }} key={i} />)}</div>
)

export function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null
  const nums = [...new Set([1, page - 1, page, page + 1, totalPages])].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  return (
    <nav className="pagination">
      <button className="btn sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>←</button>
      {nums.map((n, i) => (
        <Fragment key={n}>
          {i > 0 && n - nums[i - 1] > 1 && <span className="muted">…</span>}
          <button className={'btn sm' + (n === page ? ' primary' : '')} onClick={() => onChange(n)}>{n}</button>
        </Fragment>
      ))}
      <button className="btn sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>→</button>
    </nav>
  )
}

export const PageHead = ({ eyebrow, title, text, children }) => (
  <div className="page-heading">
    <div>
      {eyebrow && <span className="eyebrow">{eyebrow}</span>}
      <h1>{title}</h1>
      {text && <p>{text}</p>}
    </div>
    {children}
  </div>
)

export const UserLink = ({ id, name }) => (id ? <Link className="ulink" to={`/players/${id}`}>{name}</Link> : <span>{name}</span>)

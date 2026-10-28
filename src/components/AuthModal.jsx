import { useState } from 'react'
import { register } from '../api'
import { useAuth } from '../AuthContext'

export default function AuthModal({ initialTab, onClose }) {
  const { signIn } = useAuth()
  const [tab, setTab] = useState(initialTab)
  const [f, setF] = useState({ nick: '', email: '', pass: '', pass2: '' })
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const reg = tab === 'register'

  const submit = async (e) => {
    e.preventDefault()
    if (!f.email || !f.pass || (reg && !f.nick)) return setErr('Заповніть усі поля')
    if (reg && f.pass !== f.pass2) return setErr('Паролі не співпадають')
    setErr('')
    setInfo('')
    setBusy(true)
    try {
      if (reg) {
        await register(f.nick, f.email, f.pass)
        try {
          await signIn(f.email, f.pass)
        } catch {
          // акаунт створено, але вхід не вдався (напр., потрібне підтвердження email)
          setTab('login')
          setInfo('Акаунт створено. Підтвердіть email за листом (якщо потрібно) і увійдіть.')
          setBusy(false)
        }
      } else {
        await signIn(f.email, f.pass)
      }
    } catch (ex) {
      setErr(ex.message || 'Не вдалося виконати запит')
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <div className="tabs">
          <button className={!reg ? 'active' : ''} onClick={() => { setTab('login'); setErr('') }}>Вхід</button>
          <button className={reg ? 'active' : ''} onClick={() => { setTab('register'); setErr(''); setInfo('') }}>Реєстрація</button>
        </div>
        <form className="form" onSubmit={submit}>
          {reg && <label>Нікнейм<input value={f.nick} onChange={set('nick')} /></label>}
          <label>Email<input type="email" value={f.email} onChange={set('email')} /></label>
          <label>Пароль<input type="password" value={f.pass} onChange={set('pass')} /></label>
          {reg && <label>Повторіть пароль<input type="password" value={f.pass2} onChange={set('pass2')} /></label>}
          {info && <div className="ok">{info}</div>}
          {err && <div className="err">{err}</div>}
          <button className="btn primary" disabled={busy}>{busy ? 'Зачекайте...' : reg ? 'Створити акаунт' : 'Увійти'}</button>
        </form>
      </div>
    </div>
  )
}

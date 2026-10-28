import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmEmail, errorMessage } from '../api'
import { useAuth } from '../AuthContext'

export default function ConfirmEmailPage() {
  const [sp] = useSearchParams()
  const { openAuth } = useAuth()
  const userId = sp.get('userId')
  const token = sp.get('token') ?? sp.get('code')
  const [state, setState] = useState(userId && token ? { s: 'loading' } : { s: 'invalid' })
  const started = useRef(false)

  useEffect(() => {
    if (!userId || !token || started.current) return
    started.current = true
    confirmEmail(userId, token)
      .then(() => setState({ s: 'ok' }))
      .catch((e) => setState({ s: 'error', text: errorMessage(e, 'Не вдалося підтвердити email') }))
  }, [userId, token])

  return (
    <section className="confirm-box">
      {state.s === 'loading' && <h1>Підтверджуємо email...</h1>}
      {state.s === 'ok' && (
        <>
          <h1>Email підтверджено ✅</h1>
          <p className="muted">Тепер можна увійти в акаунт.</p>
          <button className="btn primary" onClick={() => openAuth('login', true)}>Увійти</button>
        </>
      )}
      {state.s === 'error' && (
        <>
          <h1>Не вдалося підтвердити</h1>
          <div className="notice error">{state.text}</div>
          <Link className="btn" to="/games">На головну</Link>
        </>
      )}
      {state.s === 'invalid' && (
        <>
          <h1>Некоректне посилання</h1>
          <p className="muted">У посиланні відсутні параметри підтвердження.</p>
          <Link className="btn" to="/games">На головну</Link>
        </>
      )}
    </section>
  )
}

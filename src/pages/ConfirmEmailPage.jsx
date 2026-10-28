import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { confirmEmail, errorMessage } from '../api'
import { useAuth } from '../AuthContext'

// Сторінка, на яку веде посилання з листа: /confirm-email?userId=...&token=...
// Email підтверджується лише після натискання кнопки (а не автоматично при відкритті сторінки).
export default function ConfirmEmailPage() {
  const [sp] = useSearchParams()
  const { openAuth } = useAuth()
  const userId = sp.get('userId')
  const rawToken = sp.get('token') ?? sp.get('code')
  const token = rawToken ? rawToken.replace(/ /g, '+') : rawToken // '+' у токені після розбору query стає пробілом
  const [state, setState] = useState({ s: userId && token ? 'ready' : 'invalid' })

  const confirm = async () => {
    setState({ s: 'loading' })
    try {
      await confirmEmail(userId, token)
      setState({ s: 'ok' })
    } catch (e) {
      setState({ s: 'error', status: e.response?.status, text: errorMessage(e, 'Не вдалося підтвердити email. Можливо, посилання застаріло.') })
    }
  }

  return (
    <section className="confirm-box">
      {(state.s === 'ready' || state.s === 'loading') && (
        <>
          <h1>Підтвердження email</h1>
          <p className="muted">Натисніть кнопку, щоб підтвердити вашу пошту та завершити реєстрацію.</p>
          <button className="btn primary" onClick={confirm} disabled={state.s === 'loading'}>
            {state.s === 'loading' ? 'Зачекайте...' : 'Підтвердити email'}
          </button>
        </>
      )}
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
          {state.status && <p className="muted">Код відповіді сервера: {state.status}</p>}
          <p className="muted">Якщо ви вже підтверджували пошту, просто увійдіть. Якщо ні — запросіть новий лист у вікні входу.</p>
          <div>
            <button className="btn primary" onClick={() => openAuth('login', true)}>Увійти</button>{' '}
            <button className="btn" onClick={confirm}>Спробувати ще раз</button>{' '}
            <Link className="btn" to="/games">На головну</Link>
          </div>
        </>
      )}
      {state.s === 'invalid' && (
        <>
          <h1>Некоректне посилання</h1>
          <p className="muted">У посиланні відсутні параметри підтвердження. Відкрийте посилання з листа ще раз.</p>
          <Link className="btn" to="/games">На головну</Link>
        </>
      )}
    </section>
  )
}

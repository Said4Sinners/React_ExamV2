import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { Avatar } from './components/ui'
import AdminPage from './pages/AdminPage'
import ConfirmEmailPage from './pages/ConfirmEmailPage'
import GamePage from './pages/GamePage'
import GamesPage from './pages/GamesPage'
import PlayerPage from './pages/PlayerPage'
import PlayersPage from './pages/PlayersPage'
import ProfilePage from './pages/ProfilePage'
import SessionPage from './pages/SessionPage'
import SessionsPage from './pages/SessionsPage'
import './App.css'

const NotFound = () => (
  <div className="confirm-box">
    <h1>Сторінку не знайдено</h1>
    <Link className="btn primary" to="/games">До ігор</Link>
  </div>
)

export default function App() {
  const { user, booting, isAdmin, openAuth, signOut } = useAuth()

  return (
    <>
      <header className="header">
        <div className="wrap">
          <Link to="/games" className="logo">GAME<span>CLUB</span></Link>
          <nav className="menu">
            <NavLink to="/games">Ігри</NavLink>
            <NavLink to="/sessions">Сесії</NavLink>
            <NavLink to="/players">Гравці</NavLink>
            {isAdmin && <NavLink to="/admin">Адмін</NavLink>}
          </nav>
          <div className="auth">
            {booting ? null : user ? (
              <>
                <Link className="me profile-link" to="/profile">
                  <Avatar name={user.nick} url={user.avatarUrl} size={32} />
                  <span className="me-name">{user.nick}</span>
                </Link>
                <button className="btn sm" onClick={signOut}>Вийти</button>
              </>
            ) : (
              <>
                <button className="btn" onClick={() => openAuth('login', true)}>Увійти</button>
                <button className="btn primary" onClick={() => openAuth('register', true)}>Реєстрація</button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="wrap">
        <Routes>
          <Route path="/" element={<Navigate to="/games" replace />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:id" element={<GamePage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/sessions/:id" element={<SessionPage />} />
          <Route path="/players" element={<PlayersPage />} />
          <Route path="/players/:id" element={<PlayerPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div>
            <div className="logo">GAME<span>CLUB</span></div>
            <div>Знаходь команду, створюй сесії та грай разом.</div>
          </div>
          <div>
            <h4>Розділи</h4>
            <div><Link to="/games">Ігри</Link></div>
            <div><Link to="/sessions">Сесії</Link></div>
            <div><Link to="/players">Гравці</Link></div>
          </div>
          <div>
            <h4>Акаунт</h4>
            <div><Link to="/profile">Профіль</Link></div>
          </div>
          <div className="footer-bottom">© 2026 · навчальний проєкт</div>
        </div>
      </footer>
    </>
  )
}

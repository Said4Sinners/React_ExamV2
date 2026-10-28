import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchProfile, login, logout, onSessionExpired } from './api'
import AuthModal from './components/AuthModal'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(true)
  const [modal, setModal] = useState(null) // { mode: 'login' | 'register', redirect: bool }

  useEffect(() => {
    // refresh не спрацював, хоча користувач був залогінений -> розлогінюємо й просимо увійти
    onSessionExpired(() => { setUser(null); setModal({ mode: 'login', redirect: false }) })
    let active = true
    fetchProfile()
      .then((u) => { if (active && u) setUser(u) })
      .finally(() => { if (active) setBooting(false) })
    return () => { active = false }
  }, [])

  const signIn = async (email, password) => {
    await login(email, password)
    const profile = await fetchProfile()
    if (!profile) throw new Error('Не вдалося завантажити профіль')
    setUser(profile)
    setModal(null)
    if (modal?.redirect) navigate('/profile')
  }

  const signOut = async () => {
    await logout()
    setUser(null)
    navigate('/games')
  }

  const openAuth = (mode = 'login', redirect = false) => setModal({ mode, redirect })
  const requireAuth = (fn) => (user ? fn() : openAuth('login'))
  const isAdmin = !!user?.roles?.some((r) => String(r).toLowerCase() === 'admin')

  return (
    <AuthCtx.Provider value={{ user, setUser, booting, isAdmin, openAuth, requireAuth, signIn, signOut }}>
      {children}
      {modal && <AuthModal key={modal.mode} initialTab={modal.mode} onClose={() => setModal(null)} />}
    </AuthCtx.Provider>
  )
}

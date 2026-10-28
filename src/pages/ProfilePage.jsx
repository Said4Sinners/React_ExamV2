import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { deleteAvatar, fetchProfile, uploadAvatar } from '../api'
import { Avatar, PageHead } from '../components/ui'

const MAX_SIZE = 5 * 1024 * 1024

export default function ProfilePage() {
  const { user, setUser, booting, openAuth } = useAuth()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null) // { ok, text }
  const input = useRef(null)

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  if (booting) return <div className="empty">Завантаження...</div>
  if (!user) {
    return (
      <div className="notice">
        <span>Щоб відкрити профіль, увійдіть в акаунт.</span>
        <button className="btn sm primary" onClick={() => openAuth('login', true)}>Увійти</button>
      </div>
    )
  }

  const pick = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) return setMsg({ ok: false, text: 'Оберіть файл зображення.' })
    if (f.size > MAX_SIZE) return setMsg({ ok: false, text: 'Максимальний розмір файлу — 5 МБ.' })
    setMsg(null)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }
  const cancel = () => { setFile(null); setPreview(null) }

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const url = await uploadAvatar(file)
      // якщо сервер не повернув URL — перечитуємо профіль
      const fresh = url ? { ...user, avatarUrl: url } : await fetchProfile()
      if (fresh) setUser(fresh)
      cancel()
      setMsg({ ok: true, text: 'Аватар оновлено' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Видалити аватар?')) return
    setBusy(true)
    setMsg(null)
    try {
      await deleteAvatar()
      setUser({ ...user, avatarUrl: null })
      setMsg({ ok: true, text: 'Аватар видалено' })
    } catch (e) {
      setMsg({ ok: false, text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="profile-page">
      <PageHead eyebrow="GAMECLUB ACCOUNT" title="Мій профіль" text="Керуйте аватаром та перегляньте дані акаунта." />

      <div className="profile-card">
        <div className="profile-avatar-wrap">
          {preview ? <img className="profile-avatar" src={preview} alt="Попередній перегляд" /> : <Avatar name={user.nick} url={user.avatarUrl} size={156} />}

          {preview ? (
            <div className="avatar-actions">
              <button className="btn primary sm" disabled={busy} onClick={save}>{busy ? 'Завантаження...' : 'Зберегти'}</button>
              <button className="btn sm" disabled={busy} onClick={cancel}>Скасувати</button>
            </div>
          ) : (
            <div className="avatar-actions">
              <button className="btn primary sm" disabled={busy} onClick={() => input.current.click()}>{user.avatarUrl ? 'Замінити' : 'Завантажити'}</button>
              {user.avatarUrl && <button className="btn sm danger" disabled={busy} onClick={remove}>Видалити</button>}
            </div>
          )}
          <input ref={input} type="file" accept="image/*" hidden onChange={pick} />
          <small>PNG, JPG, WEBP або GIF · до 5 МБ</small>
          {msg && <div className={msg.ok ? 'ok' : 'err'}>{msg.text}</div>}
        </div>

        <div className="profile-details">
          <span className="eyebrow">ОСОБИСТА ІНФОРМАЦІЯ</span>
          <h2>{user.nick}</h2>
          <p className="profile-email">{user.email || 'Email не вказано'}</p>
          {user.bio && <p className="profile-bio">{user.bio}</p>}
          <div className="profile-info-row"><span>ID акаунта</span><b>{user.id || '—'}</b></div>
          {user.roles?.length > 0 && <div className="profile-info-row"><span>Ролі</span><b>{user.roles.join(', ')}</b></div>}
          <div className="profile-links">
            <Link className="btn" to={`/players/${user.id}`}>Публічний профіль</Link>
            <Link className="btn" to="/sessions">До сесій</Link>
          </div>
        </div>
      </div>

      <div className="profile-note">
        <b>Безпека сесії</b>
        <span>Якщо access-токен закінчиться, застосунок автоматично запросить новий через auth/refresh і повторить запит.</span>
      </div>
    </section>
  )
}

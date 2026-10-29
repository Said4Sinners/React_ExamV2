import { useEffect, useMemo, useState } from 'react'
import { errorMessage } from '../api'
import { useEscape, useFetch } from '../hooks'
import { createGame, getGenres, uploadGameCover } from '../services'

const MAX_COVER = 5 * 1024 * 1024

// Транслітерація укр/рос літер для slug
const TRANSLIT = {
  а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i',
  к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
  ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', ы: 'y', э: 'e', ъ: '',
}
// "Terraria 2: Reborn" -> "terraria-2-reborn"
const slugify = (name) =>
  name
    .toLowerCase()
    .replace(/[\u0400-\u04ff]/g, (ch) => TRANSLIT[ch] ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

// Додавання нової гри (тільки адмін): назва, опис, жанр і необов’язкова обкладинка
export default function GameFormModal({ onClose, onSaved }) {
  useEscape(onClose)
  const genres = useFetch(() => getGenres(), [])
  const [f, setF] = useState({ name: '', description: '', genreId: '' })
  const [file, setFile] = useState(null)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const pickFile = (e) => {
    const picked = e.target.files?.[0]
    e.target.value = ''
    if (!picked) return
    if (!picked.type.startsWith('image/')) return setErr('Оберіть файл зображення.')
    if (picked.size > MAX_COVER) return setErr('Обкладинка завелика (максимум 5 МБ).')
    setErr('')
    setFile(picked)
  }

  const submit = async (e) => {
    e.preventDefault()
    const name = f.name.trim()
    if (name.length < 2) return setErr('Назва: мінімум 2 символи')
    const genre = (genres.data ?? []).find((g) => String(g.id) === f.genreId)
    const slug = slugify(name)
    if (!slug) return setErr('Назва має містити літери або цифри')
    const body = { name, slug, description: f.description.trim(), ...(genre ? { genreId: genre.id } : {}) }
    setErr('')
    setBusy(true)
    let created
    try {
      created = await createGame(body)
    } catch (ex) {
      setErr(errorMessage(ex, 'Не вдалося створити гру'))
      setBusy(false)
      return
    }
    // гра вже створена — збій обкладинки не має блокувати результат
    let coverError = ''
    if (file && created.id) {
      try { await uploadGameCover(created.id, file) } catch (ex) { coverError = errorMessage(ex, 'Не вдалося завантажити обкладинку') }
    }
    onSaved({ id: created.id, name, coverError })
  }

  return (
    <div className="overlay">
      <div className="modal has-x wide" role="dialog" aria-modal="true">
        <button type="button" className="close" onClick={onClose} aria-label="Закрити">×</button>
        <h3>Нова гра</h3>
        <form className="form" onSubmit={submit}>
          <label>Назва<input value={f.name} onChange={set('name')} placeholder="Minecraft" maxLength={80} autoFocus /></label>
          <label>Опис<textarea rows={3} value={f.description} onChange={set('description')} maxLength={500} placeholder="Коротко про гру" /></label>
          {!!genres.data?.length && (
            <label>Жанр
              <select value={f.genreId} onChange={set('genreId')}>
                <option value="">— без жанру —</option>
                {genres.data.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          )}
          <div className="cover-pick">
            {preview ? <img className="cover-preview" src={preview} alt="" /> : <div className="cover-preview empty-cover">IMG</div>}
            <label className="btn sm upload-btn">
              {file ? 'Змінити обкладинку' : 'Обрати обкладинку'}
              <input type="file" accept="image/*" onChange={pickFile} disabled={busy} />
            </label>
            {file && <button type="button" className="btn sm" onClick={() => setFile(null)} disabled={busy}>Прибрати</button>}
          </div>
          {err && <div className="err">{err}</div>}
          <button className="btn primary" disabled={busy}>{busy ? 'Збереження...' : 'Додати гру'}</button>
        </form>
      </div>
    </div>
  )
}

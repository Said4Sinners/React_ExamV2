import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './api'

// Завантаження даних зі станами loading / error. poll — інтервал тихого оновлення (мс), напр. для лобі.
export function useFetch(fn, deps = [], { poll = 0 } = {}) {
  const [state, setState] = useState({ data: null, loading: true, error: '' })
  const fnRef = useRef(fn)
  const seq = useRef(0)
  useEffect(() => { fnRef.current = fn })

  const load = useCallback(async (silent = false) => {
    const id = ++seq.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: '' }))
    try {
      const data = await fnRef.current()
      if (id === seq.current) setState({ data, loading: false, error: '' })
    } catch (e) {
      if (id !== seq.current) return
      const notFound = e.response?.status === 404
      if (silent && !notFound) return // тихе оновлення не ламає інтерфейс через разовий збій
      setState({ data: null, loading: false, error: notFound ? 'Не знайдено' : errorMessage(e, 'Не вдалося завантажити дані') })
    }
  }, [])

  useEffect(() => {
    load()
    return () => { seq.current++ }
  }, deps)

  useEffect(() => {
    if (!poll) return undefined
    const t = setInterval(() => { if (!document.hidden) load(true) }, poll)
    return () => clearInterval(t)
  }, [poll, load])

  return { ...state, reload: load }
}

// Закриття модалки клавішею Esc (клік повз вікно не закриває — щоб не втрачати введене)
export function useEscape(onClose) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

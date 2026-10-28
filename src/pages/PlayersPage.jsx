import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Avatar, CardsSkeleton, PageHead, Pagination, StateBox } from '../components/ui'
import { useFetch } from '../hooks'
import { getUsers } from '../services'

export default function PlayersPage() {
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') || ''
  const page = Number(sp.get('page')) || 1
  const [text, setText] = useState(q)

  // пошук за нікнеймом із затримкою, щоб не слати запит на кожну літеру
  useEffect(() => {
    const t = setTimeout(() => { if (text.trim() !== q) setSp(text.trim() ? { q: text.trim() } : {}, { replace: true }) }, 400)
    return () => clearTimeout(t)
  }, [text])

  const { data, loading, error, reload } = useFetch(() => getUsers({ search: q, page, pageSize: 12 }), [q, page])

  return (
    <section>
      <PageHead eyebrow="GAMECLUB COMMUNITY" title="Гравці" text="Знайди гравця за нікнеймом і відкрий його профіль.">
        <input className="search" placeholder="Пошук за нікнеймом..." value={text} onChange={(e) => setText(e.target.value)} />
      </PageHead>

      <StateBox loading={loading} error={error} onRetry={() => reload()} empty={!data?.items.length} emptyText="Гравців не знайдено." skeleton={<CardsSkeleton />}>
        <div className="players">
          {data?.items.map((u) => (
            <Link className="pcard" key={u.id} to={`/players/${u.id}`}>
              <Avatar name={u.name} url={u.avatarUrl} size={64} />
              <b>{u.name}</b>
              <small>Переглянути профіль</small>
            </Link>
          ))}
        </div>
        <Pagination page={page} totalPages={data?.totalPages ?? 1} onChange={(p) => setSp({ ...(q && { q }), ...(p > 1 && { page: String(p) }) })} />
      </StateBox>
    </section>
  )
}

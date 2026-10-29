'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import { MemberAdCard } from '@/components/classisex/MemberAdCard'
import { PublicAdCard } from '@/components/classisex/PublicAdCard'
import type { MemberAdDTO, PublicAdDTO } from '@/lib/classisex/dto'
import { loadMoreClassisex } from '@/lib/classisex/more-actions'
import type { Textos } from '@/lib/textos/areas'
import { TextoRico } from '@/components/TextoRico'

type AnyAd = MemberAdDTO | PublicAdDTO

/**
 * Ad grid with infinite scroll. The server renders the first page (?pagina=N still works); the
 * next pages are fetched by a server action when the sentinel comes within 600px of the viewport,
 * with a "Carregar mais" button as the fallback. The plain Pagination links live in <noscript>.
 */
export function InfiniteAds({
  textos: t,
  scope,
  initialItems,
  initialPage,
  totalPages,
  euSou,
  cidade,
  gridClassName,
  noscriptPagination,
}: {
  /** Texts of the ClassiSex area (from the server page) */
  textos: Textos<'classisex'>
  scope: 'publico' | 'membros'
  initialItems: AnyAd[]
  initialPage: number
  totalPages: number
  euSou?: number
  cidade?: string
  gridClassName: string
  noscriptPagination?: ReactNode
}) {
  const [items, setItems] = useState<AnyAd[]>(initialItems)
  const [page, setPage] = useState(initialPage)
  const [pages, setPages] = useState(totalPages)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const busy = useRef(false)
  const sentinel = useRef<HTMLDivElement>(null)
  const done = page >= pages

  const loadNext = useCallback(async () => {
    if (busy.current || page >= pages) return
    busy.current = true
    setLoading(true)
    setFailed(false)
    try {
      const r = await loadMoreClassisex(scope, { euSou, cidade, page: page + 1 })
      setItems((prev) => {
        const seen = new Set(prev.map((a) => a.id))
        return [...prev, ...(r.items as AnyAd[]).filter((a) => !seen.has(a.id))]
      })
      setPage(r.page)
      setPages(r.totalPages)
    } catch {
      setFailed(true)
    } finally {
      busy.current = false
      setLoading(false)
    }
  }, [scope, euSou, cidade, page, pages])

  useEffect(() => {
    const el = sentinel.current
    if (!el || done || failed) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadNext()
      },
      { rootMargin: '600px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [done, failed, loadNext, items.length])

  return (
    <>
      <div className={gridClassName}>
        {items.map((ad) =>
          'contato' in ad ? (
            <MemberAdCard key={ad.id} ad={ad as MemberAdDTO} textos={t} />
          ) : (
            <PublicAdCard key={ad.id} ad={ad as PublicAdDTO} textos={t} />
          ),
        )}
      </div>
      {noscriptPagination ? <noscript>{noscriptPagination}</noscript> : null}
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      <div className="mt-8 flex flex-col items-center gap-3" data-infinite-status>
        {loading && (
          <p role="status" className="type-label text-muted">
            <TextoRico valor={t.carregando} linha />
          </p>
        )}
        {failed && (
          <p role="alert" className="type-label text-muted">
            Não foi possível carregar mais anúncios agora (falha de conexão ou instabilidade do servidor). Toque em &ldquo;Carregar mais&rdquo; para tentar de novo.
          </p>
        )}
        {!done && !loading && (
          <button type="button" className="btn-secondary" onClick={() => void loadNext()}>
            <TextoRico valor={t.carregarMais} linha />
          </button>
        )}
        {done && pages > 1 && <p className="type-label text-muted"><TextoRico valor={t.fimDaLista} linha /></p>}
      </div>
    </>
  )
}

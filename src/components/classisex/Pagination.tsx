import Link from 'next/link'

import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

/** Previous/next links that keep the current filters (D-07). */
export async function Pagination({
  basePath,
  page,
  totalPages,
  params,
}: {
  basePath: string
  page: number
  totalPages: number
  params: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null
  const t = await getTextos('geral')
  const href = (p: number) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) if (v) q.set(k, v)
    if (p > 1) q.set('pagina', String(p))
    const s = q.toString()
    return s ? `${basePath}?${s}` : basePath
  }
  return (
    <nav aria-label="Paginação" className="mt-8 flex flex-wrap items-center gap-4">
      {page > 1 && (
        <Link href={href(page - 1)} className="btn-secondary">
          {t.paginacaoAnteriores}
        </Link>
      )}
      <p className="type-label text-muted">
        {preencher(t.paginacaoPagina, { pagina: Math.min(page, totalPages), total: totalPages })}
      </p>
      {page < totalPages && (
        <Link href={href(page + 1)} className="btn-secondary">
          {t.paginacaoProximos}
        </Link>
      )}
    </nav>
  )
}

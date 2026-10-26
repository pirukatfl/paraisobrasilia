import type { Metadata } from 'next'
import Link from 'next/link'

import { Pagination } from '@/components/classisex/Pagination'
import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { ContoCard } from '@/components/contos/ContoCard'
import { EmptyState } from '@/components/EmptyState'
import { getPublicContos } from '@/lib/contos/public'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'

// Per request (query string, no database at build); data from the tagged cache 'contos'.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('contos')
  return buildPageMetadata({ title: t.googleLista, description: t.googleListaDescricao, path: '/contos' })
}

/** Open list of contos (PREV-03). Public read model only: open blocks, never the full text (T-05-01). */
export default async function ContosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const raw = (await searchParams).pagina
  const page = Math.max(1, Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '1') : (raw ?? '1'), 10) || 1)
  const result = await getPublicContos(page)
  const t = await getTextos('contos')
  return (
    <section aria-labelledby="titulo-contos">
      <p className="type-eyebrow text-muted">{t.listaEyebrow}</p>
      <h1 id="titulo-contos" className="type-display mt-2">
        {t.listaTitulo}
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        {t.listaIntro}
      </p>
      <p className="mt-4">
        <Link href="/area-do-assinante/contos" className="type-label font-semibold text-accent underline underline-offset-4">
          {t.listaLinkAssinante}
        </Link>
      </p>
      <p className="mt-2">
        <Link href="/contos/enviar" className="type-label font-semibold text-accent underline underline-offset-4">
          {t.listaLinkEnviar}
        </Link>
      </p>
      {result.items.length === 0 ? (
        <EmptyState
          heading={t.listaVazioTitulo}
          body={t.listaVazioTexto}
          actions={[{ href: '/assine-ja', label: t.listaVazioBotao, variant: 'primary' }]}
        />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((c) => (
            <ContoCard key={c.slug} conto={c} href={`/contos/${c.slug}`} />
          ))}
        </div>
      )}
      <Pagination basePath="/contos" page={result.page} totalPages={result.totalPages} params={{}} />
      <AssineJaCta
        title={t.listaCtaTitulo}
        text={t.listaCtaTexto}
        membersHref="/area-do-assinante/contos"
      />
    </section>
  )
}

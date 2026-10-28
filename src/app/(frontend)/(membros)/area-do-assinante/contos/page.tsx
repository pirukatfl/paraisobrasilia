import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { ContoCard } from '@/components/contos/ContoCard'
import { EmptyState } from '@/components/EmptyState'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { listMemberContos } from '@/lib/contos/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('contos')
  return { title: textoPuro(t.membrosGoogleLista), robots: { index: false, follow: false } }
}

const PATH = '/area-do-assinante/contos'

/** Members list of contos (PREV-03): every published conto, full text one click away. */
export default async function MembrosContosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const t = await getTextos('contos')
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted"><TextoRico valor={t.membrosEyebrow} linha /></p>
      <h1 id="titulo-contos" className="type-display mt-2">
        <TextoRico valor={t.membrosTitulo} linha />
      </h1>
    </>
  )
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-contos">
        {header}
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const raw = (await searchParams).pagina
  const page = Math.max(1, Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '1') : (raw ?? '1'), 10) || 1)
  const result = await listMemberContos(page)
  return (
    <section aria-labelledby="titulo-contos">
      {header}
      <p className="mt-4 max-w-[680px] text-body text-muted"><TextoRico valor={t.membrosIntro} linha /></p>
      {result.items.length === 0 ? (
        <EmptyState heading={<TextoRico valor={t.membrosVazioTitulo} linha />} body={t.membrosVazioTexto} actions={[]} />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((c) => (
            <ContoCard key={c.slug} conto={c} href={`${PATH}/${c.slug}`} />
          ))}
        </div>
      )}
      <Pagination basePath={PATH} page={result.page} totalPages={result.totalPages} params={{}} />
    </section>
  )
}

import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { DicaCard } from '@/components/dicas/DicaCard'
import { EmptyState } from '@/components/EmptyState'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { listMemberDicas } from '@/lib/dicas/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('dicasHot')
  return { title: textoPuro(t.membrosGoogleLista), robots: { index: false, follow: false } }
}

const PATH = '/area-do-assinante/dicas-hot'

/** Members list of Dicas Hot (PREV-03): every published dica, full text one click away. */
export default async function MembrosDicasHotPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const t = await getTextos('dicasHot')
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted"><TextoRico valor={t.membrosEyebrow} linha /></p>
      <h1 id="titulo-dicas" className="type-display mt-2">
        <TextoRico valor={t.membrosTitulo} linha />
      </h1>
    </>
  )
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-dicas">
        {header}
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const raw = (await searchParams).pagina
  const page = Math.max(1, Number.parseInt(Array.isArray(raw) ? (raw[0] ?? '1') : (raw ?? '1'), 10) || 1)
  const result = await listMemberDicas(page)
  return (
    <section aria-labelledby="titulo-dicas">
      {header}
      <p className="mt-4 max-w-[680px] text-body text-muted"><TextoRico valor={t.membrosIntro} linha /></p>
      {result.items.length === 0 ? (
        <EmptyState heading={<TextoRico valor={t.membrosVazioTitulo} linha />} body={t.membrosVazioTexto} actions={[]} />
      ) : (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {result.items.map((c) => (
            <DicaCard key={c.slug} dica={c} href={`${PATH}/${c.slug}`} showImage />
          ))}
        </div>
      )}
      <Pagination basePath={PATH} page={result.page} totalPages={result.totalPages} params={{}} />
    </section>
  )
}

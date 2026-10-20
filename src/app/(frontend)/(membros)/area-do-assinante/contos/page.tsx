import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { ContoCard } from '@/components/contos/ContoCard'
import { EmptyState } from '@/components/EmptyState'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { listMemberContos } from '@/lib/contos/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Contos',
  robots: { index: false, follow: false },
}

const PATH = '/area-do-assinante/contos'

/** Members list of contos (PREV-03): every published conto, full text one click away. */
export default async function MembrosContosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-contos" className="type-display mt-2">
        Contos
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
      <p className="mt-4 max-w-[680px] text-body text-muted">Todos os contos, do começo ao fim.</p>
      {result.items.length === 0 ? (
        <EmptyState heading="Nenhum conto publicado ainda." body="Volte em breve: a equipe publica contos novos." actions={[]} />
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

import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { DicaCard } from '@/components/dicas/DicaCard'
import { EmptyState } from '@/components/EmptyState'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { listMemberDicas } from '@/lib/dicas/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dicas Hot',
  robots: { index: false, follow: false },
}

const PATH = '/area-do-assinante/dicas-hot'

/** Members list of Dicas Hot (PREV-03): every published dica, full text one click away. */
export default async function MembrosDicasHotPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-dicas" className="type-display mt-2">
        Dicas Hot
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
      <p className="mt-4 max-w-[680px] text-body text-muted">Todas as dicas, do começo ao fim.</p>
      {result.items.length === 0 ? (
        <EmptyState heading="Nenhuma dica publicada ainda." body="Volte em breve: a equipe publica dicas novas." actions={[]} />
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

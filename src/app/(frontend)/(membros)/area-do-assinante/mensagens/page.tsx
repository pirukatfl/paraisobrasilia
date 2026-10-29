import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { InboxList } from '@/components/mensagens/InboxList'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { getInbox } from '@/lib/mensagens/queries'
import { parsePage } from '@/lib/mensagens/rules'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('mensagens')
  return { title: textoPuro(t.googleLista), robots: { index: false, follow: false } }
}

const PATH = '/area-do-assinante/mensagens'

/** Inbox (REC-02). Needs active access: an expired subscriber sees only the inactive panel (T-05-06). */
export default async function MensagensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const t = await getTextos('mensagens')
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted"><TextoRico valor={t.eyebrow} linha /></p>
      <h1 id="titulo-mensagens" className="type-display mt-2">
        <TextoRico valor={t.titulo} linha />
      </h1>
      <p className="mt-2 max-w-[560px] text-body text-muted"><TextoRico valor={t.intro} linha /></p>
    </>
  )
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-mensagens">
        {header}
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const page = parsePage((await searchParams).pagina)
  const inbox = await getInbox(check.assinante.id, page)
  return (
    <section aria-labelledby="titulo-mensagens">
      {header}
      {inbox.items.length === 0 ? (
        <EmptyState
          heading={<TextoRico valor={t.vazioTitulo} linha />}
          body={t.vazioTexto}
          actions={[
            { href: '/area-do-assinante/classisex', label: <TextoRico valor={t.vazioBotao} linha />, variant: 'secondary' },
          ]}
        />
      ) : (
        <InboxList items={inbox.items} />
      )}
      <Pagination basePath={PATH} page={inbox.page} totalPages={inbox.totalPages} params={{}} />
    </section>
  )
}

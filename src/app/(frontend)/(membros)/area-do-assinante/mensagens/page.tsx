import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { InboxList } from '@/components/mensagens/InboxList'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { parseRecadoPage } from '@/lib/recados/board'
import { getInbox } from '@/lib/mensagens/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Recados',
  robots: { index: false, follow: false },
}

const PATH = '/area-do-assinante/mensagens'

/** Inbox (REC-02). Needs active access: an expired subscriber sees only the inactive panel (T-05-06). */
export default async function MensagensPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-mensagens" className="type-display mt-2">
        Recados
      </h1>
      <p className="mt-2 max-w-[560px] text-body text-muted">Só você e a outra pessoa veem cada conversa.</p>
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
  const page = parseRecadoPage((await searchParams).pagina)
  const inbox = await getInbox(check.assinante.id, page)
  return (
    <section aria-labelledby="titulo-mensagens">
      {header}
      {inbox.items.length === 0 ? (
        <EmptyState
          heading="Nenhum recado ainda."
          body="Para mandar um recado, abra um anúncio do ClassiSex e toque em Enviar recado. Aqui aparecem só os recados que você mandou ou recebeu."
          actions={[
            { href: '/area-do-assinante/classisex', label: 'Ver ClassiSex', variant: 'secondary' },
          ]}
        />
      ) : (
        <InboxList items={inbox.items} />
      )}
      <Pagination basePath={PATH} page={inbox.page} totalPages={inbox.totalPages} params={{}} />
    </section>
  )
}

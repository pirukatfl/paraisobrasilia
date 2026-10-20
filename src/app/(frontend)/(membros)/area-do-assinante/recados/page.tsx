import type { Metadata } from 'next'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { Pagination } from '@/components/classisex/Pagination'
import { EmptyState } from '@/components/EmptyState'
import { OwnRecadoCard } from '@/components/recados/OwnRecadoCard'
import { RecadoCard } from '@/components/recados/RecadoCard'
import { RecadoForm } from '@/components/recados/RecadoForm'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { parseRecadoPage } from '@/lib/recados/board'
import { publicarRecado } from '@/lib/recados/actions'
import { getOwnRecados, listBoard } from '@/lib/recados/queries'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Recados',
  robots: { index: false, follow: false },
}

const PATH = '/area-do-assinante/recados'

const OK: Record<string, string> = {
  enviado: 'Recado enviado. Ele aparece no mural depois que a equipe aprovar.',
  apagado: 'Recado apagado.',
}

/**
 * Members board of recados (REC-01, D-01). Own recados are listed with only a login (LGPD: an
 * expired subscriber can still delete them); the form and the board need active access.
 */
export default async function RecadosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const check = await requireActiveSubscription(PATH)
  const params = await searchParams
  const ok = typeof params.ok === 'string' ? OK[params.ok] : undefined
  const own = await getOwnRecados(check.assinante.id)
  const ownSection = own.length > 0 && (
    <section aria-labelledby="titulo-seus-recados" className="mt-10">
      <h2 id="titulo-seus-recados" className="type-heading">
        Seus recados
      </h2>
      <div className="mt-4 flex max-w-[720px] flex-col gap-4">
        {own.map((r) => (
          <OwnRecadoCard key={r.id} recado={r} />
        ))}
      </div>
    </section>
  )
  const header = (
    <>
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      {ok && (
        <p role="status" className="mb-8 rounded-lg border border-line bg-surface px-4 py-2 text-body">
          {ok}
        </p>
      )}
      {params.erro === 'nao-encontrado' && (
        <p role="alert" className="mb-8 rounded-lg border border-danger px-4 py-2 text-body">
          Recado não encontrado.
        </p>
      )}
      <p className="type-eyebrow text-muted">Área do assinante</p>
      <h1 id="titulo-recados" className="type-display mt-2">
        Recados
      </h1>
    </>
  )

  // No board and no form without active access (T-05-02); own recados stay deletable
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-recados">
        {header}
        <InactivePanel access={check.access} />
        {ownSection}
      </section>
    )
  }

  const page = parseRecadoPage(params.pagina)
  const board = await listBoard(page, check.assinante.id)
  return (
    <section aria-labelledby="titulo-recados">
      {header}
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Deixe um recado para os outros assinantes. Para trocar contato, use Enviar mensagem. Você pode ter até 3
        recados ativos; todo recado novo passa pela equipe antes de aparecer.
      </p>
      <section aria-labelledby="titulo-novo-recado" className="mt-8">
        <h2 id="titulo-novo-recado" className="type-heading">
          Novo recado
        </h2>
        <RecadoForm action={publicarRecado} initial={{ apelido: check.assinante.apelido ?? '', texto: '' }} />
      </section>
      {ownSection}
      <section aria-labelledby="titulo-mural" className="mt-10">
        <h2 id="titulo-mural" className="type-heading">
          Mural de recados
        </h2>
        {board.items.length === 0 ? (
          <EmptyState
            heading="Ainda não há recados no mural."
            body="O seu aparece aqui depois que a equipe aprovar."
            actions={[]}
          />
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {board.items.map((r) => (
              <RecadoCard key={r.id} recado={r} />
            ))}
          </div>
        )}
        <Pagination basePath={PATH} page={board.page} totalPages={board.totalPages} params={{}} />
      </section>
    </section>
  )
}

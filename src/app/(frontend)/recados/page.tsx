import type { Metadata } from 'next'

import { AssineJaCta } from '@/components/contos/AssineJaCta'
import { EmptyState } from '@/components/EmptyState'
import { getPublicRecadosTeaser } from '@/lib/recados/public'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache 'recados'.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = buildPageMetadata({
  title: 'Recados',
  description: 'Recados dos assinantes do Paraíso Brasília. Assine para ler e responder.',
  path: '/recados',
})

/**
 * Open preview of the recados (PREV-02, D-05). Teaser read model only: short snippets without
 * apelido, contact, id or exact date (T-05-03, T-05-19).
 */
export default async function RecadosPublicPage() {
  const { semana, trechos } = await getPublicRecadosTeaser()
  const semanaLabel =
    semana === 0 ? 'Novos recados toda semana.' : semana === 1 ? '1 recado novo esta semana' : `${semana} recados novos esta semana`
  return (
    <section aria-labelledby="titulo-recados">
      <p className="type-eyebrow text-muted">Mural</p>
      <h1 id="titulo-recados" className="type-display mt-2">
        Recados
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        Os assinantes deixam recados uns para os outros. Aqui você vê só um pedaço; o recado inteiro, o apelido e a
        conversa por mensagem privada ficam na área do assinante.
      </p>
      <p className="mt-4 type-heading">{semanaLabel}</p>
      {trechos.length === 0 ? (
        <EmptyState
          heading="Ainda não há recados publicados."
          body="Assinantes publicam recados e conversam por mensagem privada. Assine para participar."
          actions={[{ href: '/assine-ja', label: 'Assine Já', variant: 'primary' }]}
        />
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {trechos.map((t) => (
            <figure key={t.key} className="rounded-xl border border-line bg-surface p-5">
              <figcaption className="type-eyebrow text-muted">Recado de assinante · {t.quando}</figcaption>
              <blockquote className="mt-2 text-body">{t.texto}</blockquote>
            </figure>
          ))}
        </div>
      )}
      <AssineJaCta
        title="Leia os recados completos e responda"
        text="Assinantes veem o apelido, o recado inteiro e conversam por mensagem privada."
        membersHref="/area-do-assinante/recados"
      />
    </section>
  )
}

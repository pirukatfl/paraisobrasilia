import { RichText } from '@payloadcms/richtext-lexical/react'

import type { PartyDetailDTO } from '@/lib/parties/types'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

function Section({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="type-heading">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  )
}

/** Party sections from D-05; each hidden when empty. Rich text is rendered by React (escaped, T-01-18). */
export async function PartyDetails({ party }: { party: PartyDetailDTO }) {
  const t = await getTextos('festas')
  const kindLabel = { dj: t.atracaoDj, show: t.atracaoShow, modelo: t.atracaoModelo, outro: t.atracaoOutro }
  return (
    <>
      {party.prices.length > 0 && (
        <Section id="secao-valores" title={<TextoRico valor={t.tituloValores} linha />}>
          <ul aria-labelledby="secao-valores" className="divide-y divide-line rounded-lg border border-line bg-surface">
            {party.prices.map((row, i) => (
              <li key={`${row.label}-${i}`} className="flex items-center justify-between gap-2 px-4 py-4">
                <span className="type-label">{row.label}</span>
                <span className="type-label text-gold tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {party.dressCode && (
        <Section id="secao-dress-code" title={<TextoRico valor={t.tituloDressCode} linha />}>
          <p className="text-body">{party.dressCode}</p>
        </Section>
      )}

      {party.attractions.length > 0 && (
        <Section id="secao-atracoes" title={<TextoRico valor={t.tituloAtracoes} linha />}>
          <ul aria-labelledby="secao-atracoes" className="flex flex-col gap-2">
            {party.attractions.map((a, i) => (
              <li key={`${a.kind}-${a.name}-${i}`} className="text-body">
                <span className="type-label text-muted"><TextoRico valor={kindLabel[a.kind]} linha /></span>
                <span aria-hidden="true" className="text-muted">
                  {' · '}
                </span>
                {a.name}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {party.details && (
        <Section id="secao-sobre" title={<TextoRico valor={t.tituloSobre} linha />}>
          <RichText
            data={party.details}
            disableContainer
            className="text-body [&_a]:text-accent [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_p+p]:mt-4 [&_ul]:list-disc [&_ul]:pl-6"
          />
        </Section>
      )}
    </>
  )
}

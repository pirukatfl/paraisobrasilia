import Link from 'next/link'

import { TIER_COMPARISON } from '@/lib/assinantes/tier'

/**
 * Grátis × Assinante comparison (G-06): shown on /cadastro, Meus anúncios, Novo anúncio, /assine-ja
 * and the "Disponível para assinantes" panels. Server component, accessible table, readable at 360 px.
 */
export function PlanComparison({
  headingLevel = 2,
  signupLink = false,
  assineLink = true,
  id = 'comparativo',
}: {
  headingLevel?: 2 | 3
  /** Adds "Criar conta grátis" → /cadastro (for visitors without an account) */
  signupLink?: boolean
  /** The primary "Assine Já" button (hide it on /assine-ja itself) */
  assineLink?: boolean
  id?: string
}) {
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  return (
    <section aria-labelledby={`${id}-titulo`} className="mt-10 max-w-[680px]" data-testid="comparativo-planos">
      <Heading id={`${id}-titulo`} className="type-heading">
        Grátis × Assinante
      </Heading>
      <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-surface">
        <table className="w-full border-collapse text-left text-body">
          <caption className="sr-only">O que cada tipo de conta pode fazer no ClassiSex</caption>
          <thead>
            <tr className="border-b border-line">
              <th scope="col" className="type-label px-3 py-3 text-muted sm:px-4">
                O que você pode fazer
              </th>
              <th scope="col" className="type-label px-3 py-3 text-text sm:px-4">
                Grátis
              </th>
              <th scope="col" className="type-label px-3 py-3 text-accent sm:px-4">
                Assinante
              </th>
            </tr>
          </thead>
          <tbody>
            {TIER_COMPARISON.map((row) => (
              <tr key={row.item} className="border-b border-line last:border-b-0">
                <th scope="row" className="px-3 py-3 align-top font-normal text-text sm:px-4">
                  {row.item}
                </th>
                <td className="px-3 py-3 align-top text-muted sm:px-4">{row.gratis}</td>
                <td className="px-3 py-3 align-top font-semibold text-text sm:px-4">{row.assinante}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(assineLink || signupLink) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {assineLink && (
            <Link href="/assine-ja" className="btn-primary">
              Assine Já
            </Link>
          )}
          {signupLink && (
            <Link href="/cadastro" className="btn-secondary">
              Criar conta grátis
            </Link>
          )}
        </div>
      )}
    </section>
  )
}

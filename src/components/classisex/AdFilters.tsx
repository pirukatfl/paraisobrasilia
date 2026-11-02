import Link from 'next/link'

import { FAIXAS_IDADE } from '@/lib/classisex/idade'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'
import { textoPuro } from '@/lib/textos/rico'

const FAIXA_TEXTO = {
  '18-29': 'filtroIdade18a29',
  '30-39': 'filtroIdade30a39',
  '40-49': 'filtroIdade40a49',
  '50-mais': 'filtroIdade50mais',
} as const

/** Plain GET form (no client JS): Eu sou (+ cidade for members) (D-07). */
export async function AdFilters({
  action,
  categories,
  euSou,
  cidade,
  idade,
  showCidade = true,
  showIdade = false,
}: {
  action: string
  categories: { id: number; name: string }[]
  euSou?: number
  cidade?: string
  /** Selected age range key (members area only). */
  idade?: string
  /** The open area filters by tipo only: the city is never shown there. */
  showCidade?: boolean
  /** Members area only: the open area never filters by age. */
  showIdade?: boolean
}) {
  const t = await getTextos('classisex')
  return (
    <form method="get" action={action} role="search" aria-label="Filtrar anúncios" className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-2">
        <label htmlFor="filtro-eu-sou" className="type-label text-text">
          <TextoRico valor={t.filtroEuSou} linha />
        </label>
        <select
          id="filtro-eu-sou"
          name="eu-sou"
          defaultValue={euSou ? String(euSou) : ''}
          className={`min-h-11 rounded-lg border bg-surface px-4 text-body text-text transition-colors duration-[var(--duration-fast)] focus:border-accent ${euSou ? 'border-accent' : 'border-line'}`}
        >
          <option value=""><TextoRico valor={t.filtroTodos} linha /></option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      {showCidade && (
      <div className="flex flex-col gap-2">
        <label htmlFor="filtro-cidade" className="type-label text-text">
          <TextoRico valor={t.filtroCidade} linha />
        </label>
        <input
          id="filtro-cidade"
          name="cidade"
          type="text"
          maxLength={60}
          defaultValue={cidade ?? ''}
          className={`min-h-11 rounded-lg border bg-surface px-4 text-body text-text transition-colors duration-[var(--duration-fast)] focus:border-accent ${cidade ? 'border-accent' : 'border-line'}`}
        />
      </div>
      )}
      {showIdade && (
        <div className="flex flex-col gap-2">
          <label htmlFor="filtro-idade" className="type-label text-text">
            <TextoRico valor={t.filtroIdade} linha />
          </label>
          <select
            id="filtro-idade"
            name="idade"
            defaultValue={idade ?? ''}
            className={`min-h-11 rounded-lg border bg-surface px-4 text-body text-text transition-colors duration-[var(--duration-fast)] focus:border-accent ${idade ? 'border-accent' : 'border-line'}`}
          >
            <option value="">{textoPuro(t.filtroIdadeTodas)}</option>
            {FAIXAS_IDADE.map((f) => (
              <option key={f.key} value={f.key}>
                {textoPuro(t[FAIXA_TEXTO[f.key]])}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary press">
          <TextoRico valor={t.filtroBotao} linha />
        </button>
        <Link href={action} className="type-label text-muted underline underline-offset-4 transition-colors duration-[var(--duration-fast)] hover:text-accent focus-visible:text-accent">
          <TextoRico valor={t.filtroLimpar} linha />
        </Link>
      </div>
    </form>
  )
}

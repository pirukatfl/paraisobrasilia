import Link from 'next/link'

/** Plain GET form (no client JS): Eu sou + cidade (D-07). */
export function AdFilters({
  action,
  categories,
  euSou,
  cidade,
}: {
  action: string
  categories: { id: number; name: string }[]
  euSou?: number
  cidade?: string
}) {
  return (
    <form method="get" action={action} role="search" aria-label="Filtrar anúncios" className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end">
      <div className="flex flex-col gap-2">
        <label htmlFor="filtro-eu-sou" className="type-label text-text">
          Eu sou
        </label>
        <select
          id="filtro-eu-sou"
          name="eu-sou"
          defaultValue={euSou ? String(euSou) : ''}
          className="min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent"
        >
          <option value="">Todos</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label htmlFor="filtro-cidade" className="type-label text-text">
          Cidade
        </label>
        <input
          id="filtro-cidade"
          name="cidade"
          type="text"
          maxLength={60}
          defaultValue={cidade ?? ''}
          className="min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent"
        />
      </div>
      <div className="flex items-center gap-4">
        <button type="submit" className="btn-primary">
          Filtrar
        </button>
        <Link href={action} className="type-label text-muted underline underline-offset-4 hover:text-accent">
          Limpar filtros
        </Link>
      </div>
    </form>
  )
}

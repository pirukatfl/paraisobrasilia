import { PartyGrid } from '@/components/PartyGrid'
import { getUpcomingParties } from '@/lib/parties/queries'

// Rendered per request, never at build time: the Docker/CI build has no database.
// The data itself stays in the Next data cache (unstable_cache, tag 'parties', 600 s),
// so publish/edit/unpublish expire it instantly and ended parties drop off by time (FEST-04).
export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const parties = await getUpcomingParties(new Date())

  return (
    <section aria-labelledby="titulo-proximas-festas">
      <p className="type-eyebrow text-muted">Casa de festas liberais em Brasília</p>
      <h1 id="titulo-proximas-festas" className="type-display mt-2">
        Próximas festas
      </h1>

      {parties.length > 0 ? (
        <PartyGrid parties={parties} />
      ) : (
        <div className="mt-12 max-w-[480px]">
          <h2 className="type-heading">Nenhuma festa agendada no momento</h2>
          <p className="mt-4 text-body text-muted">
            A próxima programação será publicada aqui em breve. Volte nos próximos dias.
          </p>
        </div>
      )}
    </section>
  )
}

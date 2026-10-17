import { PartyGrid } from '@/components/PartyGrid'
import { getUpcomingParties } from '@/lib/parties/queries'

// Time-based ISR: ended parties drop off within 10 minutes without anyone acting (FEST-04).
export const revalidate = 600

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

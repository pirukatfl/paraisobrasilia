import { AboutTeaser } from '@/components/home/AboutTeaser'
import { DicasTeaser } from '@/components/home/DicasTeaser'
import { DirectionsTeaser } from '@/components/home/DirectionsTeaser'
import { SpaceTeaser } from '@/components/home/SpaceTeaser'
import { PartyGrid } from '@/components/PartyGrid'
import { getLatestDicas } from '@/lib/dicas/public'
import { getSpacePhotos } from '@/lib/gallery/queries'
import { getPageIntro } from '@/lib/pages/queries'
import { getUpcomingParties } from '@/lib/parties/queries'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'

// Rendered per request, never at build time: the Docker/CI build has no database.
// The data itself stays in the Next data cache (unstable_cache, tags 'parties', 'space',
// 'page:quem-somos', 'contact'), so staff changes show at once and ended parties drop off by time.
export const dynamic = 'force-dynamic'

/** Optional home sections fail soft: an error hides only that section (T-02-15). */
async function optional<T>(load: () => Promise<T>): Promise<T | null> {
  try {
    return await load()
  } catch {
    return null
  }
}

export default async function HomePage() {
  const [parties, photos, intro, contact, dicas, t] = await Promise.all([
    getUpcomingParties(new Date()), // errors here keep the Phase 1 error screen
    optional(() => getSpacePhotos(6)),
    optional(() => getPageIntro('quem-somos')),
    optional(() => getContact()),
    optional(() => getLatestDicas(3)),
    getTextos('inicio'),
  ])
  const hasParties = parties.length > 0

  return (
    <>
      {hasParties ? (
        <section aria-labelledby="titulo-proximas-festas">
          <p className="type-eyebrow text-muted">{t.chamadaTopo}</p>
          <h1 id="titulo-proximas-festas" className="type-display mt-2">
            {t.tituloProximasFestas}
          </h1>
          <PartyGrid parties={parties} />
        </section>
      ) : (
        <>
          <p className="type-eyebrow text-muted">{t.chamadaTopo}</p>
          <h1 className="type-display mt-2">{t.tituloSemFestas}</h1>
          <section aria-labelledby="titulo-proximas-festas" className="mt-8 max-w-[480px]">
            <h2 id="titulo-proximas-festas" className="type-heading">
              {t.tituloProximasFestas}
            </h2>
            <p className="type-label mt-4 text-text">{t.semFestasTitulo}</p>
            <p className="mt-2 text-body text-muted">{t.semFestasTexto}</p>
          </section>
        </>
      )}

      <SpaceTeaser photos={photos ?? []} />
      <AboutTeaser intro={intro} />
      <DicasTeaser dicas={dicas ?? []} />
      {contact && contact.addressLine && <DirectionsTeaser contact={contact} />}
    </>
  )
}

import { ClassiContosDicas } from '@/components/home/ClassiContosDicas'
import { DirectionsTeaser } from '@/components/home/DirectionsTeaser'
import { GaleriaTeaser } from '@/components/home/GaleriaTeaser'
import { PromocaoHome } from '@/components/home/PromocaoHome'
import { SpaceTeaser } from '@/components/home/SpaceTeaser'
import { PartyGrid } from '@/components/PartyGrid'
import { getLatestPublicAd } from '@/lib/classisex/public'
import { getLatestContos } from '@/lib/contos/public'
import { getLatestDicas } from '@/lib/dicas/public'
import { getPublishedModels, getSpaceItems } from '@/lib/gallery/queries'
import { getUpcomingParties } from '@/lib/parties/queries'
import { estaOculto } from '@/lib/site/menu'
import { getMenuConfig } from '@/lib/site/menu-queries'
import { getContact } from '@/lib/site/queries'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

// Rendered per request, never at build time: the Docker/CI build has no database.
// The data itself stays in the Next data cache (unstable_cache, tags 'parties', 'space',
// 'models', 'contact'), so staff changes show at once and ended parties drop off by time.
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
  const [parties, spaceItems, models, contact, dicas, contos, anuncio, menu, t] = await Promise.all([
    getUpcomingParties(new Date()), // errors here keep the Phase 1 error screen
    optional(() => getSpaceItems()), // all items: the lightbox walks them, only 4 tiles are rendered
    optional(() => getPublishedModels()),
    optional(() => getContact()),
    optional(() => getLatestDicas(3)),
    optional(() => getLatestContos(3)),
    optional(() => getLatestPublicAd()),
    getMenuConfig(), // never throws
    getTextos('inicio'),
  ])
  const hasParties = parties.length > 0

  return (
    <>
      {hasParties ? (
        <section aria-labelledby="titulo-proximas-festas">
          <p className="type-eyebrow text-muted"><TextoRico valor={t.chamadaTopo} linha /></p>
          <h1 id="titulo-proximas-festas" className="type-display mt-2">
            <TextoRico valor={t.tituloProximasFestas} linha />
          </h1>
          <PartyGrid parties={parties} />
        </section>
      ) : (
        <>
          <p className="type-eyebrow text-muted"><TextoRico valor={t.chamadaTopo} linha /></p>
          <h1 className="type-display mt-2"><TextoRico valor={t.tituloSemFestas} linha /></h1>
          <section aria-labelledby="titulo-proximas-festas" className="mt-8 max-w-[480px]">
            <h2 id="titulo-proximas-festas" className="type-heading">
              <TextoRico valor={t.tituloProximasFestas} linha />
            </h2>
            <p className="type-label mt-4 text-text"><TextoRico valor={t.semFestasTitulo} linha /></p>
            <p className="mt-2 text-body text-muted"><TextoRico valor={t.semFestasTexto} linha /></p>
          </section>
        </>
      )}

      <ClassiContosDicas contos={contos ?? []} dicas={dicas ?? []} anuncio={anuncio} ocultos={menu.ocultos} />
      <SpaceTeaser items={spaceItems ?? []} abaixoDaDobra={hasParties} />
      {!estaOculto('galeria', menu.ocultos) && <GaleriaTeaser models={models ?? []} />}
      <PromocaoHome ocultos={menu.ocultos} />
      {contact && contact.addressLine && <DirectionsTeaser contact={contact} />}
    </>
  )
}

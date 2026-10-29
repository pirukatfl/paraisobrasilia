import { ExternalLink } from '@/components/ExternalLink'
import { osmEmbedUrl, osmLargeMapUrl } from '@/lib/site/contact'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** OpenStreetMap embed (no key, no Google cookies — D-02); nothing when coordinates are missing. */
export async function MapEmbed({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (lat === null || lng === null) return null
  const t = await getTextos('contato')
  return (
    <figure>
      <iframe
        title="Mapa com a localização do Paraíso Brasília"
        src={osmEmbedUrl(lat, lng)}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="aspect-[4/3] w-full rounded-xl border border-line bg-surface lg:aspect-[16/10]"
      />
      <figcaption className="mt-2">
        <ExternalLink
          href={osmLargeMapUrl(lat, lng)}
          className="type-label inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-text hover:underline"
        >
          <TextoRico valor={t.mapaAmpliado} linha />
        </ExternalLink>
      </figcaption>
    </figure>
  )
}

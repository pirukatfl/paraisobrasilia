import { ExternalLink } from '@/components/ExternalLink'
import { googleMapsEmbedUrl, googleMapsLargeUrl } from '@/lib/site/contact'
import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** Google Maps embed (no API key); nothing when coordinates are missing. */
export async function MapEmbed({ lat, lng }: { lat: number | null; lng: number | null }) {
  if (lat === null || lng === null) return null
  const t = await getTextos('contato')
  return (
    <figure>
      <iframe
        title="Mapa com a localização do Paraíso Brasília"
        src={googleMapsEmbedUrl(lat, lng)}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer"
        className="aspect-[4/3] w-full rounded-xl border border-line bg-surface lg:aspect-[16/10]"
      />
      <figcaption className="mt-2">
        <ExternalLink
          href={googleMapsLargeUrl(lat, lng)}
          className="type-label inline-flex min-h-11 items-center text-muted underline-offset-4 hover:text-text hover:underline"
        >
          <TextoRico valor={t.mapaAmpliado} linha />
        </ExternalLink>
      </figcaption>
    </figure>
  )
}

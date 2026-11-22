import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { Readable } from 'stream'

import { accessStatusFor } from '@/lib/assinantes/status'
import { tierOf } from '@/lib/assinantes/tier'
import { relId, type AdMediaDocLike } from '@/lib/classisex/dto'
import { canServeAdPhoto } from '@/lib/classisex/galeria-cards'
import { privateMediaDir } from '@/lib/classisex/storage'

export const dynamic = 'force-dynamic'

/**
 * Photo of an approved ClassiSex ad in Galeria → Amadoras: GET /amadoras/anuncio/foto/{id}/{miniatura|foto}
 * (client decision 2026-11-22). Open to everybody, but only while the ad is approved and the photo is among
 * those members can see (all for a paying author, the cover otherwise): checked in the database on EVERY request,
 * never from the cache. Videos are never served here. Anything else is a plain 404. The file name comes only from
 * the database (path.basename). Not passed to the image optimizer.
 */
const HEADERS = {
  'X-Robots-Tag': 'noindex, noimageindex',
  'X-Content-Type-Options': 'nosniff',
}

const notFound = () =>
  Response.json({ error: 'Não encontrado.' }, { status: 404, headers: { ...HEADERS, 'Cache-Control': 'no-store' } })

type AdMediaDoc = AdMediaDocLike & {
  filename?: string | null
  sizes?: { card?: { filename?: string | null; width?: number | null; height?: number | null } | null } | null
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; variante: string }> }) {
  const { id, variante } = await params
  const mediaId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(mediaId) || mediaId <= 0) return notFound()
  if (variante !== 'miniatura' && variante !== 'foto') return notFound()

  const payload = await getPayload({ config })
  const media = (await payload.findByID({
    collection: 'ad-media',
    id: mediaId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as AdMediaDoc | null
  if (!media) return notFound()
  const adId = relId(media.ad)
  const ad = adId
    ? await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true, disableErrors: true })
    : null
  if (!adId || !ad) return notFound()

  const authorId = relId((ad as unknown as { author?: unknown }).author)
  // Author's tier recomputed per request: an expired author's extra photos stay hidden
  const authorTier = authorId ? tierOf(await accessStatusFor(payload, authorId, new Date())) : 'gratis'
  const { docs: photos } = await payload.find({
    collection: 'ad-media',
    where: { and: [{ ad: { equals: adId } }, { kind: { equals: 'foto' } }] },
    select: { kind: true, order: true },
    sort: ['order', 'id'],
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
  })
  const allowed = canServeAdPhoto({
    media: { id: media.id, kind: media.kind, ad: adId },
    ad: { id: adId, status: String(ad.status) },
    adMedia: photos as unknown as AdMediaDocLike[],
    authorTier,
  })
  if (!allowed) return notFound()

  const name = variante === 'miniatura' ? (media.sizes?.card?.filename ?? media.filename) : media.filename
  if (!name) return notFound()
  const filePath = path.join(privateMediaDir(), path.basename(name))
  let size: number
  try {
    size = (await fs.promises.stat(filePath)).size
  } catch (err) {
    console.error(`[amadoras-anuncio] arquivo ausente para ad-media ${mediaId} (${variante}): ${(err as Error).message}`)
    return notFound()
  }
  const stream = fs.createReadStream(filePath)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: {
      ...HEADERS,
      'Content-Type': 'image/webp',
      'Content-Length': String(size),
      'Content-Disposition': 'inline',
      // Short on purpose: a photo that leaves the public gallery leaves browsers and the CDN within minutes
      'Cache-Control': 'public, max-age=300',
    },
  })
}

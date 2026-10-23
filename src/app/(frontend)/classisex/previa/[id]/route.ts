import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { Readable } from 'stream'

import { coverOf } from '@/lib/assinantes/tier'
import { relId } from '@/lib/classisex/dto'
import { privateMediaDir } from '@/lib/classisex/storage'
import { isAdVisible } from '@/lib/classisex/visibility'

export const dynamic = 'force-dynamic'

/**
 * Public cover photo of a visible ad (PREV-01): GET /classisex/previa/{mediaId}
 *
 * Client decision 2026-10-23: photos are no longer blurred. This serves the sharp `card` size of the
 * COVER (webp, 480 px, re-encoded by Payload: no EXIF/GPS); a small photo has no card, so the stored
 * original is served (also re-encoded webp, 2000 px at most). The path always comes from the database
 * (basename), never from the request. What is visible did not change: the open area and free accounts
 * see only the cover, never other photos or videos; hidden ads (pending, refused, unpublished): 404.
 * Old `-previa.webp` files (the former blur) are never read here.
 */
const notFound = () =>
  new Response('Não encontrado.', {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' },
  })

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const mediaId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(mediaId) || mediaId <= 0) return notFound()

  const payload = await getPayload({ config })
  const media = (await payload.findByID({
    collection: 'ad-media',
    id: mediaId,
    depth: 0,
    select: { ad: true, kind: true, filename: true, sizes: true },
    overrideAccess: true,
    disableErrors: true,
  })) as {
    ad?: unknown
    kind?: string
    filename?: string | null
    sizes?: { card?: { filename?: string | null } | null } | null
  } | null
  const stored = media?.sizes?.card?.filename || media?.filename
  if (!media || media.kind !== 'foto' || !stored) return notFound()

  const adId = relId(media.ad)
  const ad = adId
    ? await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true, disableErrors: true })
    : null
  if (!ad || !isAdVisible({ status: ad.status })) return notFound()
  // The open area only ever shows the cover (G-04/G-05), whatever the author's tier
  const { docs: photos } = await payload.find({
    collection: 'ad-media',
    where: { and: [{ ad: { equals: adId } }, { kind: { equals: 'foto' } }] },
    select: { kind: true, order: true },
    sort: 'order',
    depth: 0,
    limit: 50,
    pagination: false,
    overrideAccess: true,
  })
  if (coverOf(photos as unknown as { id: number; kind: 'foto'; order?: number | null }[])?.id !== mediaId) return notFound()

  const file = path.join(privateMediaDir(), path.basename(stored))
  let size: number
  try {
    size = (await fs.promises.stat(file)).size
  } catch {
    return notFound()
  }
  return new Response(Readable.toWeb(fs.createReadStream(file)) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(size),
      'Cache-Control': 'public, max-age=600',
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, noimageindex',
    },
  })
}

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
 * Public blurred photo of a visible ad (PREV-01, D-04): GET /classisex/previa/{mediaId}
 *
 * T-04-11: serves only the blurred derivative stored in `previa` (16 px blur, ≤ 480 px, made on
 * the server at upload). The original and its sizes are never read here — only the protected
 * route /area-do-assinante/midia/… opens those.
 * Hidden ads (pending, refused, unpublished), videos and every photo that is not the cover: 404.
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
    select: { ad: true, kind: true, previa: true },
    overrideAccess: true,
    disableErrors: true,
  })) as { ad?: unknown; kind?: string; previa?: string | null } | null
  if (!media || media.kind !== 'foto' || !media.previa) return notFound()

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

  const blurred = path.join(privateMediaDir(), path.basename(media.previa))
  let size: number
  try {
    size = (await fs.promises.stat(blurred)).size
  } catch {
    return notFound()
  }
  return new Response(Readable.toWeb(fs.createReadStream(blurred)) as ReadableStream, {
    status: 200,
    headers: {
      'Content-Type': 'image/webp',
      'Content-Length': String(size),
      'Cache-Control': 'public, max-age=600',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

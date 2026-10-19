import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { Readable } from 'stream'

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
 * Hidden ads (pending, refused, unpublished, author without access) and videos: 404.
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
  const authorId = relId(ad?.author)
  const author = authorId
    ? await payload.findByID({ collection: 'assinantes', id: authorId, depth: 0, overrideAccess: true, disableErrors: true })
    : null
  if (!ad || !isAdVisible({ status: ad.status }, author?.accessUntil ?? null, new Date())) return notFound()

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

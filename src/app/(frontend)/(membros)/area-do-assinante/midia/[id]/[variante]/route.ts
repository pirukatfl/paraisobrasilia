import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { Readable } from 'stream'

import { accessStatusFor } from '@/lib/assinantes/status'
import { canViewMedia, MEDIA_VARIANTS, type MediaVariant, type Principal } from '@/lib/classisex/media-access'
import { parseRange } from '@/lib/classisex/range'
import { privateMediaDir } from '@/lib/classisex/storage'

export const dynamic = 'force-dynamic'

/**
 * Protected ClassiSex media (CLAS-06, D-05): GET /area-do-assinante/midia/{id}/{miniatura|foto|video}
 *
 * T-04-02: one auth check per request (canViewMedia): staff, the owner, or a subscriber with
 *          active access looking at a visible ad. Everybody else: 403 (no/inactive session) or 404.
 * T-04-05: the viewer's entitlement is recomputed on every request (never cached).
 * T-04-08: `Cache-Control: private` + `Vary: Cookie` — no CDN/proxy keeps these bytes; never
 *          passed to next/image.
 * The file path comes only from the database document (path.basename), never from the URL.
 */
const COMMON = {
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie',
}

const denied = (status: 403 | 404 | 416, extra: Record<string, string> = {}) =>
  Response.json(
    status === 403 ? { error: 'Entre como assinante para ver.' } : { error: 'Não encontrado.' },
    { status, headers: { ...COMMON, 'Cache-Control': 'private, no-store', ...extra } },
  )

const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return Number((value as { id?: number | string }).id)
  return Number(value)
}

type AdMediaDoc = {
  id: number
  kind: 'foto' | 'video'
  owner: unknown
  ad: unknown
  filename?: string | null
  mimeType?: string | null
  sizes?: { card?: { filename?: string | null } | null } | null
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string; variante: string }> }) {
  const { id, variante } = await params
  const mediaId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(mediaId) || mediaId <= 0) return denied(404)
  if (!MEDIA_VARIANTS.includes(variante as MediaVariant)) return denied(404)

  const payload = await getPayload({ config })
  const now = new Date()
  const { user } = await payload.auth({ headers: request.headers })
  const principal: Principal =
    user && (user.collection === 'users' || user.collection === 'assinantes')
      ? { collection: user.collection, id: Number(user.id) }
      : null

  const media = (await payload.findByID({
    collection: 'ad-media',
    id: mediaId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as AdMediaDoc | null
  if (!media) return principal ? denied(404) : denied(403)

  const adId = relId(media.ad)
  const ad = adId
    ? await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true, disableErrors: true })
    : null
  const authorId = relId(ad?.author)
  const author = authorId
    ? await payload.findByID({ collection: 'assinantes', id: authorId, depth: 0, overrideAccess: true, disableErrors: true })
    : null
  const viewerActive =
    principal?.collection === 'assinantes' ? (await accessStatusFor(payload, principal.id, now)).state === 'ativa' : false

  const decision = canViewMedia({
    principal,
    viewerActive,
    media: { owner: relId(media.owner), kind: media.kind },
    ad: ad ? { status: ad.status } : null,
    authorAccessUntil: author?.accessUntil ?? null,
    variante: variante as MediaVariant,
    now,
  })
  if (decision === 'unauthenticated') return denied(403)
  if (decision === 'not-found') return denied(404)

  const name = variante === 'miniatura' ? media.sizes?.card?.filename : media.filename
  if (!name) return denied(404)
  const filePath = path.join(privateMediaDir(), path.basename(name))
  let size: number
  try {
    size = (await fs.promises.stat(filePath)).size
  } catch (err) {
    console.error(`[midia] arquivo ausente para ad-media ${media.id} (${variante}): ${(err as Error).message}`)
    return denied(404)
  }

  const headers: Record<string, string> = {
    ...COMMON,
    'Content-Type': media.kind === 'video' ? 'video/mp4' : 'image/webp',
    'Cache-Control': 'private, max-age=600',
    'Content-Disposition': 'inline',
    'Accept-Ranges': 'bytes',
  }
  const range = parseRange(request.headers.get('range'), size)
  if (range.type === 'invalid') return denied(416, { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' })
  if (range.type === 'partial') {
    const stream = fs.createReadStream(filePath, { start: range.start, end: range.end })
    return new Response(Readable.toWeb(stream) as ReadableStream, {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(range.end - range.start + 1),
      },
    })
  }
  const stream = fs.createReadStream(filePath)
  return new Response(Readable.toWeb(stream) as ReadableStream, {
    status: 200,
    headers: { ...headers, 'Content-Length': String(size) },
  })
}

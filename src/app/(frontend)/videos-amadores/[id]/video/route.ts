import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { Readable } from 'stream'

import { headersDoAssinante } from '@/lib/assinantes/cookie'
import { accessStatusFor } from '@/lib/assinantes/status'
import { parseRange } from '@/lib/classisex/range'
import { privateMediaDir } from '@/lib/classisex/storage'
import { arquivoPublicado } from '@/lib/midia-enviada/publico'

export const dynamic = 'force-dynamic'

/**
 * Approved video sent by the public: GET /videos-amadores/{id}/video (client decision 2026-11-10).
 * Playing is for subscribers with ACTIVE access only (no staff exception); the bytes are refused here (403), whatever the
 * page shows. Order matters: an unpublished file is 404 for everybody (it does not exist for the site), then a
 * viewer without the right gets 403 before any byte is read. Entitlement and publication are recomputed on every
 * request. `Cache-Control: private` + `Vary: Cookie`: no shared cache keeps these bytes.
 */
const COMMON = {
  'X-Robots-Tag': 'noindex, nofollow',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Cookie',
}

const denied = (status: 403 | 404 | 416, extra: Record<string, string> = {}) =>
  Response.json(
    { error: status === 403 ? 'Só assinantes podem assistir.' : 'Não encontrado.' },
    { status, headers: { ...COMMON, 'Cache-Control': 'private, no-store', ...extra } },
  )

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const fileId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(fileId) || fileId <= 0) return denied(404)

  const payload = await getPayload({ config })
  const arquivo = await arquivoPublicado(payload, fileId)
  if (!arquivo || arquivo.kind !== 'video') return denied(404)

  // Subscriber session comes from its own cookie, so a staff session in the same browser neither grants nor blocks the play
  const swapped = headersDoAssinante(request.headers, payload.config.cookiePrefix)
  const { user } = swapped ? await payload.auth({ headers: swapped }) : { user: null }
  let allowed = false
  // Subscribers with active access only; a staff session gets no play (client decision 2026-11-11)
  if (user?.collection === 'assinantes') {
    allowed = (await accessStatusFor(payload, Number(user.id), new Date())).state === 'ativa'
  }
  if (!allowed) return denied(403)

  const filePath = path.join(privateMediaDir(), path.basename(arquivo.filename))
  let size: number
  try {
    size = (await fs.promises.stat(filePath)).size
  } catch (err) {
    console.error(`[amadores] vídeo ausente para ${fileId}: ${(err as Error).message}`)
    return denied(404)
  }

  const headers: Record<string, string> = {
    ...COMMON,
    'Content-Type': 'video/mp4',
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

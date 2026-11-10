import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import { Readable } from 'stream'

import { privateMediaDir } from '@/lib/classisex/storage'
import { arquivoPublicado } from '@/lib/midia-enviada/publico'

export const dynamic = 'force-dynamic'

/**
 * Approved photo sent by the public: GET /amadores/foto/{id}/{miniatura|foto} (client decision 2026-11-10).
 * Open to everybody, but only while the file is published (submission approved and file not hidden): checked in
 * the database on EVERY request, never from the cache. Anything else is a plain 404, so a refused or unpublished
 * file cannot be told apart from one that never existed. The file name comes only from the database
 * (path.basename); the private storage is never exposed by path. Not passed to the image optimizer.
 */
const HEADERS = {
  'X-Robots-Tag': 'noindex, noimageindex',
  'X-Content-Type-Options': 'nosniff',
}

const notFound = () =>
  Response.json({ error: 'Não encontrado.' }, { status: 404, headers: { ...HEADERS, 'Cache-Control': 'no-store' } })

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; variante: string }> }) {
  const { id, variante } = await params
  const fileId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(fileId) || fileId <= 0) return notFound()
  if (variante !== 'miniatura' && variante !== 'foto') return notFound()

  const payload = await getPayload({ config })
  const arquivo = await arquivoPublicado(payload, fileId)
  if (!arquivo || arquivo.kind !== 'foto') return notFound()

  const name = variante === 'miniatura' ? arquivo.cardFilename : arquivo.filename
  if (!name) return notFound()
  const filePath = path.join(privateMediaDir(), path.basename(name))
  let size: number
  try {
    size = (await fs.promises.stat(filePath)).size
  } catch (err) {
    console.error(`[amadores] arquivo ausente para ${fileId} (${variante}): ${(err as Error).message}`)
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
      // Short on purpose: an unpublished photo leaves browsers and the CDN within minutes
      'Cache-Control': 'public, max-age=300',
    },
  })
}

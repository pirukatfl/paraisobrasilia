import config from '@payload-config'
import fs from 'fs'
import { getPayload } from 'payload'
import { Readable } from 'stream'

import { capaDoVideo } from '@/lib/midia-enviada/capa'
import { arquivoPublicado } from '@/lib/midia-enviada/publico'

export const dynamic = 'force-dynamic'

/**
 * Still frame of an approved video: GET /videos-amadores/{id}/capa (client decision 2026-11-12: the card shows
 * the frame to everybody, play stays for subscribers). Like the photo route: open, but only while the video is
 * published, checked in the database on EVERY request; anything else is a plain 404.
 */
const HEADERS = {
  'X-Robots-Tag': 'noindex, noimageindex',
  'X-Content-Type-Options': 'nosniff',
}

const notFound = () =>
  Response.json({ error: 'Não encontrado.' }, { status: 404, headers: { ...HEADERS, 'Cache-Control': 'no-store' } })

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const fileId = Number(id)
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(fileId) || fileId <= 0) return notFound()

  const payload = await getPayload({ config })
  const arquivo = await arquivoPublicado(payload, fileId)
  if (!arquivo || arquivo.kind !== 'video') return notFound()

  const capa = await capaDoVideo(fileId, arquivo.filename)
  if (!capa) return notFound()
  const size = (await fs.promises.stat(capa)).size
  return new Response(Readable.toWeb(fs.createReadStream(capa)) as ReadableStream, {
    status: 200,
    headers: {
      ...HEADERS,
      'Content-Type': 'image/jpeg',
      'Content-Length': String(size),
      'Content-Disposition': 'inline',
      'Cache-Control': 'public, max-age=300',
    },
  })
}

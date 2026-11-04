import config from '@payload-config'
import fs from 'fs'
import path from 'path'
import { getPayload } from 'payload'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

/**
 * Blurred stand-in for a model photo (GET /foto-borrada/{mediaId}), shown to visitors who are not active
 * subscribers. Only photos of a PUBLISHED model are served, and only as a 24 px wide, blurred, low-quality
 * webp built on the server: nothing of the original can be recovered from it. The file name comes from
 * the database, never from the request.
 */
const headers = {
  'Cache-Control': 'public, max-age=86400',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, noimageindex',
}
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
  const used = await payload.find({
    collection: 'models',
    where: { and: [{ 'photos.image': { equals: mediaId } }, { _status: { equals: 'published' } }] },
    depth: 0,
    limit: 1,
    pagination: false,
    select: { id: true } as never, // id is implicit in the generated select type
    overrideAccess: true,
  })
  if (used.docs.length === 0) return notFound()

  const media = (await payload.findByID({
    collection: 'media',
    id: mediaId,
    depth: 0,
    select: { filename: true, sizes: true },
    overrideAccess: false,
    disableErrors: true,
  })) as { filename?: string | null; sizes?: { card?: { filename?: string | null } | null } | null } | null
  const stored = media?.sizes?.card?.filename || media?.filename
  if (!stored) return notFound()

  try {
    const file = path.join(path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || 'media'), path.basename(stored))
    const input = await fs.promises.readFile(file)
    const out = await sharp(input).resize({ width: 24 }).blur(2).webp({ quality: 30 }).toBuffer()
    return new Response(new Uint8Array(out), { status: 200, headers: { ...headers, 'Content-Type': 'image/webp' } })
  } catch {
    return notFound()
  }
}

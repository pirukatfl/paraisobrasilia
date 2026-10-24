import config from '@payload-config'
import { getPayload } from 'payload'

import { accessStatusFor } from '@/lib/assinantes/status'
import { TIER_LIMITS, tierOf } from '@/lib/assinantes/tier'
import {
  MAX_AD_PHOTO_BYTES,
  MAX_AD_VIDEO_BYTES,
  PHOTO_MIME_TYPES,
  VIDEO_MIME_TYPES,
  type UploadErrorCode,
} from '@/lib/classisex/media-messages'
import { attachMedia, ServiceError } from '@/lib/classisex/service'

export const dynamic = 'force-dynamic'

/**
 * Owner upload of one photo or the video: POST multipart (fields `tipo` = foto|video and
 * `arquivo`) from the plain forms on "Editar anúncio" (CLAS-03, D-01). Answers 303 back to the
 * edit page with ?midia=foto-ok|video-ok|erro&codigo=…
 *
 * Order of checks (cheap first, body last):
 * 1. session: src/proxy.ts rejects (403) a POST whose Origin is foreign before it gets here, and the
 *    SameSite=Lax cookie is not sent cross-site anyway; no session → /entrar (T-04-15)
 * 2. ad exists and belongs to this account, else 404 (T-04-04)
 * 3. tier limits before the body is decoded (G-02/G-03): a free account never sends a video, and
 *    never a second photo (the collection hook is the last line and counts again)
 * 4. Content-Length cap before reading the body (T-04-09; Caddy also caps at 110 MB)
 * 5. per-kind type and size, then the collection hooks (duration, decoding, limits, scrub)
 * Not a server action: the server-action body limit stays at its default.
 */
const MAX_BODY_BYTES = 105 * 1024 * 1024

const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }

const seeOther = (location: string) => new Response(null, { status: 303, headers: { ...noStore, Location: location } })

const notFound = () =>
  new Response('Página não encontrada.', { status: 404, headers: { ...noStore, 'Content-Type': 'text/plain; charset=utf-8' } })

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

/** Some phones send an empty type for .mov: fall back to the extension. */
function mimeOf(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[ext] ?? ''
}

async function handle(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) <= 0) return notFound()
  const adId = Number(id)
  const editar = `/area-do-assinante/meus-anuncios/${adId}/editar`
  const back = (query: string) => seeOther(`${editar}?${query}`)
  const fail = (code: UploadErrorCode) => back(`midia=erro&codigo=${code}`)

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: request.headers })
  if (user?.collection !== 'assinantes') return seeOther(`/entrar?next=${encodeURIComponent(editar)}`)
  const assinanteId = Number(user.id)

  const ad = await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true, disableErrors: true })
  const authorId = typeof ad?.author === 'object' ? ad?.author?.id : ad?.author
  if (!ad || Number(authorId) !== assinanteId) return notFound()

  // G-02: cheap tier pre-check from the query string (?tipo=foto|video, sent by both upload clients)
  // and again from the form field once parsed (a client that omits the query still gets refused
  // before sharp/MP4 parsing; the collection hook is the last line)
  const tier = tierOf(await accessStatusFor(payload, assinanteId, new Date()))
  const tierRefusal = async (kind: string | null): Promise<UploadErrorCode | null> => {
    if (tier !== 'gratis') return null
    if (kind === 'video') return 'video-gratis'
    if (kind === 'foto') {
      const { totalDocs } = await payload.count({
        collection: 'ad-media',
        where: { and: [{ ad: { equals: adId } }, { kind: { equals: 'foto' } }] },
        overrideAccess: true,
      })
      if (totalDocs >= TIER_LIMITS.gratis.fotos) return 'limite-fotos-gratis'
    }
    return null
  }
  const early = await tierRefusal(new URL(request.url).searchParams.get('tipo'))
  if (early) return fail(early)

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return fail('grande')

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail('tipo')
  }
  const tipo = form.get('tipo') === 'video' ? 'video' : 'foto'
  const late = await tierRefusal(tipo)
  if (late) return fail(late)
  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return fail('tipo')
  const mimetype = mimeOf(arquivo)
  const allowed = tipo === 'video' ? VIDEO_MIME_TYPES : PHOTO_MIME_TYPES
  if (!allowed.includes(mimetype)) return fail('tipo')
  if (arquivo.size > (tipo === 'video' ? MAX_AD_VIDEO_BYTES : MAX_AD_PHOTO_BYTES)) return fail('grande')

  try {
    await attachMedia(payload, {
      assinanteId,
      adId,
      file: { data: Buffer.from(await arquivo.arrayBuffer()), mimetype, name: arquivo.name || `${tipo}`, size: arquivo.size },
      now: new Date(),
    })
  } catch (err) {
    if (err instanceof ServiceError) {
      if (err.code === 'nao-encontrado') return notFound()
      if (err.code === 'limite') return fail('limite-anuncios')
      return fail(err.code as UploadErrorCode)
    }
    console.error(`[midia] envio falhou para o anúncio ${adId}: ${(err as Error).message}`)
    return back('midia=erro')
  }
  return back(`midia=${tipo}-ok`)
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    return await handle(request, context)
  } catch (err) {
    // Session/database failures before the upload starts: back to the edit page with a readable reason
    console.error(`[midia] erro inesperado: ${(err as Error).message}`)
    const { id } = await context.params
    return seeOther(`/area-do-assinante/meus-anuncios/${Number(id) || ''}/editar?midia=erro&codigo=erro`)
  }
}

import config from '@payload-config'
import { getPayload } from 'payload'

import { MAX_AD_PHOTO_BYTES, UPLOAD_ERROR_MESSAGES, uploadErrorMessage } from '@/lib/classisex/media-messages'
import { ServiceError, type UploadFile } from '@/lib/classisex/service'
import { createVisitorConto } from '@/lib/contos/envio'

export const dynamic = 'force-dynamic'

/**
 * Open conto form for anyone, no account (client decision 2026-10-24): POST multipart with title, text,
 * optional nickname, e-mail and `imagem`, the declaration `consent`, `termos` and the honeypot `website`.
 * Same shape as /classisex/anunciar/enviar: no session is read, nothing that decides status or limits comes
 * from the browser (the conto is always a draft), CSRF is covered by src/proxy.ts, a body above one image
 * plus the text is refused before it is read. With JavaScript (`Accept: application/json`) the answer is
 * `{ ok, redirect | errors }`; without it a 303 to the success page or back to the form with ?erro=<codigo>.
 * The e-mail and the text are never logged or echoed.
 */
const MAX_BODY_BYTES = MAX_AD_PHOTO_BYTES + 1_000_000
const ENVIADO = '/contos/enviado'
const FORM = '/contos/enviar'

const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }

const EXTENSION_TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }

/** Some phones send an empty type: fall back to the extension. */
function mimeOf(file: File): string {
  if (file.type) return file.type
  return EXTENSION_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? ''
}

const text = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

const IMAGE_CODES = new Set<string>(['grande', 'tipo', 'foto-ilegivel'])

type Failure = { code: string; status: number; errors: Record<string, string> }

function failureOf(err: unknown): Failure {
  if (err instanceof ServiceError) {
    if (err.code === 'invalido' && err.errors) return { code: 'invalido', status: 400, errors: err.errors }
    if (IMAGE_CODES.has(err.code)) return { code: err.code, status: err.status, errors: { imagem: uploadErrorMessage(err.code) } }
    return { code: err.code, status: err.status, errors: { form: err.message } }
  }
  // Never log the body or the e-mail
  console.error(`[contos-sem-conta] envio falhou: ${err instanceof Error ? err.name : 'erro'}`)
  return { code: 'erro', status: 500, errors: { form: 'Não foi possível enviar agora. Tente de novo em alguns minutos.' } }
}

export async function POST(request: Request) {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json')
  const respond = (failure: Failure) =>
    wantsJson
      ? Response.json({ ok: false, errors: failure.errors }, { status: failure.status, headers: noStore })
      : new Response(null, { status: 303, headers: { ...noStore, Location: `${FORM}?erro=${encodeURIComponent(failure.code)}` } })
  const succeed = () =>
    wantsJson
      ? Response.json({ ok: true, redirect: ENVIADO }, { headers: noStore })
      : new Response(null, { status: 303, headers: { ...noStore, Location: ENVIADO } })

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return respond(failureOf(new ServiceError('grande', UPLOAD_ERROR_MESSAGES.grande, 413)))

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return respond(failureOf(new ServiceError('tipo', UPLOAD_ERROR_MESSAGES.tipo, 400)))
  }

  const entries = form.getAll('imagem').filter((e): e is File => e instanceof File && e.size > 0)
  // One image only: a second file is refused, not silently dropped
  if (entries.length > 1) return respond(failureOf(new ServiceError('tipo', 'Envie uma única imagem.', 400)))
  let file: UploadFile | null = null
  if (entries[0]) {
    file = {
      data: Buffer.from(await entries[0].arrayBuffer()),
      mimetype: mimeOf(entries[0]),
      name: entries[0].name || 'imagem',
      size: entries[0].size,
    }
  }

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]
  const ip = (forwarded ?? request.headers.get('x-real-ip') ?? 'desconhecido').trim()

  try {
    const payload = await getPayload({ config })
    await createVisitorConto(payload, {
      title: text(form, 'title'),
      assinadoComo: text(form, 'assinadoComo'),
      texto: text(form, 'texto'),
      email: text(form, 'email'),
      consent: text(form, 'consent') === 'sim',
      termos: text(form, 'termos') === 'sim',
      website: text(form, 'website'),
      file,
      ip,
      now: new Date(),
    })
  } catch (err) {
    return respond(failureOf(err))
  }
  // A filled honeypot gets the very same answer (nothing was created)
  return succeed()
}

import config from '@payload-config'
import { getPayload } from 'payload'

import {
  MAX_AD_PHOTO_BYTES,
  UPLOAD_ERROR_MESSAGES,
  uploadErrorMessage,
} from '@/lib/classisex/media-messages'
import { ServiceError, type UploadFile } from '@/lib/classisex/service'
import { createVisitorAd } from '@/lib/classisex/visitante'

export const dynamic = 'force-dynamic'

/**
 * Open ad form for people WITHOUT an account (client decision 2026-10-23, S-13): POST multipart with the
 * ad fields (incl. the 18+ declaration `consent`), e-mail, terms, the honeypot `website` and at most one `foto`. One request, so the ad and
 * its photo succeed or fail together (a failed photo deletes the ad).
 *
 * - Not a server action: the server-action body limit stays as it is.
 * - No session is read. Even a signed-in account posting here is treated as a visitor (the page redirects
 *   accounts to the members flow; this endpoint simply never trusts or needs a session).
 * - Ownership, status, the "sent without account" marker and every limit are decided in createVisitorAd,
 *   never by what the browser sends. Videos and a second photo are refused there before anything is written.
 * - CSRF: src/proxy.ts rejects a state-changing request whose Origin is foreign (T-Q-08).
 * - Content-Length above one photo plus 1 MB is refused before the body is read (T-Q-02).
 * With JavaScript (`Accept: application/json`) the answer is `{ ok, redirect | errors }` and the typed values
 * stay in the form; without JavaScript it is a 303 to the success page or back to the form with ?erro=<codigo>.
 * The e-mail is never logged or echoed.
 */
const MAX_BODY_BYTES = MAX_AD_PHOTO_BYTES + 1_000_000
const RECEBIDO = '/classisex/anunciar/recebido'
const FORM = '/classisex/anunciar'

const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

/** Some phones send an empty type: fall back to the extension. */
function mimeOf(file: File): string {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return EXTENSION_TYPES[ext] ?? ''
}

const text = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

const MEDIA_CODES = new Set<string>(['grande', 'tipo', 'fotos-sem-conta', 'video-sem-conta', 'foto-ilegivel', 'video-ilegivel', 'indisponivel', 'longo'])

type Failure = { code: string; status: number; errors: Record<string, string> }

function failureOf(err: unknown): Failure {
  if (err instanceof ServiceError) {
    if (err.code === 'invalido' && err.errors) return { code: 'invalido', status: 400, errors: err.errors }
    if (MEDIA_CODES.has(err.code)) {
      return { code: err.code, status: err.status, errors: { foto: uploadErrorMessage(err.code) } }
    }
    return { code: err.code, status: err.status, errors: { form: err.message } }
  }
  // Never log the body or the e-mail
  console.error(`[anunciar-sem-conta] envio falhou: ${err instanceof Error ? err.name : 'erro'}`)
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
      ? Response.json({ ok: true, redirect: RECEBIDO }, { headers: noStore })
      : new Response(null, { status: 303, headers: { ...noStore, Location: RECEBIDO } })

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return respond(failureOf(new ServiceError('grande', UPLOAD_ERROR_MESSAGES.grande, 413)))

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return respond(failureOf(new ServiceError('tipo', UPLOAD_ERROR_MESSAGES.tipo, 400)))
  }

  const files: UploadFile[] = []
  for (const name of ['foto', 'video'] as const) {
    for (const entry of form.getAll(name)) {
      if (!(entry instanceof File) || entry.size === 0) continue
      files.push({
        data: Buffer.from(await entry.arrayBuffer()),
        mimetype: mimeOf(entry),
        name: entry.name || name,
        size: entry.size,
      })
    }
  }

  const euSou = Number.parseInt(text(form, 'euSou'), 10)
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]
  const ip = (forwarded ?? request.headers.get('x-real-ip') ?? 'desconhecido').trim()

  try {
    const payload = await getPayload({ config })
    await createVisitorAd(payload, {
      input: {
        apelido: text(form, 'apelido'),
        euSou: Number.isInteger(euSou) && euSou > 0 ? euSou : null,
        cidade: text(form, 'cidade'),
        texto: text(form, 'texto'),
        whatsapp: text(form, 'whatsapp'),
        telegram: text(form, 'telegram'),
        consent: text(form, 'consent') === 'sim',
      },
      email: text(form, 'email'),
      termos: text(form, 'termos') === 'sim',
      website: text(form, 'website'),
      files,
      ip,
      now: new Date(),
    })
  } catch (err) {
    return respond(failureOf(err))
  }
  // A filled honeypot gets the very same answer (nothing was created)
  return succeed()
}

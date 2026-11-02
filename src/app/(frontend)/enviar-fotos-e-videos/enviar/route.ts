import config from '@payload-config'
import { getPayload } from 'payload'

import { UPLOAD_ERROR_MESSAGES } from '@/lib/classisex/media-messages'
import { ServiceError, type UploadFile } from '@/lib/classisex/service'
import { criarEnvioMidia } from '@/lib/midia-enviada/envio'
import { MAX_BODY_BYTES, failureOf, noStore, text, toUploadFile, type Failure } from '@/lib/midia-enviada/http'

export const dynamic = 'force-dynamic'

/**
 * Open "Enviar fotos e vídeos" form for anyone, no account (client decision 2026-11-01): POST multipart with
 * `apelido`, `contato`, `mensagem`, optionally `promocao=1` + `dataFesta` (take part in the promotion on right now; its title is read from the global, never from the form), the declarations `maior18` and `autorizacao`, the honeypot `website` and
 * `arquivos` (one or more files). Same shape as /contos/enviar/enviar: no session is read, nothing that
 * decides status comes from the browser, CSRF is covered by src/proxy.ts, a body above one video is refused
 * before it is read. With JavaScript (`Accept: application/json`) the form sends only the first file here and
 * the others to /enviar-fotos-e-videos/arquivo with the `token` of the answer; without it all files travel
 * together (small ones) and the answer is a 303 to the success page or back to the form with ?erro=<codigo>.
 * The contact and the message are never logged or echoed.
 */
const RECEBIDO = '/enviar-fotos-e-videos/recebido'
const FORM = '/enviar-fotos-e-videos'
const PROMOCAO = 'promocao=1'

export async function POST(request: Request) {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json')
  // Only a hint to keep the promotion on the next page; the server decides again from the global
  let quisParticipar = false
  const respond = (failure: Failure) =>
    wantsJson
      ? Response.json({ ok: false, errors: failure.errors }, { status: failure.status, headers: noStore })
      : new Response(null, {
          status: 303,
          headers: {
            ...noStore,
            Location: `${FORM}?erro=${encodeURIComponent(failure.code)}${quisParticipar ? `&${PROMOCAO}` : ''}`,
          },
        })

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return respond(failureOf(new ServiceError('grande', UPLOAD_ERROR_MESSAGES.grande, 413)))

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return respond(failureOf(new ServiceError('tipo', UPLOAD_ERROR_MESSAGES.tipo, 400)))
  }

  quisParticipar = text(form, 'promocao') === '1'
  const recebido = quisParticipar ? `${RECEBIDO}?${PROMOCAO}` : RECEBIDO
  const entries = form.getAll('arquivos').filter((e): e is File => e instanceof File && e.size > 0)
  const files: UploadFile[] = []
  for (const entry of entries) files.push(await toUploadFile(entry))

  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]
  const ip = (forwarded ?? request.headers.get('x-real-ip') ?? 'desconhecido').trim()

  try {
    const payload = await getPayload({ config })
    const { token } = await criarEnvioMidia(payload, {
      apelido: text(form, 'apelido'),
      contato: text(form, 'contato'),
      mensagem: text(form, 'mensagem'),
      maior18: text(form, 'maior18') === 'sim',
      autorizacao: text(form, 'autorizacao') === 'sim',
      website: text(form, 'website'),
      dataFesta: text(form, 'dataFesta'),
      participarPromocao: quisParticipar,
      files,
      ip,
      now: new Date(),
    })
    // A filled honeypot gets the very same answer (token null: nothing was created)
    return wantsJson
      ? Response.json({ ok: true, token, redirect: recebido }, { headers: noStore })
      : new Response(null, { status: 303, headers: { ...noStore, Location: recebido } })
  } catch (err) {
    return respond(failureOf(err))
  }
}

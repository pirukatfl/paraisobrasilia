import config from '@payload-config'
import { getPayload } from 'payload'

import { UPLOAD_ERROR_MESSAGES } from '@/lib/classisex/media-messages'
import { ServiceError } from '@/lib/classisex/service'
import { anexarArquivoMidia } from '@/lib/midia-enviada/envio'
import { ENVIO_MIDIA_MESSAGES } from '@/lib/midia-enviada/regras'
import { MAX_BODY_BYTES, failureOf, noStore, text, toUploadFile } from '@/lib/midia-enviada/http'
import { lerToken } from '@/lib/midia-enviada/token'

export const dynamic = 'force-dynamic'

/**
 * One more file for a submission just created by /enviar-fotos-e-videos/enviar: POST multipart with `token`
 * (from that answer, valid 30 minutes) and `arquivo`. Answers `{ ok }` or `{ ok: false, errors }`. The token
 * only allows ADDING files to that one submission, inside the photo and video limits.
 */
export async function POST(request: Request) {
  const fail = (err: unknown) => {
    const failure = failureOf(err)
    return Response.json({ ok: false, errors: failure.errors }, { status: failure.status, headers: noStore })
  }

  const declared = Number(request.headers.get('content-length') ?? 0)
  if (declared > MAX_BODY_BYTES) return fail(new ServiceError('grande', UPLOAD_ERROR_MESSAGES.grande, 413))

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return fail(new ServiceError('tipo', UPLOAD_ERROR_MESSAGES.tipo, 400))
  }

  const envioId = lerToken(text(form, 'token'), new Date())
  if (envioId === null) return fail(new ServiceError('sessao', ENVIO_MIDIA_MESSAGES.sessao, 410))
  const arquivo = form.get('arquivo')
  if (!(arquivo instanceof File) || arquivo.size === 0) return fail(new ServiceError('tipo', UPLOAD_ERROR_MESSAGES.tipo, 400))

  try {
    const payload = await getPayload({ config })
    await anexarArquivoMidia(payload, envioId, await toUploadFile(arquivo))
    return Response.json({ ok: true }, { headers: noStore })
  } catch (err) {
    return fail(err)
  }
}

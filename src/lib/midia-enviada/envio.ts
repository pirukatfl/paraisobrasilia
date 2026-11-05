/**
 * Photos and videos sent by anyone, without an account (client decision 2026-11-01).
 *
 * The submission is created as 'novo' with the proof of consent (`consentAt`); nothing is public: both
 * collections are staff-only and the files live in the private media directory. Contact is stored only in
 * the staff-only document and never logged, echoed or put in a DTO. No 'server-only' import: used by the
 * route handlers and int tests.
 */
import type { Payload } from 'payload'
import { APIError } from 'payload'

import { PHOTO_MIME_TYPES, VIDEO_MIME_TYPES, uploadCodeFor } from '../classisex/media-messages'
import { ServiceError, type UploadFile } from '../classisex/service'
import { promocaoVigente } from '../site/promocao-vigente'
import { allowAttempt } from '../email/rate-limit'
import { ENVIO_MIDIA_MESSAGES, MAX_FOTO_BYTES, MAX_FOTOS, MAX_VIDEOS, MAX_VIDEO_BYTES, validarEnvioMidia } from './regras'
import { criarToken } from './token'

export { promocaoVigente }

/** Max submissions that pass validation per IP and per contact in one hour. */
export const MIDIA_MAX_POR_HORA = 5

export type EnvioMidiaParams = {
  apelido: string
  contato: string
  mensagem: string
  maior18: boolean
  autorizacao: boolean
  /** The visitor asked to take part in the promotion; the server checks the global and decides (the title is never taken from here) */
  participarPromocao?: boolean
  /** Honeypot: real people leave it empty */
  website?: string
  /** At least one; the rest may follow one by one with the token */
  files: UploadFile[]
  ip: string
  now: Date
}

/** Cheap checks before anything is decoded or written: type, size and counts. */
function conferirArquivos(files: UploadFile[], jaFotos = 0, jaVideos = 0): void {
  let fotos = jaFotos
  let videos = jaVideos
  for (const f of files) {
    if (PHOTO_MIME_TYPES.includes(f.mimetype)) {
      if (f.size > MAX_FOTO_BYTES) throw new ServiceError('grande', 'A foto passa de 15 MB.', 400)
      fotos += 1
    } else if (VIDEO_MIME_TYPES.includes(f.mimetype)) {
      if (f.size > MAX_VIDEO_BYTES) throw new ServiceError('grande', 'O vídeo passa de 100 MB.', 400)
      videos += 1
    } else {
      throw new ServiceError('tipo', 'Envie fotos JPG, PNG ou WebP, ou vídeos MP4 ou MOV.', 400)
    }
  }
  if (fotos > MAX_FOTOS) throw new ServiceError('limite-fotos', ENVIO_MIDIA_MESSAGES.fotos, 400)
  if (videos > MAX_VIDEOS) throw new ServiceError('limite-video', ENVIO_MIDIA_MESSAGES.videos, 400)
}

/**
 * Creates the submission and stores the files received with it. Returns `{ id: null, token: null }` for a
 * honeypot hit (nothing created). If the first file cannot be stored the submission does not stay behind.
 */
export async function criarEnvioMidia(
  payload: Payload,
  params: EnvioMidiaParams,
): Promise<{ id: number | null; token: string | null; promocao: string | null }> {
  const { files, ip, now } = params
  // (1) honeypot: neutral success, nothing is created
  if ((params.website ?? '').trim() !== '') return { id: null, token: null, promocao: null }

  // (1b) the promotion: its title is read from the global here, on the server, and only while it is on
  const promocao = params.participarPromocao ? await promocaoVigente(payload, now) : null

  // (2) form rules (the declarations are the proof of consent)
  const checked = validarEnvioMidia({ ...params, exigirEmail: promocao !== null })
  if (!checked.ok) throw new ServiceError('invalido', 'Confira os campos destacados.', 400, checked.errors as Record<string, string>)
  if (files.length === 0) {
    throw new ServiceError('invalido', 'Confira os campos destacados.', 400, { arquivos: ENVIO_MIDIA_MESSAGES.semArquivo })
  }
  conferirArquivos(files)
  const value = checked.value

  // (3) rate limit: counted when validation passes, before anything is written
  const nowMs = now.getTime()
  if (
    !allowAttempt(`midia-visitante-ip:${ip}`, nowMs, MIDIA_MAX_POR_HORA) ||
    !allowAttempt(`midia-visitante-contato:${value.contato}`, nowMs, MIDIA_MAX_POR_HORA)
  ) {
    throw new ServiceError('envios', ENVIO_MIDIA_MESSAGES.envios, 429)
  }

  // (4) the submission: status and dates are decided here only
  const doc = await payload.create({
    collection: 'envios-midia',
    data: {
      apelido: value.apelido,
      contato: value.contato,
      mensagem: value.mensagem,
      status: 'novo',
      consentAt: now.toISOString(),
      ...(promocao ? { promocao } : {}),
    },
    overrideAccess: true,
  })

  // (5) the files; if one fails the submission does not stay behind
  try {
    for (const file of files) await guardarArquivo(payload, doc.id, file)
  } catch (err) {
    await payload.delete({ collection: 'envios-midia', id: doc.id, overrideAccess: true }).catch(() => undefined)
    throw err
  }
  return { id: doc.id, token: criarToken(doc.id, now), promocao }
}

/** Adds one more file to a submission (token already checked by the route). */
export async function anexarArquivoMidia(payload: Payload, envioId: number, file: UploadFile): Promise<void> {
  const envio = await payload.findByID({ collection: 'envios-midia', id: envioId, depth: 0, overrideAccess: true, disableErrors: true })
  if (!envio) throw new ServiceError('sessao', ENVIO_MIDIA_MESSAGES.sessao, 410)
  const count = (kind: 'foto' | 'video') =>
    payload
      .count({
        collection: 'envios-midia-arquivos',
        where: { and: [{ envio: { equals: envioId } }, { kind: { equals: kind } }] },
        overrideAccess: true,
      })
      .then((r) => r.totalDocs)
  conferirArquivos([file], await count('foto'), await count('video'))
  await guardarArquivo(payload, envioId, file)
}

async function guardarArquivo(payload: Payload, envioId: number, file: UploadFile): Promise<void> {
  const kind = VIDEO_MIME_TYPES.includes(file.mimetype) ? 'video' : 'foto'
  try {
    await payload.create({
      collection: 'envios-midia-arquivos',
      data: { envio: envioId } as never,
      file,
      depth: 0,
      overrideAccess: true,
    })
  } catch (err) {
    if (err instanceof APIError && err.status >= 400 && err.status !== 500) {
      throw new ServiceError(uploadCodeFor(err.message, kind), err.message, err.status === 503 ? 503 : 400)
    }
    throw err
  }
}

/**
 * Rules of the open "Enviar fotos e vídeos" form (client decision 2026-11-01). Pure module: used by the
 * form (client), the route handlers and the service, so the limits live in one place. Photo and video
 * limits are the ones already used for ClassiSex (media-messages.ts).
 */
import { MAX_AD_PHOTOS, MAX_AD_PHOTO_BYTES, MAX_AD_VIDEOS, MAX_AD_VIDEO_BYTES } from '../classisex/media-messages'
import { normaliseVisitorEmail, EMAIL_MAX } from '../classisex/rules'

export const MAX_FOTOS = MAX_AD_PHOTOS
export const MAX_VIDEOS = MAX_AD_VIDEOS
export const MAX_FOTO_BYTES = MAX_AD_PHOTO_BYTES
export const MAX_VIDEO_BYTES = MAX_AD_VIDEO_BYTES

export const APELIDO_MIN = 2
export const APELIDO_MAX = 60
export const MENSAGEM_MAX = 1000
export const DATA_FESTA_MAX = 80

export const ENVIO_MIDIA_MESSAGES = {
  apelido: `Informe um apelido (de ${APELIDO_MIN} a ${APELIDO_MAX} caracteres).`,
  contato: 'Informe um e-mail válido ou um WhatsApp com DDD. Só a equipe vê.',
  dataFesta: `A festa ou data pode ter até ${DATA_FESTA_MAX} caracteres.`,
  mensagem: `A mensagem pode ter até ${MENSAGEM_MAX} caracteres.`,
  maior18: 'Confirme que você tem 18 anos ou mais.',
  autorizacao: 'Confirme que autoriza o uso das imagens e que todas as pessoas que aparecem também autorizaram.',
  semArquivo: 'Escolha pelo menos uma foto ou um vídeo.',
  fotos: `Você pode enviar até ${MAX_FOTOS} fotos.`,
  videos: `Você pode enviar até ${MAX_VIDEOS} vídeos.`,
  envios: 'Muitos envios seguidos. Tente de novo mais tarde.',
  sessao: 'O envio expirou. Envie de novo desde o início.',
} as const

export type EnvioMidiaInput = {
  apelido: string
  contato: string
  mensagem: string
  maior18: boolean
  autorizacao: boolean
  /** Only read when the submission takes part in the promotion */
  dataFesta?: string
}

export type EnvioMidiaValue = { apelido: string; contato: string; mensagem: string | null; dataFesta: string | null }
export type EnvioMidiaErrors = Partial<Record<'apelido' | 'contato' | 'mensagem' | 'dataFesta' | 'maior18' | 'autorizacao', string>>

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** E-mail (lower-cased) or a Brazilian phone/WhatsApp (digits only, 10 to 13 with the country code). */
export function normalizarContato(valor: string): string | null {
  const texto = valor.trim()
  if (!texto) return null
  if (texto.includes('@')) {
    const email = normaliseVisitorEmail(texto)
    return email.length <= EMAIL_MAX && EMAIL_RE.test(email) ? email : null
  }
  if (!/^[\d\s().+-]+$/.test(texto)) return null
  const digitos = texto.replace(/\D/g, '')
  return digitos.length >= 10 && digitos.length <= 13 ? digitos : null
}

/** Normalises line endings and drops control characters (keeps \n). */
const limpar = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()

export function validarEnvioMidia(
  input: EnvioMidiaInput,
): { ok: true; value: EnvioMidiaValue } | { ok: false; errors: EnvioMidiaErrors } {
  const errors: EnvioMidiaErrors = {}
  const apelido = limpar(input.apelido).replace(/\s+/g, ' ')
  const mensagem = limpar(input.mensagem)
  const contato = normalizarContato(input.contato)
  const dataFesta = limpar(input.dataFesta ?? '').replace(/\s+/g, ' ')

  if (apelido.length < APELIDO_MIN || apelido.length > APELIDO_MAX) errors.apelido = ENVIO_MIDIA_MESSAGES.apelido
  if (!contato) errors.contato = ENVIO_MIDIA_MESSAGES.contato
  if (mensagem.length > MENSAGEM_MAX) errors.mensagem = ENVIO_MIDIA_MESSAGES.mensagem
  if (dataFesta.length > DATA_FESTA_MAX) errors.dataFesta = ENVIO_MIDIA_MESSAGES.dataFesta
  if (!input.maior18) errors.maior18 = ENVIO_MIDIA_MESSAGES.maior18
  if (!input.autorizacao) errors.autorizacao = ENVIO_MIDIA_MESSAGES.autorizacao

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { apelido, contato: contato!, mensagem: mensagem || null, dataFesta: dataFesta || null } }
}

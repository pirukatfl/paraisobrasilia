/**
 * Recados rules (D-01, REC-01). Same messages on the site and in the admin.
 * Pure module: no Payload/Next imports.
 */
import { REDACTED_LABEL, redactContacts } from '../classisex/redact'
import { apelidoError } from '../classisex/rules'

export type RecadoStatus = 'pendente' | 'aprovado' | 'recusado' | 'despublicado'

export const RECADO_MAX = 500
/** At most 3 notes "Em análise" or "Publicado" per subscriber (orchestrator default 3). */
export const RECADO_ACTIVE_LIMIT = 3
export const RECADO_ACTIVE_STATUSES: RecadoStatus[] = ['pendente', 'aprovado']

export const RECADO_MESSAGES = {
  apelidoVazio: 'Escolha um apelido.',
  vazio: 'Escreva o recado.',
  longo: 'O recado pode ter até 500 caracteres.',
  soContato: 'Escreva um recado além do contato. Para trocar contato, use Enviar mensagem.',
  limite: 'Você já tem 3 recados ativos. Apague um para publicar outro.',
} as const

export type RecadoInput = { apelido: string; texto: string }
export type RecadoErrors = Partial<Record<'apelido' | 'texto', string>>
export type NormalisedRecado = { apelido: string; texto: string; contatosRemovidos: number }

export const normaliseApelido = (value: string) => value.replace(/\s+/g, ' ').trim()
export const normaliseTexto = (value: string) => value.replace(/\r\n/g, '\n').trim()

/** Apelido message for a recado/account nickname (empty → 'Escolha um apelido.'), or null. */
export function recadoApelidoError(apelido: string): string | null {
  return apelido ? apelidoError(apelido) : RECADO_MESSAGES.apelidoVazio
}

/** Text-only checks that run BEFORE redaction (the limit counts what was typed). */
export function recadoTextoError(texto: string): string | null {
  if (!texto) return RECADO_MESSAGES.vazio
  if (texto.length > RECADO_MAX) return RECADO_MESSAGES.longo
  return null
}

/** True when nothing but redaction labels and punctuation is left. */
export function isOnlyContact(redacted: string): boolean {
  return redacted.split(REDACTED_LABEL).join('').replace(/[\s.,;:!?\-/|()]+/g, '') === ''
}

/** D-01: validates what the subscriber typed and strips contacts from the text. */
export function validateRecadoInput(
  input: RecadoInput,
): { ok: true; value: NormalisedRecado } | { ok: false; errors: RecadoErrors } {
  const errors: RecadoErrors = {}
  const apelido = normaliseApelido(input.apelido)
  const texto = normaliseTexto(input.texto)

  const aErr = recadoApelidoError(apelido)
  if (aErr) errors.apelido = aErr
  const tErr = recadoTextoError(texto)
  if (tErr) errors.texto = tErr

  let redacted = { text: texto, removed: 0 }
  if (!errors.texto) {
    redacted = redactContacts(texto)
    if (redacted.removed > 0 && isOnlyContact(redacted.text)) errors.texto = RECADO_MESSAGES.soContato
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { apelido, texto: redacted.text, contatosRemovidos: redacted.removed } }
}

/** Admin title: 'Apelido — first 60 characters…'. */
export function recadoResumo(apelido: string, texto: string): string {
  const clean = texto.replace(/\s+/g, ' ').trim()
  const head = clean.length > 60 ? `${clean.slice(0, 60).trimEnd()}…` : clean
  return `${apelido} — ${head}`
}

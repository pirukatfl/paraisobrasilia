/**
 * ClassiSex ad rules (D-01 fields, D-02 limit). Same messages in the admin and on the site.
 * Pure module: no Payload/Next imports.
 */
import { redactContacts } from './redact'

export type AdStatus = 'pendente' | 'aprovado' | 'recusado' | 'despublicado'

export const TEXT_MAX = 600
/** Revisão 2026-10-20: public nickname shown in the open preview. */
export const APELIDO_MAX = 40
export const CIDADE_MAX = 60
/** D-02: at most 3 ads "Em análise" or "Publicado" per subscriber. */
export const ACTIVE_LIMIT = 3
export const ACTIVE_STATUSES: AdStatus[] = ['pendente', 'aprovado']

export const AD_MESSAGES = {
  contato: 'Informe pelo menos um contato: WhatsApp ou Telegram.',
  apelidoVazio: 'Escolha um apelido para o anúncio.',
  apelidoLongo: `O apelido pode ter até ${APELIDO_MAX} caracteres.`,
  apelidoContato: 'O apelido não pode ter telefone, e-mail, @ ou link. Use só um nome ou apelido.',
  textoVazio: 'Escreva o texto do anúncio.',
  textoLongo: `O texto pode ter até ${TEXT_MAX} caracteres.`,
  whatsapp: 'WhatsApp: só números, com 55 e DDD (ex.: 5561999889772).',
  telegram: 'Telegram: use o @ do seu usuário (5 a 32 letras, números ou _).',
  cidade: 'Cidade: use só letras.',
  cidadeLonga: `Cidade: até ${CIDADE_MAX} caracteres.`,
  euSou: 'Escolha uma opção em "Eu sou".',
  consent: 'Confirme a declaração para enviar.',
  limite: 'Você já tem 3 anúncios ativos. Apague um para publicar outro.',
} as const

export type AdInput = {
  apelido: string
  euSou: number | null
  cidade: string
  texto: string
  whatsapp: string
  telegram: string
  consent: boolean
}

export type AdContato = { whatsapp: string | null; telegram: string | null }

export type NormalisedAd = {
  apelido: string
  euSou: number
  cidade: string | null
  cidadeBusca: string | null
  texto: string
  contato: AdContato
}

export type AdErrors = Partial<Record<keyof AdInput | 'contato', string>>

const WHATSAPP_RE = /^55\d{10,11}$/
const TELEGRAM_RE = /^[A-Za-z0-9_]{5,32}$/
const CIDADE_RE = /^[\p{L} .'-]+$/u

/** Digits only ('+55 (61) 99988-9772' → '5561999889772'); empty → null. */
export function normaliseWhatsapp(value: string | null | undefined): string | null {
  const digits = String(value ?? '').replace(/\D/g, '')
  return digits || null
}

/** Without the leading '@'; empty → null. */
export function normaliseTelegram(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim().replace(/^@+/, '')
  return text || null
}

export const isValidWhatsapp = (v: string) => WHATSAPP_RE.test(v)
export const isValidTelegram = (v: string) => TELEGRAM_RE.test(v)

/** Single-line nickname without any contact (same redaction as the public text). Returns an error message or null. */
export function apelidoError(apelido: string): string | null {
  if (!apelido) return AD_MESSAGES.apelidoVazio
  if (apelido.length > APELIDO_MAX) return AD_MESSAGES.apelidoLongo
  if (apelido.includes('@') || redactContacts(apelido).removed > 0) {
    return AD_MESSAGES.apelidoContato
  }
  return null
}

/** Free-text city: letters (with accents), spaces, - ' . only. Returns an error message or null. */
export function cidadeError(cidade: string): string | null {
  if (!cidade) return null
  if (cidade.length > CIDADE_MAX) return AD_MESSAGES.cidadeLonga
  return CIDADE_RE.test(cidade) ? null : AD_MESSAGES.cidade
}

export function textoError(texto: string): string | null {
  if (!texto.trim()) return AD_MESSAGES.textoVazio
  if (texto.length > TEXT_MAX) return AD_MESSAGES.textoLongo
  return null
}

/** Lower-case, without diacritics, single spaces: the filter target (cidadeBusca). */
export function normaliseCidade(cidade: string): string {
  return cidade
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

/** Admin title: 'Casal · Brasília — first 60 characters…'. */
export function resumoOf(euSouLabel: string, cidade: string | null | undefined, texto: string): string {
  const clean = texto.replace(/\s+/g, ' ').trim()
  const head = clean.length > 60 ? `${clean.slice(0, 60).trimEnd()}…` : clean
  return `${euSouLabel}${cidade ? ` · ${cidade}` : ''} — ${head}`
}

/** D-01: validates and normalises what the subscriber typed. */
export function validateAdInput(
  input: AdInput,
): { ok: true; value: NormalisedAd } | { ok: false; errors: AdErrors } {
  const errors: AdErrors = {}
  const texto = input.texto.replace(/\r\n/g, '\n').trim()
  const cidade = input.cidade.replace(/\s+/g, ' ').trim()
  const whatsapp = normaliseWhatsapp(input.whatsapp)
  const telegram = normaliseTelegram(input.telegram)
  const apelido = input.apelido.replace(/\s+/g, ' ').trim()

  const aErr = apelidoError(apelido)
  if (aErr) errors.apelido = aErr
  if (input.euSou === null || !Number.isInteger(input.euSou)) errors.euSou = AD_MESSAGES.euSou
  const cErr = cidadeError(cidade)
  if (cErr) errors.cidade = cErr
  const tErr = textoError(texto)
  if (tErr) errors.texto = tErr
  if (whatsapp && !isValidWhatsapp(whatsapp)) errors.whatsapp = AD_MESSAGES.whatsapp
  if (telegram && !isValidTelegram(telegram)) errors.telegram = AD_MESSAGES.telegram
  if (!whatsapp && !telegram) errors.contato = AD_MESSAGES.contato
  if (!input.consent) errors.consent = AD_MESSAGES.consent

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      apelido,
      euSou: input.euSou as number,
      cidade: cidade || null,
      cidadeBusca: cidade ? normaliseCidade(cidade) : null,
      texto,
      contato: { whatsapp, telegram },
    },
  }
}

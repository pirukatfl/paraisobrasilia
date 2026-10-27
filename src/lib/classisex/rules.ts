/**
 * ClassiSex ad rules (D-01 fields, D-02 limit). Same messages in the admin and on the site.
 * Pure module: no Payload/Next imports.
 */
import { redactContacts } from './redact'

export type AdStatus = 'pendente' | 'aprovado' | 'recusado' | 'despublicado' | 'rascunho'

/** M-04: an ad brought from the old site; private to its author and staff until the author sends it. */
export const DRAFT_STATUS = 'rascunho' as const

export const TEXT_MAX = 600
/**
 * Client decision 2026-10-22: ads brought from the old site are exempt from the 600-character limit and from
 * the contact field. When their author edits one, only this generous ceiling (abuse guard) applies.
 */
export const LEGACY_TEXT_MAX = 5000
/** Revisão 2026-10-20: public nickname shown in the open preview. */
export const APELIDO_MAX = 40
export const CIDADE_MAX = 60
/** Client request 2026-10-27: more contact fields (e-mail, links to other platforms, how they prefer to be contacted). */
export const LINKS_MAX = 5
export const LINK_MAX = 300
export const OBSERVACAO_MAX = 120
/** D-02: at most 3 ads "Em análise" or "Publicado" per subscriber. */
export const ACTIVE_LIMIT = 3
export const ACTIVE_STATUSES: AdStatus[] = ['pendente', 'aprovado']

export const AD_MESSAGES = {
  apelidoVazio: 'Escolha um apelido para o anúncio.',
  apelidoLongo: `O apelido pode ter até ${APELIDO_MAX} caracteres.`,
  apelidoContato: 'O apelido não pode ter telefone, e-mail, @ ou link. Use só um nome ou apelido.',
  textoVazio: 'Escreva o texto do anúncio.',
  textoLongo: `O texto pode ter até ${TEXT_MAX} caracteres.`,
  whatsapp: 'WhatsApp: só números, com 55 e DDD (ex.: 5561999889772).',
  telegram: 'Telegram: use o @ do seu usuário (5 a 32 letras, números ou _).',
  emailContato: 'E-mail de contato: informe um e-mail válido (ex.: nome@exemplo.com).',
  link: 'Link inválido. Use o endereço completo do perfil (ex.: https://instagram.com/seuperfil).',
  linksDemais: `Use até ${LINKS_MAX} links.`,
  observacaoLonga: `Como prefere o contato: até ${OBSERVACAO_MAX} caracteres.`,
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
  /** Contact e-mail shown to subscribers (not the visitor's own account e-mail, see VisitorExtras) */
  emailContato: string
  links: string[]
  observacao: string
  consent: boolean
}

export type AdContato = {
  whatsapp: string | null
  telegram: string | null
  email: string | null
  links: string[]
  observacao: string | null
}

/** The `contato` group as Payload stores it: links are rows of `{ url }`. */
export const contatoData = (c: AdContato) => ({ ...c, links: c.links.map((url) => ({ url })) })

export type NormalisedAd = {
  apelido: string
  euSou: number
  cidade: string | null
  cidadeBusca: string | null
  texto: string
  contato: AdContato
}

/** The contact e-mail error is `emailContato`: `email` belongs to the visitor's own address (VisitorErrors). */
export type AdErrors = Partial<Record<keyof AdInput, string>>

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

const EMAIL_CONTATO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_CONTATO_MAX = 254
const HAS_SCHEME_RE = /^[a-z][a-z0-9+.-]*:(?!\d)/i

/** Trimmed and lower-case; empty → null. */
export function normaliseEmailContato(value: string | null | undefined): string | null {
  const text = String(value ?? '').trim().toLowerCase()
  return text || null
}

export const isValidEmailContato = (v: string) => v.length <= EMAIL_CONTATO_MAX && EMAIL_CONTATO_RE.test(v)

/**
 * Trimmed; 'https://' is added when the scheme is missing. Other schemes (javascript:, data:…) are kept so
 * that isValidLink rejects them. Empty → null.
 */
export function normaliseLink(value: string | null | undefined): string | null {
  let text = String(value ?? '').trim()
  if (!text) return null
  if (text.startsWith('//')) text = text.slice(2)
  return HAS_SCHEME_RE.test(text) ? text : `https://${text}`
}

/** Only http(s) links with a real host (a dot), no spaces, no credentials, up to LINK_MAX characters. */
export function isValidLink(value: string): boolean {
  if (!value || value.length > LINK_MAX || /\s/.test(value)) return false
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false
  if (url.username || url.password) return false
  return url.hostname.includes('.') && !url.hostname.startsWith('.') && !url.hostname.endsWith('.')
}

/** One line, single spaces; empty → null. */
export function normaliseObservacao(value: string | null | undefined): string | null {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim()
  return text || null
}

/** Normalised links without empty or repeated entries (case-insensitive), in the order typed. */
export function normaliseLinks(values: readonly (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of values) {
    const link = normaliseLink(raw)
    if (!link) continue
    const key = link.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(link)
  }
  return out
}

/** First problem found in a list of links (already normalised), as one message; null when all are fine. */
export function linksError(links: readonly string[]): string | null {
  if (links.length > LINKS_MAX) return AD_MESSAGES.linksDemais
  const bad = links.find((l) => !isValidLink(l))
  return bad ? `${AD_MESSAGES.link} (${bad.length > 40 ? `${bad.slice(0, 40)}…` : bad})` : null
}

const PLATFORMS: [host: string, label: string][] = [
  ['instagram.com', 'Instagram'],
  ['x.com', 'X (Twitter)'],
  ['twitter.com', 'X (Twitter)'],
  ['onlyfans.com', 'OnlyFans'],
  ['privacy.com.br', 'Privacy'],
  ['fansly.com', 'Fansly'],
  ['tiktok.com', 'TikTok'],
  ['facebook.com', 'Facebook'],
  ['linktr.ee', 'Linktree'],
  ['reddit.com', 'Reddit'],
  ['t.me', 'Telegram'],
  ['youtube.com', 'YouTube'],
  ['closefans.com.br', 'CloseFans'],
  ['closefans.com', 'CloseFans'],
]

/** Button label of an ad link, from its domain ('m.facebook.com' → 'Facebook'); unknown sites show the host without 'www.'. */
export function platformLabel(url: string): string {
  let host: string
  try {
    host = new URL(url).hostname.toLowerCase()
  } catch {
    return url
  }
  const known = PLATFORMS.find(([domain]) => host === domain || host.endsWith(`.${domain}`))
  return known ? known[1] : host.replace(/^www\./, '')
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

export function textoError(texto: string, { legacy = false }: { legacy?: boolean } = {}): string | null {
  if (!texto.trim()) return AD_MESSAGES.textoVazio
  if (legacy) return texto.length > LEGACY_TEXT_MAX ? `O texto pode ter até ${LEGACY_TEXT_MAX} caracteres.` : null
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
  { legacy = false }: { legacy?: boolean } = {},
): { ok: true; value: NormalisedAd } | { ok: false; errors: AdErrors } {
  const errors: AdErrors = {}
  const texto = input.texto.replace(/\r\n/g, '\n').trim()
  const cidade = input.cidade.replace(/\s+/g, ' ').trim()
  const whatsapp = normaliseWhatsapp(input.whatsapp)
  const telegram = normaliseTelegram(input.telegram)
  const apelido = input.apelido.replace(/\s+/g, ' ').trim()
  const email = normaliseEmailContato(input.emailContato)
  const links = normaliseLinks(input.links)
  const observacao = normaliseObservacao(input.observacao)

  const aErr = apelidoError(apelido)
  if (aErr) errors.apelido = aErr
  if (input.euSou === null || !Number.isInteger(input.euSou)) errors.euSou = AD_MESSAGES.euSou
  const cErr = cidadeError(cidade)
  if (cErr) errors.cidade = cErr
  const tErr = textoError(texto, { legacy })
  if (tErr) errors.texto = tErr
  if (whatsapp && !isValidWhatsapp(whatsapp)) errors.whatsapp = AD_MESSAGES.whatsapp
  if (telegram && !isValidTelegram(telegram)) errors.telegram = AD_MESSAGES.telegram
  if (email && !isValidEmailContato(email)) errors.emailContato = AD_MESSAGES.emailContato
  const lErr = linksError(links)
  if (lErr) errors.links = lErr
  if (observacao && observacao.length > OBSERVACAO_MAX) errors.observacao = AD_MESSAGES.observacaoLonga
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
      contato: { whatsapp, telegram, email, links, observacao },
    },
  }
}

// ---------------------------------------------------------------------------------------------
// Ad sent WITHOUT an account (client decision 2026-10-23): same ad rules, plus e-mail and terms.
// ---------------------------------------------------------------------------------------------

export const EMAIL_MAX = 254

export const VISITOR_MESSAGES = {
  email: 'Informe um e-mail válido. Só a equipe vê.',
  termos: 'Aceite os Termos de Uso e a Política de Privacidade para enviar.',
  limite:
    'Este e-mail já tem 3 anúncios em análise ou publicados. Espere a análise ou crie uma conta para gerenciar seus anúncios.',
  envios: 'Muitos envios seguidos. Tente de novo mais tarde.',
} as const

const VISITOR_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Lower-case, no surrounding or inner spaces: the form in which the address is stored and compared. */
export const normaliseVisitorEmail = (value: unknown): string => String(value ?? '').replace(/\s+/g, '').toLowerCase()

export type VisitorExtras = { email: string; termos: boolean }
export type VisitorErrors = Partial<Record<'email' | 'termos', string>>

/** Optional e-mail (only staff see it) and terms. Returns only the errors found. */
export function validateVisitorExtras(input: VisitorExtras): VisitorErrors {
  const errors: VisitorErrors = {}
  const email = normaliseVisitorEmail(input.email)
  // The e-mail is optional (client 2026-10-23): checked only when given
  if (email && (email.length > EMAIL_MAX || !VISITOR_EMAIL_RE.test(email))) errors.email = VISITOR_MESSAGES.email
  if (!input.termos) errors.termos = VISITOR_MESSAGES.termos
  return errors
}

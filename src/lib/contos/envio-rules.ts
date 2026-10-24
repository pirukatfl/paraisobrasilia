/**
 * Rules of the open conto form (client decision 2026-10-24). Pure module: used by the form (client),
 * the route handler and the service, so the limits live in one place.
 */
import { redactContacts } from '../classisex/redact'
import { normaliseVisitorEmail, EMAIL_MAX } from '../classisex/rules'

export const TITLE_MIN = 3
export const TITLE_MAX = 160
export const ASSINADO_MAX = 60
export const TEXTO_MIN = 300
export const TEXTO_MAX = 30_000

export const CONTO_ENVIO_MESSAGES = {
  titulo: `Informe o título (de ${TITLE_MIN} a ${TITLE_MAX} caracteres), sem telefone, e-mail, @ ou link.`,
  assinado: `O apelido pode ter até ${ASSINADO_MAX} caracteres, sem telefone, e-mail, @ ou link.`,
  textoCurto: `O conto precisa de pelo menos ${TEXTO_MIN} caracteres.`,
  textoLongo: `O conto pode ter até ${TEXTO_MAX.toLocaleString('pt-BR')} caracteres.`,
  textoContato: 'O texto parece ter telefone, e-mail, @ ou link. Tire os contatos e envie de novo.',
  email: 'Informe um e-mail válido. Só a equipe vê.',
  consent:
    'Confirme que você tem 18 anos ou mais, que o conto é seu e que a imagem (se houver) é sua ou autorizada, sem nudez explícita e sem contatos.',
  termos: 'Aceite os Termos de Uso e a Política de Privacidade para enviar.',
  envios: 'Muitos envios seguidos. Tente de novo mais tarde.',
} as const

export const CONSENT_LABEL =
  'Tenho 18 anos ou mais, o conto é de minha autoria, e a imagem (se houver) é minha ou tenho autorização, sem nudez explícita e sem contatos.'

export type ContoEnvioInput = {
  title: string
  assinadoComo: string
  texto: string
  email: string
  consent: boolean
  termos: boolean
}

export type ContoEnvioValue = { title: string; assinadoComo: string | null; texto: string; email: string | null }
export type ContoEnvioErrors = Partial<Record<'title' | 'assinadoComo' | 'texto' | 'email' | 'consent' | 'termos', string>>

const VISITOR_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const hasContact = (text: string) => text.includes('@') || redactContacts(text).removed > 0

/** Normalises line endings and drops control characters (keeps \n). */
export const cleanTexto = (value: string) =>
  value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, '')
    .trim()

export function validateContoEnvio(
  input: ContoEnvioInput,
): { ok: true; value: ContoEnvioValue } | { ok: false; errors: ContoEnvioErrors } {
  const errors: ContoEnvioErrors = {}
  const title = input.title.replace(/\s+/g, ' ').trim()
  const assinadoComo = input.assinadoComo.replace(/\s+/g, ' ').trim()
  const texto = cleanTexto(input.texto)
  const email = normaliseVisitorEmail(input.email)

  if (title.length < TITLE_MIN || title.length > TITLE_MAX || hasContact(title)) errors.title = CONTO_ENVIO_MESSAGES.titulo
  if (assinadoComo && (assinadoComo.length > ASSINADO_MAX || hasContact(assinadoComo))) {
    errors.assinadoComo = CONTO_ENVIO_MESSAGES.assinado
  }
  if (texto.length < TEXTO_MIN) errors.texto = CONTO_ENVIO_MESSAGES.textoCurto
  else if (texto.length > TEXTO_MAX) errors.texto = CONTO_ENVIO_MESSAGES.textoLongo
  else if (hasContact(texto)) errors.texto = CONTO_ENVIO_MESSAGES.textoContato
  if (email && (email.length > EMAIL_MAX || !VISITOR_EMAIL_RE.test(email))) errors.email = CONTO_ENVIO_MESSAGES.email
  if (!input.consent) errors.consent = CONTO_ENVIO_MESSAGES.consent
  if (!input.termos) errors.termos = CONTO_ENVIO_MESSAGES.termos

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { title, assinadoComo: assinadoComo || null, texto, email: email || null } }
}

/** Plain text -> Lexical: blank line = paragraph, single newline = line break. Text nodes only, no markup. */
export function textoToLexical(texto: string) {
  const paragraphs = cleanTexto(texto)
    .split(/\n[^\S\n]*\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
  const children = paragraphs.map((part) => {
    const kids: Record<string, unknown>[] = []
    part.split('\n').forEach((line, i) => {
      if (i > 0) kids.push({ type: 'linebreak', version: 1 })
      if (line.trim()) kids.push({ type: 'text', text: line.trim(), format: 0, detail: 0, mode: 'normal', style: '', version: 1 })
    })
    return { type: 'paragraph', children: kids, direction: 'ltr', format: '', indent: 0, version: 1, textFormat: 0, textStyle: '' }
  })
  return { root: { type: 'root', children, direction: 'ltr' as const, format: '' as const, indent: 0 as const, version: 1 as const } }
}

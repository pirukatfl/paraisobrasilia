/**
 * Server-side contact removal for the public ClassiSex preview (PREV-01, D-04).
 *
 * T-04-01: public text never carries contacts; staff still review the result in the
 * moderation panel (04-03), because obfuscations ("nove nove…", numbers inside photos)
 * cannot be caught by a heuristic.
 *
 * Pure module: no Payload/Next imports.
 */
export const REDACTED_LABEL = '[contato só para assinantes]'

const TLD = '(?:com|net|org|br|me|ee|io|app|link|bio)'

// E-mails, including spaced and spelled forms: "casal @ gmail . com",
// "casal arroba gmail ponto com", "casal(at)gmail.com".
const EMAIL = new RegExp(
  String.raw`[\w.+-]+\s*(?:@|\(at\)|\[at\]|\barroba\b)\s*[\w-]+` +
    String.raw`(?:\s*(?:\.|\bponto\b)\s*[\w-]+)*?` +
    String.raw`\s*(?:\.|\bponto\b)\s*(?:com|net|org|br|me|io)\b` +
    String.raw`(?:\s*(?:\.|\bponto\b)\s*br\b)?`,
  'gi',
)

// URLs with scheme, www. hosts and bare domains with a known TLD (wa.me, t.me, linktr.ee …).
const URL_WITH_SCHEME = /\bhttps?:\/\/[^\s]*[^\s.,;:!?)\]]/gi
const URL_WWW = /\bwww\.[^\s]*[^\s.,;:!?)\]]/gi
const BARE_DOMAIN = new RegExp(
  String.raw`\b[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)*\.${TLD}\b(?:\/[^\s]*[^\s.,;:!?)\]])?`,
  'gi',
)

// Phone-like run: optional "+", optional "(", digits and separators; must hold ≥ 8 digits.
const PHONE_SRC = String.raw`\+?\(?\d[\d .()\-]{6,}\d`
const PHONE = new RegExp(PHONE_SRC, 'g')
const MIN_PHONE_DIGITS = 8

// Keyword handles: "insta: casalbsb", "tg casalbsb", "zap 61 99988-9772".
const STOPWORDS = '(?:e|ou|no|na|nos|do|da|de|me|te|pra|para|com|tambem|também|so|só)'
const KEYWORD_HANDLE = new RegExp(
  String.raw`\b(?:insta(?:gram)?|telegram|tg|zap(?:zap)?|whats(?:app)?|wpp|face(?:book)?)\b\s*:?\s*` +
    String.raw`(?:${PHONE_SRC}|(?!${STOPWORDS}\b)[A-Za-z0-9_](?:[A-Za-z0-9_.]*[A-Za-z0-9_])?)`,
  'gi',
)

// "@handle" not preceded by a word character (e-mails were removed before).
const AT_HANDLE = /(?<![\w.])@[A-Za-z0-9_](?:[A-Za-z0-9_.]{1,28}[A-Za-z0-9_])/g

const escaped = REDACTED_LABEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const REPEATED_LABELS = new RegExp(`${escaped}(?:[\\s/,;|\\-]*${escaped})+`, 'g')

function countDigits(value: string): number {
  let n = 0
  for (const ch of value) if (ch >= '0' && ch <= '9') n++
  return n
}

export function redactContacts(text: string): { text: string; removed: number } {
  if (!text) return { text: '', removed: 0 }
  let removed = 0
  const replaceAll = (input: string, pattern: RegExp, keep?: (match: string) => boolean) =>
    input.replace(pattern, (match) => {
      if (keep?.(match)) return match
      removed++
      return REDACTED_LABEL
    })

  let out = text
  out = replaceAll(out, EMAIL)
  out = replaceAll(out, URL_WITH_SCHEME)
  out = replaceAll(out, URL_WWW)
  out = replaceAll(out, BARE_DOMAIN)
  out = replaceAll(out, KEYWORD_HANDLE)
  out = replaceAll(out, AT_HANDLE)
  out = replaceAll(out, PHONE, (match) => countDigits(match) < MIN_PHONE_DIGITS)

  if (removed === 0) return { text, removed: 0 }

  out = out
    .replace(REPEATED_LABELS, REDACTED_LABEL)
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
  return { text: out, removed }
}

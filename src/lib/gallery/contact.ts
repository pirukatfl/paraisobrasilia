/** Link for a model's contact text: WhatsApp for phone numbers, Instagram for @handles, URL as is; else null. */
export function contactHref(raw: string): string | null {
  const text = raw.trim()
  const url = text.match(/https?:\/\/\S+/)
  if (url) return url[0]
  const handle = text.match(/(?:^|\s)@([\w.]{2,30})\b/)
  if (handle) return `https://instagram.com/${handle[1]}`
  const digits = text.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 13) return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`
  return null
}

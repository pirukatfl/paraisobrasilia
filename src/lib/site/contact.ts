/**
 * Contact data shown on every page (footer), on /contato and on the home.
 * Pure link builders: every outbound URL is assembled here with a fixed host (T-02-02),
 * never taken verbatim from staff input.
 */
export type ContactDTO = {
  addressLine: string
  addressDetail: string
  postalCode: string
  lat: number | null
  lng: number | null
  whatsapp: string
  phone: string
  email: string
  instagram: string | null
  hours: string | null
}

const digits = (value: string) => value.replace(/\D/g, '')

const hasCoords = (c: Pick<ContactDTO, 'lat' | 'lng'>): c is { lat: number; lng: number } =>
  typeof c.lat === 'number' && typeof c.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng)

/** "Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450" */
export function fullAddress(c: Pick<ContactDTO, 'addressLine' | 'addressDetail' | 'postalCode'>): string {
  const main = [c.addressLine, c.addressDetail].filter(Boolean).join(' — ')
  return c.postalCode ? `${main}, CEP ${c.postalCode}` : main
}

/** wa.me link; `text` pre-fills the message (encoded, never raw staff/visitor input in the URL). */
export function whatsappUrl(number: string, text?: string): string {
  const base = `https://wa.me/${digits(number)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

/** tel: link in international form (+55…) */
export function telUrl(number: string): string {
  return `tel:+${digits(number)}`
}

export function googleMapsUrl(c: ContactDTO): string {
  const dest = hasCoords(c) ? `${c.lat},${c.lng}` : encodeURIComponent(fullAddress(c))
  return `https://www.google.com/maps/dir/?api=1&destination=${dest}`
}

export function wazeUrl(c: ContactDTO): string {
  return hasCoords(c)
    ? `https://waze.com/ul?ll=${c.lat},${c.lng}&navigate=yes`
    : `https://waze.com/ul?q=${encodeURIComponent(fullAddress(c))}&navigate=yes`
}

/** Google Maps embed (no API key needed): same map on every device. */
export function googleMapsEmbedUrl(lat: number, lng: number): string {
  return `https://maps.google.com/maps?q=${lat},${lng}&z=16&hl=pt-BR&output=embed`
}

/** Opens the venue pin in Google Maps (large map). */
export function googleMapsLargeUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** Instagram profile URL, or null when no handle is set (D-04: hidden when empty). */
export function instagramUrl(handle: string | null | undefined): string | null {
  const clean = (handle ?? '').trim().replace(/^@/, '')
  return clean ? `https://www.instagram.com/${clean}/` : null
}

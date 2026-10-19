import type { Payload, PayloadRequest } from 'payload'

/** Initial "Contato e endereço" values (02-CONTENT.md §2; D-01..D-03). Coordinates from the old site — client to confirm. */
export const CONTACT_SEED = {
  addressLine: 'Rua 15, Travessa 01, Chácara 02',
  addressDetail: 'Núcleo Rural Lago Oeste, Sobradinho – DF',
  postalCode: '73100-450',
  lat: -15.5936421,
  lng: -47.9771526,
  whatsapp: '5561999889772',
  phone: '(61) 99988-9772',
  email: 'suporte@swingbrasilia.com.br',
  instagram: '',
  hours: 'Abrimos às 22h e seguimos até por volta das 5h.',
}

/** Fills the contact global only when it was never filled (staff edits are never overwritten). */
export async function seedContactIfEmpty(payload: Payload, req?: Partial<PayloadRequest>): Promise<boolean> {
  const current = await payload.findGlobal({ slug: 'contact', depth: 0, overrideAccess: true, req })
  if (current?.addressLine) return false
  await payload.updateGlobal({ slug: 'contact', data: CONTACT_SEED, overrideAccess: true, req })
  return true
}

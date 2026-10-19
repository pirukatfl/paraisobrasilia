import { describe, expect, it } from 'vitest'

import {
  type ContactDTO,
  fullAddress,
  googleMapsUrl,
  instagramUrl,
  osmEmbedUrl,
  osmLargeMapUrl,
  telUrl,
  wazeUrl,
  whatsappUrl,
} from '../../src/lib/site/contact'

const CONTACT: ContactDTO = {
  addressLine: 'Rua 15, Travessa 01, Chácara 02',
  addressDetail: 'Núcleo Rural Lago Oeste, Sobradinho – DF',
  postalCode: '73100-450',
  lat: -15.5936421,
  lng: -47.9771526,
  whatsapp: '5561999889772',
  phone: '(61) 99988-9772',
  email: 'suporte@swingbrasilia.com.br',
  instagram: null,
  hours: 'Abrimos às 22h e seguimos até por volta das 5h.',
}
const NO_COORDS = { ...CONTACT, lat: null, lng: null }

describe('contact link builders (INST-02, INST-03)', () => {
  it('builds the full address', () => {
    expect(fullAddress(CONTACT)).toBe(
      'Rua 15, Travessa 01, Chácara 02 — Núcleo Rural Lago Oeste, Sobradinho – DF, CEP 73100-450',
    )
  })

  it('builds WhatsApp and tel links with digits only', () => {
    expect(whatsappUrl('5561999889772')).toBe('https://wa.me/5561999889772')
    expect(whatsappUrl('+55 (61) 99988-9772')).toBe('https://wa.me/5561999889772')
    expect(whatsappUrl('5561999889772', 'Olá! Quero assinar o plano Mensal.')).toBe(
      'https://wa.me/5561999889772?text=Ol%C3%A1!%20Quero%20assinar%20o%20plano%20Mensal.',
    )
    expect(telUrl('5561999889772')).toBe('tel:+5561999889772')
  })

  it('Google Maps directions use coordinates, else the address', () => {
    expect(googleMapsUrl(CONTACT)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-15.5936421,-47.9771526',
    )
    expect(googleMapsUrl(NO_COORDS)).toBe(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress(CONTACT))}`,
    )
  })

  it('Waze navigation uses coordinates, else the address', () => {
    expect(wazeUrl(CONTACT)).toBe('https://waze.com/ul?ll=-15.5936421,-47.9771526&navigate=yes')
    expect(wazeUrl(NO_COORDS)).toBe(
      `https://waze.com/ul?q=${encodeURIComponent(fullAddress(CONTACT))}&navigate=yes`,
    )
  })

  it('OpenStreetMap embed and large map', () => {
    const url = osmEmbedUrl(-15.5936421, -47.9771526)
    expect(url.startsWith('https://www.openstreetmap.org/export/embed.html?bbox=')).toBe(true)
    expect(url).toContain('&marker=-15.5936421,-47.9771526')
    expect(osmLargeMapUrl(-15.5936421, -47.9771526)).toBe(
      'https://www.openstreetmap.org/?mlat=-15.5936421&mlon=-47.9771526#map=16/-15.5936421/-47.9771526',
    )
  })

  it('Instagram only when a handle is set (D-04)', () => {
    expect(instagramUrl(null)).toBeNull()
    expect(instagramUrl('')).toBeNull()
    expect(instagramUrl('paraiso.bsb')).toBe('https://www.instagram.com/paraiso.bsb/')
  })
})

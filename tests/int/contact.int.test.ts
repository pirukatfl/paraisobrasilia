import type { Payload } from 'payload'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { getContact } from '../../src/lib/site/queries'
import { getTestPayload, resetDatabase, seedContact, seedStaffUser } from '../helpers/seed'

describe('contact global (INST-02, INST-03, PAINEL-04, T-02-01/02)', () => {
  let payload: Payload
  let staff: Awaited<ReturnType<typeof seedStaffUser>>

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    await seedContact(payload)
    staff = await seedStaffUser(payload, { email: 'contato@teste.local', password: 'senha-de-teste-123' })
  })

  afterAll(async () => {
    await seedContact(payload)
  })

  it('anonymous visitors read the seeded contact', async () => {
    const doc = await payload.findGlobal({ slug: 'contact', overrideAccess: false })
    expect(doc.addressLine).toBe('Rua 15, Travessa 01, Chácara 02')
    expect(doc.addressDetail).toBe('Núcleo Rural Lago Oeste, Sobradinho – DF')
    expect(doc.whatsapp).toBe('5561999889772')
    expect(doc.email).toBe('suporte@swingbrasilia.com.br')
    expect(doc.instagram ?? '').toBe('')
  })

  it('anonymous visitors cannot change it', async () => {
    await expect(
      payload.updateGlobal({ slug: 'contact', overrideAccess: false, data: { whatsapp: '5511999999999' } }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('rejects malformed WhatsApp, Instagram and coordinates', async () => {
    const asStaff = (data: Record<string, unknown>) =>
      payload.updateGlobal({ slug: 'contact', overrideAccess: false, user: staff, data: data as never })
    await expect(asStaff({ whatsapp: '123' })).rejects.toThrow()
    await expect(asStaff({ instagram: '@bad handle' })).rejects.toThrow()
    await expect(asStaff({ lat: 200 })).rejects.toThrow()
    const ok = await asStaff({ instagram: 'paraiso.bsb' })
    expect(ok.instagram).toBe('paraiso.bsb')
  })

  it('getContact() returns the DTO', async () => {
    await seedContact(payload)
    const contact = await getContact()
    expect(contact.lat).toBe(-15.5936421)
    expect(contact.lng).toBe(-47.9771526)
    expect(contact.instagram).toBeNull()
    expect(contact.hours).toContain('22h')
  })

  it('the migration seed filled the global (idempotent)', async () => {
    const { seedContactIfEmpty } = await import('../../src/migrations/seed/contact-content')
    expect(await seedContactIfEmpty(payload)).toBe(false)
  })
})

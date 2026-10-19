import path from 'path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, seedAssinante, seedModel, seedParty, seedStaffUser } from '../helpers/seed'

/**
 * T-03-01 regression: a logged-in subscriber (collection `assinantes`) must never pass a staff
 * check. Every call runs with overrideAccess: false and the subscriber as principal; the same
 * calls with the staff principal are the control.
 */
const DENIED = /permiss|forbidden|not allowed/i
const FLYER = path.resolve('tests/fixtures/flyer-square.jpg')

describe('role-safe access (T-03-01)', () => {
  let payload: Payload
  let sub: Record<string, unknown> & { collection: 'assinantes' }
  let staff: Record<string, unknown> & { collection: 'users' }

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    const s = await seedAssinante(payload, { email: 'sub@teste.local', password: 'senha-assinante-1', name: 'Sub Teste' })
    sub = { ...(s as unknown as Record<string, unknown>), collection: 'assinantes' }
    const u = await seedStaffUser(payload, { email: 'staff-roles@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    await seedParty(payload, { title: 'Festa Publicada Roles', startsAt: '2026-11-25T02:00:00.000Z' })
    await seedParty(payload, { title: 'Festa Rascunho Roles', startsAt: '2026-11-26T02:00:00.000Z', status: 'draft' })
    await seedModel(payload, { name: 'Modelo Roles', photoCount: 1, authorization: { note: 'nota privada' } })
  })

  it('subscriber cannot create on any content collection', async () => {
    const as = { overrideAccess: false, user: sub as never }
    await expect(
      payload.create({
        collection: 'parties',
        ...as,
        data: { title: 'Invasão', startsAt: '2026-11-25T02:00:00.000Z', flyerFormat: 'square' } as never,
      }),
    ).rejects.toThrow(DENIED)
    await expect(payload.create({ collection: 'pages', ...as, data: { title: 'x' } as never })).rejects.toThrow(DENIED)
    await expect(payload.create({ collection: 'models', ...as, data: { name: 'x' } as never })).rejects.toThrow(DENIED)
    await expect(
      payload.create({ collection: 'space-items', ...as, data: { kind: 'photo' } as never }),
    ).rejects.toThrow(DENIED)
    await expect(
      payload.create({ collection: 'media', ...as, data: { alt: 'x' }, filePath: FLYER }),
    ).rejects.toThrow(DENIED)
    await expect(
      payload.create({ collection: 'videos', ...as, data: { title: 'x' } as never, filePath: FLYER }),
    ).rejects.toThrow(DENIED)
  })

  it('subscriber reads only published parties', async () => {
    const { docs } = await payload.find({ collection: 'parties', overrideAccess: false, user: sub as never })
    expect(docs.map((d) => d.title)).toEqual(['Festa Publicada Roles'])
  })

  it('subscriber cannot list staff users', async () => {
    const res = await payload
      .find({ collection: 'users', overrideAccess: false, user: sub as never })
      .catch((e: Error) => e)
    if (res instanceof Error) expect(res.message).toMatch(DENIED)
    else expect(res.docs).toHaveLength(0)
  })

  it('subscriber cannot update the contact global', async () => {
    await expect(
      payload.updateGlobal({ slug: 'contact', overrideAccess: false, user: sub as never, data: { whatsapp: '5561000000000' } as never }),
    ).rejects.toThrow(DENIED)
  })

  it('subscriber never sees image authorization notes', async () => {
    const { docs } = await payload.find({ collection: 'models', overrideAccess: false, user: sub as never })
    expect(docs.length).toBeGreaterThan(0)
    for (const doc of docs) expect(doc).not.toHaveProperty('imageAuthorization')
  })

  it('subscriber cannot create subscriber accounts', async () => {
    await expect(
      payload.create({
        collection: 'assinantes',
        overrideAccess: false,
        user: sub as never,
        data: { email: 'outro@teste.local', password: 'senha-outra-123', name: 'Outro' },
      }),
    ).rejects.toThrow(DENIED)
  })

  it('staff principal passes the same checks (control)', async () => {
    const as = { overrideAccess: false, user: staff as never }
    const parties = await payload.find({ collection: 'parties', ...as, draft: true })
    expect(parties.docs.map((d) => d.title).sort()).toEqual(['Festa Publicada Roles', 'Festa Rascunho Roles'])
    const users = await payload.find({ collection: 'users', ...as })
    expect(users.docs.length).toBeGreaterThan(0)
    const models = await payload.find({ collection: 'models', ...as })
    expect(models.docs[0]).toHaveProperty('imageAuthorization')
    const media = await payload.create({ collection: 'media', ...as, data: { alt: 'Controle' }, filePath: FLYER })
    expect(media.id).toBeTruthy()
    const created = await payload.create({
      collection: 'assinantes',
      ...as,
      data: { email: 'criado-pela-equipe@teste.local', password: 'senha-provisoria-1', name: 'Criado' },
    })
    expect(created.id).toBeTruthy()
  })
})

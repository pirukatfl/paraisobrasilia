import path from 'path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getPublishedModels, hasPublishedModels, toModelDTO } from '../../src/lib/gallery/queries'
import type { Model } from '../../src/payload-types'
import { getTestPayload, resetDatabase, seedModel } from '../helpers/seed'

const FIXTURE = path.resolve('tests/fixtures/flyer-square.jpg')

describe('models (MIDIA-02, D-08, D-09, T-02-06/10/11)', () => {
  let payload: Payload
  let photoIds: number[]

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    photoIds = []
    for (let i = 0; i < 4; i++) {
      const media = await payload.create({ collection: 'media', data: { alt: `foto ${i}` }, filePath: FIXTURE, overrideAccess: true })
      photoIds.push(media.id)
    }
  })

  it('rejects a 4th photo with the Portuguese message, and zero photos', async () => {
    const error = await payload
      .create({
        collection: 'models',
        overrideAccess: true,
        data: { name: 'Quatro', photos: photoIds.map((image) => ({ image })), _status: 'published' },
      })
      .then(() => null, (err: unknown) => err as { data?: { errors?: { message: string }[] } })
    expect(error).not.toBeNull()
    // Field error shown to staff in the panel
    expect(error?.data?.errors?.map((e) => e.message)).toContain('Cada modelo pode ter no máximo 3 fotos.')
    await expect(
      payload.create({ collection: 'models', overrideAccess: true, data: { name: 'Nenhuma', photos: [], _status: 'published' } }),
    ).rejects.toThrow()
  })

  it('publishes with 3 photos and no image authorization', async () => {
    const model = await payload.create({
      collection: 'models',
      overrideAccess: true,
      data: { name: 'Três', photos: photoIds.slice(0, 3).map((image) => ({ image })), _status: 'published' },
    })
    expect(model._status).toBe('published')
  })

  it('hasPublishedModels follows publication; anonymous reads hide drafts and the authorization', async () => {
    await resetDatabase(payload)
    await seedModel(payload, { name: 'Rascunho', photoCount: 1, published: false, authorization: { note: 'nota privada' } })
    expect(await hasPublishedModels()).toBe(false)

    await seedModel(payload, { name: 'Aurora', photoCount: 3, authorization: { date: '2026-10-12T12:00:00.000Z', note: 'enviou por WhatsApp' } })
    expect(await hasPublishedModels()).toBe(true)

    const { docs } = await payload.find({ collection: 'models', overrideAccess: false, depth: 0 })
    expect(docs.map((d) => d.name)).toEqual(['Aurora'])
    expect(docs[0]).not.toHaveProperty('imageAuthorization')

    const models = await getPublishedModels()
    expect(models).toHaveLength(1)
    expect(models[0].name).toBe('Aurora')
    expect(models[0].photos).toHaveLength(3)
    expect(models[0].photos[0].thumbUrl).toMatch(/\.webp$/)
  })

  it('anonymous visitors cannot create or update models', async () => {
    await expect(
      payload.create({ collection: 'models', overrideAccess: false, data: { name: 'x', photos: [{ image: photoIds[0] }] } }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('photo alt falls back to "{name} — modelo do Paraíso Brasília"', () => {
    const dto = toModelDTO({
      id: 1,
      name: 'Luna',
      photos: [{ image: { id: 9, alt: '', url: '/api/media/file/x.webp', width: 800, height: 1000 } }],
    } as unknown as Model)
    expect(dto?.photos[0].alt).toBe('Luna — modelo do Paraíso Brasília')
  })
})

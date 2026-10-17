import path from 'path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getAllPartySlugs, getPartyBySlug, getUpcomingParties } from '../../src/lib/parties/queries'
import { getTestPayload, resetDatabase, seedParty } from '../helpers/seed'

const NOW = new Date('2026-10-20T15:00:00.000Z')

describe('published-only public access (PAINEL-01, FEST-04, T-01-25/26)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    await seedParty(payload, { title: 'Festa Publicada', startsAt: '2026-10-25T02:00:00.000Z' })
    await seedParty(payload, { title: 'Festa Rascunho', startsAt: '2026-10-26T02:00:00.000Z', status: 'draft' })
  })

  it('anonymous Local API reads only published parties', async () => {
    const { docs } = await payload.find({ collection: 'parties', overrideAccess: false })
    expect(docs.map((d) => d.title)).toEqual(['Festa Publicada'])
  })

  it('anonymous users cannot create parties, media or staff users', async () => {
    await expect(
      payload.create({
        collection: 'parties',
        overrideAccess: false,
        data: { title: 'Invasão', startsAt: '2026-10-25T02:00:00.000Z', flyerFormat: 'square' } as never,
      }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
    await expect(
      payload.create({
        collection: 'media',
        overrideAccess: false,
        data: { alt: 'x' },
        filePath: path.resolve('tests/fixtures/flyer-square.jpg'),
      }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
    await expect(
      payload.create({
        collection: 'users',
        overrideAccess: false,
        data: { email: 'intruso@teste.local', password: 'x-123456789' },
      }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('public queries never return drafts', async () => {
    expect((await getUpcomingParties(NOW)).map((p) => p.title)).toEqual(['Festa Publicada'])
    expect(await getAllPartySlugs()).toEqual(['festa-publicada'])
    expect(await getPartyBySlug('festa-rascunho', NOW)).toBeNull()
    expect((await getPartyBySlug('festa-publicada', NOW))?.title).toBe('Festa Publicada')
  })
})

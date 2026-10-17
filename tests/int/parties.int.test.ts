import path from 'path'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

import { getUpcomingParties } from '../../src/lib/parties/queries'
import { getTestPayload, resetDatabase, seedParty } from '../helpers/seed'

const NOW = new Date('2026-10-20T15:00:00.000Z')

describe('getUpcomingParties (FEST-01, FEST-04)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    // later party first, to prove sorting
    await seedParty(payload, { title: 'Festa Futura B', startsAt: '2026-10-31T02:00:00.000Z', flyerFormat: 'square' })
    await seedParty(payload, { title: 'Festa Futura A', startsAt: '2026-10-25T02:00:00.000Z', flyerFormat: 'portrait' })
    await seedParty(payload, {
      title: 'Festa Encerrada',
      startsAt: '2026-10-19T02:00:00.000Z',
      endsAt: '2026-10-19T12:00:00.000Z',
    })
    // draft parties exist only from plan 01-09 (versions.drafts); seeded there
  })

  it('returns only parties that have not ended, soonest first, with flyer data', async () => {
    const parties = await getUpcomingParties(NOW)
    expect(parties.map((p) => p.title)).toEqual(['Festa Futura A', 'Festa Futura B'])

    const [a, b] = parties
    expect(a.slug).toBe('festa-futura-a')
    expect(a.flyerFormat).toBe('portrait')
    expect(a.endsAt).toBe('2026-10-25T12:00:00.000Z') // default +10 h
    expect(a.flyer.url).toMatch(/^\/api\/media\/file\/.+/)
    expect(a.flyer.width).toBe(1080)
    expect(a.flyer.height).toBe(1350)
    expect(a.flyer.alt.length).toBeGreaterThan(0)
    expect(b.flyer.width).toBe(1080)
    expect(b.flyer.height).toBe(1080)
  })
  it('stores a 1200x630 JPEG share image for each flyer (og size)', async () => {
    const { docs } = await payload.find({ collection: 'media', limit: 1, sort: '-createdAt' })
    const og = docs[0].sizes?.og
    expect(og?.width).toBe(1200)
    expect(og?.height).toBe(630)
    expect(og?.mimeType).toBe('image/jpeg')
    const meta = await sharp(path.resolve('media', og!.filename!)).metadata()
    expect([meta.format, meta.width, meta.height]).toEqual(['jpeg', 1200, 630])
  })
})

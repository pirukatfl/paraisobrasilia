import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getTestPayload, resetDatabase, seedParty } from '../helpers/seed'

// Client report 2026-11-03: parties with an end before the start vanished from the agenda.
describe('party end must be after start (painel)', () => {
  let payload: Payload
  let id: number | string

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    const party = await seedParty(payload, { title: 'Festa Datas', startsAt: '2026-11-07T01:00:00.000Z' })
    id = party.id
  })

  it('refuses to create a party whose end is before its start', async () => {
    await expect(
      seedParty(payload, {
        title: 'Festa Invertida',
        startsAt: '2026-11-07T01:00:00.000Z',
        endsAt: '2026-11-06T08:00:00.000Z',
      }),
    ).rejects.toThrow(/término/i)
  })

  it('refuses an edit that moves the end before the start (only the end sent)', async () => {
    await expect(
      payload.update({ collection: 'parties', id, data: { endsAt: '2026-11-06T08:00:00.000Z' } }),
    ).rejects.toThrow(/término/i)
  })

  it('refuses an edit that moves the start after the end', async () => {
    await payload.update({ collection: 'parties', id, data: { endsAt: '2026-11-07T08:00:00.000Z' } })
    await expect(
      payload.update({ collection: 'parties', id, data: { startsAt: '2026-11-08T01:00:00.000Z' } }),
    ).rejects.toThrow(/término/i)
  })

  it('still accepts an empty end (automatic +10 h) and a valid end', async () => {
    const ok = await payload.update({ collection: 'parties', id, data: { endsAt: '2026-11-07T09:00:00.000Z' } })
    expect(ok.endsAt).toBe('2026-11-07T09:00:00.000Z')
  })
})

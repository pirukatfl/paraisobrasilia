import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { getExpiringSoon } from '../../src/lib/assinantes/service'
import { getTestPayload, resetDatabase, seedAssinante, seedSubscription } from '../helpers/seed'

const NOW = new Date('2026-11-10T15:00:00.000Z')

describe('getExpiringSoon — "Vencem nos próximos 7 dias" (PAINEL-06)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
  })

  const withPeriods = async (
    name: string,
    periods: { startsAt: string; endsAt: string; status?: 'ativa' | 'encerrada' }[],
    whatsapp?: string,
  ) => {
    const acc = await seedAssinante(payload, {
      email: `${name.toLowerCase()}@teste.local`,
      password: 'senha-teste-1234',
      name,
      ...(whatsapp ? { whatsapp } : {}),
    })
    for (const p of periods) await seedSubscription(payload, { assinanteId: acc.id, ...p })
    return acc
  }

  it('lists only accounts ending within 7 days, soonest first', async () => {
    const amanha = await withPeriods('Amanha', [{ startsAt: '2026-10-12T03:00:00.000Z', endsAt: '2026-11-11T03:00:00.000Z' }], '5561988887777')
    const semana = await withPeriods('Semana', [{ startsAt: '2026-10-18T03:00:00.000Z', endsAt: '2026-11-17T03:00:00.000Z' }])
    await withPeriods('Depois', [{ startsAt: '2026-10-19T03:00:00.000Z', endsAt: '2026-11-18T03:00:00.000Z' }])
    await withPeriods('Venceu', [{ startsAt: '2026-10-11T03:00:00.000Z', endsAt: '2026-11-10T03:00:00.000Z' }])
    await withPeriods('Renovou', [
      { startsAt: '2026-10-14T03:00:00.000Z', endsAt: '2026-11-13T03:00:00.000Z' },
      { startsAt: '2026-11-13T03:00:00.000Z', endsAt: '2026-12-18T03:00:00.000Z' },
    ])
    await withPeriods('Encerrada', [
      { startsAt: '2026-10-15T03:00:00.000Z', endsAt: '2026-11-14T03:00:00.000Z', status: 'encerrada' },
    ])

    const rows = await getExpiringSoon(payload, NOW, 7)
    expect(rows.map((r) => r.id)).toEqual([amanha.id, semana.id])
    expect(rows[0]).toMatchObject({
      name: 'Amanha',
      whatsapp: '5561988887777',
      daysLeft: 1,
      validUntilLabel: '10 de novembro de 2026',
    })
    expect(new Date(rows[0].accessUntil).toISOString()).toBe('2026-11-11T03:00:00.000Z')
    expect(rows[1]).toMatchObject({ name: 'Semana', whatsapp: null, daysLeft: 7 })
  })

  it('returns an empty list when nobody expires', async () => {
    await withPeriods('Longe', [{ startsAt: '2026-11-01T03:00:00.000Z', endsAt: '2027-01-01T03:00:00.000Z' }])
    expect(await getExpiringSoon(payload, NOW, 7)).toEqual([])
  })
})

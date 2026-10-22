import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { clampPage, PAGE_SIZE } from '../../src/lib/classisex/board'
import { loadMoreAds } from '../../src/lib/classisex/more'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedSubscription } from '../helpers/seed'

const NOW = new Date()
const DAY = 86_400_000

describe('ClassiSex infinite scroll reads', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const author = await seedAssinante(payload, { email: 'autor@teste.local', password: 'senha-autor-1234', name: 'Autor' })
    await seedSubscription(payload, {
      assinanteId: author.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 30 * DAY).toISOString(),
    })
    for (let i = 0; i < PAGE_SIZE + 3; i++) {
      await seedAd(payload, {
        author: author.id,
        status: 'aprovado',
        apelido: `Anuncio ${i}`,
        texto: 'Chama no zap 61 98877-6655 hoje.',
        contato: { whatsapp: '5561988776655', telegram: 'tg_secreto' },
        publishedAt: new Date(NOW.getTime() - i * 60_000).toISOString(),
      })
    }
  })

  it('clamps the page number', () => {
    expect(clampPage(undefined)).toBe(1)
    expect(clampPage('abc')).toBe(1)
    expect(clampPage(-4)).toBe(1)
    expect(clampPage(0)).toBe(1)
    expect(clampPage('3')).toBe(3)
    expect(clampPage(99999999)).toBe(1000)
  })

  it('without an active subscription returns only redacted public DTOs', async () => {
    const r = await loadMoreAds(payload, false, { page: 2, cidade: 'Brasília' }, NOW)
    expect(r.audience).toBe('publico')
    expect(r.page).toBe(2)
    expect(r.totalPages).toBe(2)
    expect(r.items).toHaveLength(3)
    const json = JSON.stringify(r)
    for (const secret of ['98877', 'tg_secreto', '5561988776655', 'contato"']) expect(json).not.toContain(secret)
    expect(r.items[0]).not.toHaveProperty('contato')
  })

  it('with an active subscription returns members DTOs with contacts', async () => {
    const r = await loadMoreAds(payload, true, { page: 1 }, NOW)
    expect(r.audience).toBe('membros')
    expect(r.items).toHaveLength(PAGE_SIZE)
    expect(r.items[0]).toHaveProperty('contato')
  })

  it('clamps hostile page values and returns an empty page past the end', async () => {
    expect((await loadMoreAds(payload, false, { page: -5 }, NOW)).page).toBe(1)
    expect((await loadMoreAds(payload, false, { page: 'x' }, NOW)).page).toBe(1)
    const far = await loadMoreAds(payload, false, { page: 10 ** 9 }, NOW)
    expect(far.page).toBe(1000)
    expect(far.items).toHaveLength(0)
  })
})

import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { findPublishedConto, findPublishedContos, findPublishedContoSlugs } from '@/lib/contos/reads'

import { getTestPayload, resetDatabase, seedConto } from '../helpers/seed'

describe('contos reads (PREV-03)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    for (let i = 1; i <= 22; i++) {
      await seedConto(payload, {
        title: `Conto ${String(i).padStart(2, '0')}`,
        slug: `conto-${String(i).padStart(2, '0')}`,
        publishedAt: new Date(Date.UTC(2025, 0, i, 12)).toISOString(),
      })
    }
    await seedConto(payload, { title: 'Rascunho', slug: 'rascunho', status: 'draft', publishedAt: '2026-01-01T12:00:00.000Z' })
  })

  it('never returns drafts and sorts newest first', async () => {
    const page1 = await findPublishedContos(payload, { page: 1 })
    expect(page1.totalDocs).toBe(22)
    expect(page1.items).toHaveLength(20)
    expect(page1.items[0]!.slug).toBe('conto-22')
    expect(page1.items.map((c) => c.slug)).not.toContain('rascunho')
    expect(page1.totalPages).toBe(2)
  })

  it('paginates by 20', async () => {
    const page2 = await findPublishedContos(payload, { page: 2 })
    expect(page2.items.map((c) => c.slug)).toEqual(['conto-02', 'conto-01'])
  })

  it('a draft slug is null and a published slug is found', async () => {
    expect(await findPublishedConto(payload, 'rascunho')).toBeNull()
    expect((await findPublishedConto(payload, 'conto-05'))?.title).toBe('Conto 05')
  })

  it('lists published slugs for the sitemap', async () => {
    const slugs = await findPublishedContoSlugs(payload)
    expect(slugs).toHaveLength(22)
    expect(slugs.map((s) => s.slug)).not.toContain('rascunho')
  })
})

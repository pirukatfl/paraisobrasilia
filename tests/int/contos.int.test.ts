import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { expectFieldError } from '../helpers/errors'
import { getTestPayload, lexicalParagraphs, resetDatabase, seedAssinante, seedConto, seedStaffUser } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i

describe('contos collection (PAINEL-03, PREV-03, T-05-01)', () => {
  let payload: Payload
  let sub: Record<string, unknown> & { collection: 'assinantes' }
  let staff: Record<string, unknown> & { collection: 'users' }

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    const s = await seedAssinante(payload, { email: 'sub-contos@teste.local', password: 'senha-assinante-1', name: 'Sub Contos' })
    sub = { ...(s as unknown as Record<string, unknown>), collection: 'assinantes' }
    const u = await seedStaffUser(payload, { email: 'staff-contos@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  const create = (data: Record<string, unknown>) =>
    payload.create({
      collection: 'contos',
      overrideAccess: false,
      user: staff as never,
      data: {
        title: 'Conto de teste',
        publishedAt: '2025-06-01T12:00:00.000Z',
        texto: lexicalParagraphs(['a', 'b', 'c', 'd']),
        _status: 'published',
        ...data,
      } as never,
    })

  it('nobody but staff can read or write contos, drafts or versions through the API', async () => {
    const seeded = await seedConto(payload, { title: 'Conto fechado', slug: 'conto-fechado' })
    await seedConto(payload, { title: 'Conto em rascunho', slug: 'conto-rascunho', status: 'draft' })
    const principals: (Record<string, unknown> | undefined)[] = [undefined, sub]
    for (const user of principals) {
      const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
      await expect(payload.find({ collection: 'contos', ...as })).rejects.toThrow(DENIED)
      await expect(payload.find({ collection: 'contos', draft: true, ...as })).rejects.toThrow(DENIED)
      await expect(payload.findByID({ collection: 'contos', id: seeded.id, ...as })).rejects.toThrow(DENIED)
      await expect(payload.findVersions({ collection: 'contos', ...as })).rejects.toThrow(DENIED)
      await expect(
        payload.create({ collection: 'contos', ...as, data: { title: 'x', slug: 'x' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(
        payload.update({ collection: 'contos', id: seeded.id, ...as, data: { title: 'y' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(payload.delete({ collection: 'contos', id: seeded.id, ...as })).rejects.toThrow(DENIED)
    }
    const staffAs = { overrideAccess: false, user: staff as never }
    expect((await payload.find({ collection: 'contos', ...staffAs })).totalDocs).toBe(2)
    expect((await payload.findVersions({ collection: 'contos', ...staffAs })).totalDocs).toBeGreaterThan(0)
    const updated = await payload.update({
      collection: 'contos',
      id: seeded.id,
      ...staffAs,
      data: { title: 'Conto fechado (editado)', _status: 'published' } as never,
    })
    expect(updated.title).toBe('Conto fechado (editado)')
  })

  it('fills the slug from the title and defaults paragrafosAbertos to 3', async () => {
    const doc = await create({ title: 'Conto da Maçã Dourada' })
    expect(doc.slug).toBe('conto-da-maca-dourada')
    expect(doc.paragrafosAbertos).toBe(3)
  })

  it('rejects duplicate and invalid slugs with pt messages', async () => {
    await create({ title: 'Primeiro', slug: 'repetido' })
    await expectFieldError(create({ title: 'Segundo', slug: 'repetido' }), 'Já existe um conto com este endereço.')
    await expectFieldError(create({ title: 'Terceiro', slug: 'Com Espaço' }), 'Use só letras minúsculas, números e hífens.')
  })

  it('limits paragrafosAbertos to 1..20 and requires the publication date', async () => {
    await expectFieldError(create({ title: 'Zero', slug: 'zero', paragrafosAbertos: 0 }), 'Escolha de 1 a 20 parágrafos.')
    await expectFieldError(create({ title: 'Vinte e um', slug: 'vinte-e-um', paragrafosAbertos: 21 }), 'Escolha de 1 a 20 parágrafos.')
    await expectFieldError(
      create({ title: 'Sem data', slug: 'sem-data', publishedAt: undefined }),
      'Informe a data de publicação.',
    )
  })

  it('rejects a duplicate wpId', async () => {
    await create({ title: 'Importado 1', slug: 'importado-1', wpId: 9001 })
    await expect(create({ title: 'Importado 2', slug: 'importado-2', wpId: 9001 })).rejects.toThrow()
  })

  it('keeps drafts out of published queries', async () => {
    await seedConto(payload, { title: 'Só rascunho', slug: 'so-rascunho', status: 'draft' })
    const published = await payload.find({
      collection: 'contos',
      where: { and: [{ _status: { equals: 'published' } }, { slug: { equals: 'so-rascunho' } }] },
      draft: false,
      overrideAccess: true,
    })
    expect(published.totalDocs).toBe(0)
    const all = await payload.find({
      collection: 'contos',
      where: { slug: { equals: 'so-rascunho' } },
      draft: true,
      overrideAccess: true,
    })
    expect(all.totalDocs).toBe(1)
  })
})

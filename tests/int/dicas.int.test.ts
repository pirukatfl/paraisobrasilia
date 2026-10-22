import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { expectFieldError } from '../helpers/errors'
import { getTestPayload, lexicalParagraphs, resetDatabase, seedAssinante, seedDica, seedStaffUser } from '../helpers/seed'

const DENIED = /permiss|forbidden|not allowed/i

describe('dicas collection (quick dicas-hot, DH-05, T-DH-01)', () => {
  let payload: Payload
  let sub: Record<string, unknown> & { collection: 'assinantes' }
  let staff: Record<string, unknown> & { collection: 'users' }

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    const s = await seedAssinante(payload, { email: 'sub-dicas@teste.local', password: 'senha-assinante-1', name: 'Sub Dicas' })
    sub = { ...(s as unknown as Record<string, unknown>), collection: 'assinantes' }
    const u = await seedStaffUser(payload, { email: 'staff-dicas@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  const create = (data: Record<string, unknown>) =>
    payload.create({
      collection: 'dicas',
      overrideAccess: false,
      user: staff as never,
      data: {
        title: 'Dica de teste',
        publishedAt: '2025-06-01T12:00:00.000Z',
        texto: lexicalParagraphs(['a', 'b']),
        _status: 'published',
        ...data,
      } as never,
    })

  it('nobody but staff can read or write dicas, drafts or versions through the API', async () => {
    const seeded = await seedDica(payload, { title: 'Dica aberta', slug: 'dica-aberta' })
    await seedDica(payload, { title: 'Dica em rascunho', slug: 'dica-rascunho', status: 'draft' })
    const principals: (Record<string, unknown> | undefined)[] = [undefined, sub]
    for (const user of principals) {
      const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
      await expect(payload.find({ collection: 'dicas', ...as })).rejects.toThrow(DENIED)
      await expect(payload.find({ collection: 'dicas', draft: true, ...as })).rejects.toThrow(DENIED)
      await expect(payload.findByID({ collection: 'dicas', id: seeded.id, ...as })).rejects.toThrow(DENIED)
      await expect(payload.findVersions({ collection: 'dicas', ...as })).rejects.toThrow(DENIED)
      await expect(
        payload.create({ collection: 'dicas', ...as, data: { title: 'x', slug: 'x' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(
        payload.update({ collection: 'dicas', id: seeded.id, ...as, data: { title: 'y' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(payload.delete({ collection: 'dicas', id: seeded.id, ...as })).rejects.toThrow(DENIED)
    }
    const staffAs = { overrideAccess: false, user: staff as never }
    expect((await payload.find({ collection: 'dicas', ...staffAs })).totalDocs).toBe(2)
    expect((await payload.findVersions({ collection: 'dicas', ...staffAs })).totalDocs).toBeGreaterThan(0)
    const updated = await payload.update({
      collection: 'dicas',
      id: seeded.id,
      ...staffAs,
      data: { title: 'Dica aberta (editada)', _status: 'published' } as never,
    })
    expect(updated.title).toBe('Dica aberta (editada)')
  })

  it('fills the slug from the title; capaConferida defaults to true and revisar to false', async () => {
    const doc = await create({ title: 'Dica da Maçã Dourada' })
    expect(doc.slug).toBe('dica-da-maca-dourada')
    expect(doc.capaConferida).toBe(true)
    expect(doc.revisar).toBe(false)
  })

  it('rejects duplicate and invalid slugs with pt messages', async () => {
    await create({ title: 'Primeira', slug: 'repetida' })
    await expectFieldError(create({ title: 'Segunda', slug: 'repetida' }), 'Já existe uma dica com este endereço.')
    await expectFieldError(create({ title: 'Terceira', slug: 'Com Espaço' }), 'Use só letras minúsculas, números e hífens.')
  })

  it('requires the publication date', async () => {
    await expectFieldError(create({ title: 'Sem data', slug: 'sem-data', publishedAt: null }), 'Informe a data de publicação.')
  })

  it('expires dicas and dica:<slug> (and the previous slug) on publish, edit and delete', async () => {
    const { vi } = await import('vitest')
    const expireMod = await import('../../src/lib/cache/expire')
    const spy = vi.spyOn(expireMod, 'expire')
    const doc = await create({ title: 'Cache', slug: 'cache-um' })
    expect(spy).toHaveBeenCalledWith(expect.arrayContaining(['dicas', 'dica:cache-um']))
    spy.mockClear()
    await payload.update({ collection: 'dicas', id: doc.id, overrideAccess: true, data: { slug: 'cache-dois' } as never })
    expect(spy).toHaveBeenCalledWith(expect.arrayContaining(['dicas', 'dica:cache-dois', 'dica:cache-um']))
    spy.mockClear()
    await payload.delete({ collection: 'dicas', id: doc.id, overrideAccess: true })
    expect(spy).toHaveBeenCalledWith(expect.arrayContaining(['dicas', 'dica:cache-dois']))
    spy.mockRestore()
  })
})

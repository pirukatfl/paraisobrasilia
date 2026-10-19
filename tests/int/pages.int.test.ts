import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { PAGE_KEYS } from '../../src/lib/pages/keys'
import { getPageByKey } from '../../src/lib/pages/queries'
import { getTestPayload, lexicalParagraph, resetDatabase, seedPages } from '../helpers/seed'

describe('institutional pages (INST-01, INST-06, PAINEL-04, T-02-04)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    await seedPages(payload)
  })

  it('the six keys exist and are published', async () => {
    const { docs } = await payload.find({ collection: 'pages', overrideAccess: false, limit: 20 })
    expect(docs.map((d) => d.key).sort()).toEqual([...PAGE_KEYS].sort())
    for (const doc of docs) expect(doc._status).toBe('published')
  })

  it('a key cannot be used twice', async () => {
    await expect(
      payload.create({
        collection: 'pages',
        overrideAccess: true,
        data: { key: 'normas', title: 'Outra', _status: 'published' },
      }),
    ).rejects.toThrow()
  })

  it('anonymous visitors cannot create or change pages', async () => {
    await expect(
      payload.create({ collection: 'pages', overrideAccess: false, data: { key: 'normas', title: 'x' } }),
    ).rejects.toThrow(/permiss|forbidden|not allowed/i)
  })

  it('a staff draft is not visible to visitors until published', async () => {
    const regras = (await payload.find({ collection: 'pages', where: { key: { equals: 'regras' } } })).docs[0]
    await payload.update({
      collection: 'pages',
      id: regras.id,
      draft: true,
      data: { title: 'Rascunho das regras', body: lexicalParagraph('Texto em rascunho') as never },
      overrideAccess: true,
    })
    expect((await getPageByKey('regras'))?.title).toBe('Regras e procedimentos')
    const anon = await payload.find({ collection: 'pages', where: { key: { equals: 'regras' } }, overrideAccess: false })
    expect(anon.docs[0].title).toBe('Regras e procedimentos')
    const draftsAnon = await payload.find({
      collection: 'pages',
      draft: true,
      where: { _status: { equals: 'draft' } },
      overrideAccess: false,
    })
    expect(draftsAnon.totalDocs).toBe(0)
  })

  it('re-running the seed never overwrites staff edits', async () => {
    const normas = (await payload.find({ collection: 'pages', where: { key: { equals: 'normas' } } })).docs[0]
    await payload.update({
      collection: 'pages',
      id: normas.id,
      data: { title: 'Normas editadas pela equipe', _status: 'published' },
      overrideAccess: true,
    })
    expect(await seedPages(payload)).toEqual([])
    expect((await getPageByKey('normas'))?.title).toBe('Normas editadas pela equipe')
  })

  it('getPageByKey returns the DTO with rich text', async () => {
    const page = await getPageByKey('privacidade')
    expect(page?.title).toBe('Política de Privacidade')
    expect(page?.intro).toContain('LGPD')
    expect(page?.body?.root.children.length).toBeGreaterThan(5)
  })
})

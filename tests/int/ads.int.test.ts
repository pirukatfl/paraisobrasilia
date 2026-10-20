import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { expectFieldError } from '../helpers/errors'
import {
  getTestPayload,
  resetDatabase,
  seedAd,
  seedAdCategories,
  seedAssinante,
  seedStaffUser,
  seedSubscription,
} from '../helpers/seed'

const CONTATO_MSG = 'Informe pelo menos um contato: WhatsApp ou Telegram.'

describe('ads and ad-categories (CLAS-03, CLAS-04, D-01, T-04-04, T-04-20)', () => {
  let payload: Payload
  let staff: Record<string, unknown>
  let owner: { id: number; email: string; name: string }
  let ownerPrincipal: Record<string, unknown>
  let casal: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const u = await seedStaffUser(payload, { email: 'staff-ads@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    owner = await seedAssinante(payload, { email: 'dono@teste.local', password: 'senha-dono-1234', name: 'Dono Teste' })
    ownerPrincipal = { ...owner, collection: 'assinantes' }
    const cats = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })
    casal = cats.docs[0].id as number
  })

  it('seeds Casal, Mulher, Homem, Trans once, readable by anyone', async () => {
    expect(await seedAdCategories(payload)).toBe(0)
    const { docs } = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: false })
    expect(docs.map((d) => d.name)).toEqual(['Casal', 'Mulher', 'Homem', 'Trans'])
  })

  it('refuses every REST operation on ads to subscribers', async () => {
    const ad = await seedAd(payload, { author: owner.id })
    const asOwner = { overrideAccess: false, user: ownerPrincipal as never }
    await expect(
      payload.create({
        collection: 'ads',
        data: { author: owner.id, apelido: 'Casal', euSou: casal, texto: 'Oi', contato: { telegram: 'casal_bsb' } } as never,
        ...asOwner,
      }),
    ).rejects.toThrow()
    const found = await payload.find({ collection: 'ads', ...asOwner }).then(
      (r) => r.docs.length,
      () => 0,
    )
    expect(found).toBe(0)
    await expect(payload.update({ collection: 'ads', id: ad.id, data: { status: 'aprovado' }, ...asOwner })).rejects.toThrow()
    await expect(payload.delete({ collection: 'ads', id: ad.id, ...asOwner })).rejects.toThrow()
  })

  it('lets staff create, read and update; computes resumo and cidadeBusca; defaults to pendente', async () => {
    const asStaff = { overrideAccess: false, user: staff as never }
    const created = await payload.create({
      collection: 'ads',
      data: {
        author: owner.id,
        apelido: 'Dupla BSB',
        euSou: casal,
        cidade: 'São Sebastião',
        texto: 'Casal procura amigos.',
        contato: { whatsapp: '+55 61 99988-9772', telegram: '@casal_bsb' },
      } as never,
      ...asStaff,
    })
    expect(created.status).toBe('pendente')
    expect(created.cidadeBusca).toBe('sao sebastiao')
    expect(created.resumo).toBe('Dupla BSB · Casal · São Sebastião — Casal procura amigos.')
    expect(created.contato?.whatsapp).toBe('5561999889772')
    expect(created.contato?.telegram).toBe('casal_bsb')

    const updated = await payload.update({
      collection: 'ads',
      id: created.id,
      data: { cidade: 'Taguatinga', texto: 'Novo texto' },
      ...asStaff,
    })
    expect(updated.cidadeBusca).toBe('taguatinga')
    expect(updated.resumo).toBe('Dupla BSB · Casal · Taguatinga — Novo texto')

    const read = await payload.find({ collection: 'ads', ...asStaff })
    expect(read.docs).toHaveLength(1)
  })

  it('validates contacts and text in Portuguese for staff edits', async () => {
    const asStaff = { overrideAccess: false, user: staff as never }
    await expectFieldError(
      payload.create({
        collection: 'ads',
        data: { author: owner.id, apelido: 'Casal', euSou: casal, texto: 'Sem contato' } as never,
        ...asStaff,
      }),
      CONTATO_MSG,
    )
    await expectFieldError(
      payload.create({
        collection: 'ads',
        data: { author: owner.id, apelido: 'Casal', euSou: casal, texto: 'a'.repeat(601), contato: { telegram: 'casal_bsb' } } as never,
        ...asStaff,
      }),
      'O texto pode ter até 600 caracteres.',
    )
  })

  it('refuses to delete an Eu sou option in use', async () => {
    await seedAd(payload, { author: owner.id, euSou: casal })
    await expect(payload.delete({ collection: 'ad-categories', id: casal, overrideAccess: true })).rejects.toThrow(
      'Esta opção está em uso em anúncios. Desative em vez de excluir.',
    )
    const cats = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })
    const trans = cats.docs[3].id
    await payload.delete({ collection: 'ad-categories', id: trans, overrideAccess: true })
    expect((await payload.count({ collection: 'ad-categories', overrideAccess: true })).totalDocs).toBe(3)
  })

  it('deletes the ads (and periods) together with the account', async () => {
    await seedAd(payload, { author: owner.id })
    await seedAd(payload, { author: owner.id, status: 'aprovado' })
    await seedSubscription(payload, { assinanteId: owner.id, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 86_400_000).toISOString() })
    await payload.delete({ collection: 'assinantes', id: owner.id, overrideAccess: true, context: { skipAudit: true } })
    expect((await payload.count({ collection: 'ads', overrideAccess: true })).totalDocs).toBe(0)
    expect((await payload.count({ collection: 'subscriptions', overrideAccess: true })).totalDocs).toBe(0)
  })
})

describe('owner service (CLAS-03, CLAS-04, D-02, D-03, T-04-04)', () => {
  let payload: Payload
  let owner: { id: number }
  let other: { id: number }
  let casal: number
  const NOW = new Date('2026-10-19T18:00:00.000Z')

  const input = (over: Partial<import('../../src/lib/classisex/rules').AdInput> = {}) => ({
    apelido: 'Casal Teste',
    euSou: casal,
    cidade: 'Brasília',
    texto: 'Casal simpático procura amigos.',
    whatsapp: '5561988887777',
    telegram: '',
    consent: true,
    ...over,
  })

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    owner = await seedAssinante(payload, { email: 'dono2@teste.local', password: 'senha-dono-1234', name: 'Dono' })
    other = await seedAssinante(payload, { email: 'outro@teste.local', password: 'senha-outro-1234', name: 'Outro' })
    const cats = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })
    casal = cats.docs[0].id as number
  })

  it('creates as pendente with submittedAt/consentAt and the owner as author', async () => {
    const { createAd } = await import('../../src/lib/classisex/service')
    const { id } = await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW })
    const ad = await payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })
    expect(ad.status).toBe('pendente')
    expect(ad.author).toBe(owner.id)
    expect(ad.submittedAt).toBe(NOW.toISOString())
    expect(ad.consentAt).toBe(NOW.toISOString())
  })

  it('refuses a 4th active ad; a refused ad does not count', async () => {
    const { createAd, ServiceError } = await import('../../src/lib/classisex/service')
    await seedAd(payload, { author: owner.id, status: 'recusado' })
    for (let i = 0; i < 3; i++) await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW })
    const err = await createAd(payload, { assinanteId: owner.id, input: input(), now: NOW }).catch((e) => e)
    expect(err).toBeInstanceOf(ServiceError)
    expect(err.code).toBe('limite')
    expect(err.status).toBe(409)
    expect(err.message).toBe('Você já tem 3 anúncios ativos. Apague um para publicar outro.')
  })

  it('editing an approved ad sends it back to pendente, clears motivo, keeps publishedAt', async () => {
    const { updateAd } = await import('../../src/lib/classisex/service')
    const ad = await seedAd(payload, { author: owner.id, status: 'aprovado', publishedAt: '2026-10-10T12:00:00.000Z', motivo: 'antigo' })
    await updateAd(payload, { assinanteId: owner.id, id: ad.id, input: input({ texto: 'Texto novo' }), now: NOW })
    const after = await payload.findByID({ collection: 'ads', id: ad.id, depth: 0, overrideAccess: true })
    expect(after.status).toBe('pendente')
    expect(after.motivo ?? null).toBeNull()
    expect(after.publishedAt).toBe('2026-10-10T12:00:00.000Z')
    expect(after.texto).toBe('Texto novo')
    expect(after.submittedAt).toBe(NOW.toISOString())
  })

  it("does not let a subscriber edit or delete another subscriber's ad", async () => {
    const { deleteAd, updateAd } = await import('../../src/lib/classisex/service')
    const ad = await seedAd(payload, { author: other.id })
    for (const call of [
      updateAd(payload, { assinanteId: owner.id, id: ad.id, input: input(), now: NOW }),
      deleteAd(payload, { assinanteId: owner.id, id: ad.id }),
    ]) {
      const err = await call.catch((e) => e)
      expect(err.code).toBe('nao-encontrado')
      expect(err.status).toBe(404)
    }
    expect((await payload.count({ collection: 'ads', overrideAccess: true })).totalDocs).toBe(1)
  })

  it('refuses to resubmit a refused ad while 3 are active', async () => {
    const { updateAd } = await import('../../src/lib/classisex/service')
    for (let i = 0; i < 3; i++) await seedAd(payload, { author: owner.id })
    const refused = await seedAd(payload, { author: owner.id, status: 'recusado' })
    const err = await updateAd(payload, { assinanteId: owner.id, id: refused.id, input: input(), now: NOW }).catch((e) => e)
    expect(err.code).toBe('limite')
  })

  it('deletes own ads', async () => {
    const { deleteAd } = await import('../../src/lib/classisex/service')
    const ad = await seedAd(payload, { author: owner.id })
    await deleteAd(payload, { assinanteId: owner.id, id: ad.id })
    expect((await payload.count({ collection: 'ads', overrideAccess: true })).totalDocs).toBe(0)
  })

  it('lists only own ads with owner-facing labels', async () => {
    const { listOwnAds } = await import('../../src/lib/classisex/service')
    await seedAd(payload, { author: owner.id, status: 'pendente' })
    await seedAd(payload, { author: owner.id, status: 'aprovado' })
    await seedAd(payload, { author: owner.id, status: 'recusado', motivo: 'Contato no texto' })
    await seedAd(payload, { author: owner.id, status: 'despublicado' })
    await seedAd(payload, { author: other.id })
    // owner has no active period: the approved ad stays up as a free account (G-05)
    const list = await listOwnAds(payload, owner.id, NOW)
    expect(list).toHaveLength(4)
    expect(list.map((a) => a.statusLabel).sort()).toEqual(
      ['Despublicado pela equipe', 'Em análise pela equipe', 'Publicado como conta gratuita (só a capa aparece)', 'Recusado'].sort(),
    )
    expect(list.find((a) => a.status === 'recusado')?.motivo).toBe('Contato no texto')
    expect(list[0].euSou).toBe('Casal')

    await seedSubscription(payload, {
      assinanteId: owner.id,
      startsAt: new Date(NOW.getTime() - 86_400_000).toISOString(),
      endsAt: new Date(NOW.getTime() + 10 * 86_400_000).toISOString(),
    })
    const active = await listOwnAds(payload, owner.id, NOW)
    expect(active.find((a) => a.status === 'aprovado')?.statusLabel).toBe('Publicado')
  })
})

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

const CONTATO_MSG = 'Informe pelo menos um contato: WhatsApp, Telegram ou e-mail.'

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

  it('seeds Casal, Solteiro, Solteira once, readable by anyone', async () => {
    expect(await seedAdCategories(payload)).toBe(0)
    const { docs } = await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: false })
    expect(docs.map((d) => d.name)).toEqual(['Casal', 'Solteiro', 'Solteira'])
  })

  it('refuses every REST operation on ads to subscribers', async () => {
    const ad = await seedAd(payload, { author: owner.id })
    const asOwner = { overrideAccess: false, user: ownerPrincipal as never }
    await expect(
      payload.create({
        collection: 'ads',
        data: { author: owner.id, euSou: casal, texto: 'Oi', contato: { email: 'a@b.com' } } as never,
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
        euSou: casal,
        cidade: 'São Sebastião',
        texto: 'Casal procura amigos.',
        contato: { whatsapp: '+55 61 99988-9772', telegram: '@casal_bsb' },
      } as never,
      ...asStaff,
    })
    expect(created.status).toBe('pendente')
    expect(created.cidadeBusca).toBe('sao sebastiao')
    expect(created.resumo).toBe('Casal · São Sebastião — Casal procura amigos.')
    expect(created.contato?.whatsapp).toBe('5561999889772')
    expect(created.contato?.telegram).toBe('casal_bsb')

    const updated = await payload.update({
      collection: 'ads',
      id: created.id,
      data: { cidade: 'Taguatinga', texto: 'Novo texto' },
      ...asStaff,
    })
    expect(updated.cidadeBusca).toBe('taguatinga')
    expect(updated.resumo).toBe('Casal · Taguatinga — Novo texto')

    const read = await payload.find({ collection: 'ads', ...asStaff })
    expect(read.docs).toHaveLength(1)
  })

  it('validates contacts and text in Portuguese for staff edits', async () => {
    const asStaff = { overrideAccess: false, user: staff as never }
    await expectFieldError(
      payload.create({
        collection: 'ads',
        data: { author: owner.id, euSou: casal, texto: 'Sem contato' } as never,
        ...asStaff,
      }),
      CONTATO_MSG,
    )
    await expectFieldError(
      payload.create({
        collection: 'ads',
        data: { author: owner.id, euSou: casal, texto: 'a'.repeat(601), contato: { email: 'a@b.com' } } as never,
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
    const solteira = cats.docs[2].id
    await payload.delete({ collection: 'ad-categories', id: solteira, overrideAccess: true })
    expect((await payload.count({ collection: 'ad-categories', overrideAccess: true })).totalDocs).toBe(2)
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

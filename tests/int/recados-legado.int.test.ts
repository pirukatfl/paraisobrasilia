import type { Payload } from 'payload'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { Recados } from '../../src/collections/Recados'
import { expectFieldError } from '../helpers/errors'
import { getTestPayload, resetDatabase, seedAssinante, seedRecado, seedStaffUser } from '../helpers/seed'

// R-06 (quick recados-privados): the old mural table is kept but hidden, closed and still erased
// with the author's account. Replaces recados.int and recado-moderation.int.
const DENIED = /permiss|forbidden|not allowed/i

describe('legacy recados table (R-06, T-RP-04, T-RP-07, T-05-12)', () => {
  let payload: Payload
  let sub: Record<string, unknown> & { collection: 'assinantes' }
  let staff: Record<string, unknown> & { collection: 'users' }
  let subId: number

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    const s = await seedAssinante(payload, { email: 'autor@teste.local', password: 'senha-assinante-1', name: 'Autor' })
    subId = s.id
    sub = { ...(s as unknown as Record<string, unknown>), collection: 'assinantes' }
    const u = await seedStaffUser(payload, { email: 'staff-recados@teste.local', password: 'senha-equipe-123' })
    staff = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  it('is hidden from the admin, has no moderation endpoint and no moderation field', () => {
    expect(Recados.slug).toBe('recados')
    expect(Recados.admin?.hidden).toBe(true)
    // Payload adds its default REST endpoints on sanitize; none of ours may be left
    const paths = (Recados.endpoints || []).map((e) => e.path)
    for (const path of paths) expect(path).not.toMatch(/aprovar|recusar|despublicar|moderacao/)
    const names = Recados.fields.map((f) => ('name' in f ? f.name : ''))
    expect(names).not.toContain('moderacao')
    // data fields stay: no schema change
    for (const name of ['author', 'apelido', 'texto', 'status', 'motivo', 'submittedAt', 'publishedAt']) {
      expect(names).toContain(name)
    }
  })

  it('shows nothing to anonymous visitors or subscribers and refuses their writes; staff still read', async () => {
    const r = await seedRecado(payload, { author: subId, status: 'aprovado' })
    for (const user of [undefined, sub]) {
      const as = { overrideAccess: false, ...(user ? { user: user as never } : {}) }
      await expect(payload.find({ collection: 'recados', ...as })).rejects.toThrow(DENIED)
      await expect(payload.findByID({ collection: 'recados', id: r.id, ...as })).rejects.toThrow(DENIED)
      await expect(
        payload.create({ collection: 'recados', ...as, data: { author: subId, apelido: 'x', texto: 'y' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(
        payload.update({ collection: 'recados', id: r.id, ...as, data: { status: 'aprovado' } as never }),
      ).rejects.toThrow(DENIED)
      await expect(payload.delete({ collection: 'recados', id: r.id, ...as })).rejects.toThrow(DENIED)
    }
    const staffAs = { overrideAccess: false, user: staff as never }
    expect((await payload.find({ collection: 'recados', ...staffAs })).totalDocs).toBe(1)
  })

  it('a staff write keeps validating in pt and stores the text redacted (T-05-03)', async () => {
    const create = (data: Record<string, unknown>) =>
      payload.create({ collection: 'recados', overrideAccess: false, user: staff as never, data: { author: subId, ...data } as never })
    await expectFieldError(create({ texto: 'oi' }), 'Escolha um apelido.')
    await expectFieldError(create({ apelido: 'Bia', texto: 'a'.repeat(501) }), 'O recado pode ter até 500 caracteres.')
    const doc = await seedRecado(payload, { author: subId, texto: 'chama 61 98877-6655 ou casal@exemplo.com hoje' })
    expect(doc.texto).not.toMatch(/98877|casal@/)
    expect(doc.texto).toContain('[contato só para assinantes]')
    const stored = await payload.findByID({ collection: 'recados', id: doc.id, overrideAccess: true })
    expect(stored.contatosRemovidos).toBe(2)
  })

  it('a signed-in write of status through the API keeps the stored status', async () => {
    const r = await seedRecado(payload, { author: subId })
    await payload.update({
      collection: 'recados',
      id: r.id,
      data: { status: 'aprovado', motivo: 'x' } as never,
      overrideAccess: false,
      user: staff as never,
    })
    const after = await payload.findByID({ collection: 'recados', id: r.id, depth: 0, overrideAccess: true })
    expect(after.status).toBe('pendente')
    expect(after.motivo ?? null).toBeNull()
  })

  it('deleting an account deletes its recados (LGPD)', async () => {
    const other = await seedAssinante(payload, { email: 'outro@teste.local', password: 'senha-assinante-1', name: 'Outro' })
    const mine = await seedRecado(payload, { author: subId, status: 'aprovado' })
    const theirs = await seedRecado(payload, { author: other.id, status: 'aprovado' })
    await payload.delete({ collection: 'assinantes', id: subId, overrideAccess: true, context: { skipAudit: true } })
    const ids = (await payload.find({ collection: 'recados', overrideAccess: true, pagination: false })).docs.map((d) => d.id)
    expect(ids).not.toContain(mine.id)
    expect(ids).toContain(theirs.id)
  })

  it('accepts a clean account apelido and rejects one with a contact', async () => {
    const ok = await payload.update({ collection: 'assinantes', id: subId, data: { apelido: 'Casal BSB' }, overrideAccess: true, context: { skipAudit: true } })
    expect((ok as { apelido?: string }).apelido).toBe('Casal BSB')
    await expect(
      payload.update({ collection: 'assinantes', id: subId, data: { apelido: 'bia@x.test' } as never, overrideAccess: true, context: { skipAudit: true } }),
    ).rejects.toThrow()
  })
})

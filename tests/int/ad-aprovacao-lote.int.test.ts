import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { BULK_APPROVE_MAX, approveAd, approveAds, getModerationView } from '../../src/lib/classisex/service'
import { rest, tokenFor } from '../helpers/rest'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedStaffUser } from '../helpers/seed'

vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

const NOW = new Date('2026-10-22T15:00:00.000Z')
const STAFF = { email: 'staff-lote@teste.local', password: 'senha-equipe-123' }
const MEMBER = { email: 'membro-lote@teste.local', password: 'senha-membro-1234', name: 'Maria Lote' }

describe('aprovação em lote dos anúncios (lista do admin)', () => {
  let payload: Payload
  let req: PayloadRequest
  let staffUser: Record<string, unknown>
  let author: { id: number }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const u = await seedStaffUser(payload, STAFF)
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
    req = await createLocalReq({ user: staffUser as never }, payload)
    author = await seedAssinante(payload, MEMBER)
  })

  const load = (id: number) => payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })
  const audit = async (action: string) =>
    (await payload.find({ collection: 'audit-log', where: { action: { equals: action } }, depth: 0, overrideAccess: true })).docs

  it('approves pending ads and team drafts like the single approval: dates, moderator and one audit row each', async () => {
    const a = await seedAd(payload, { author: author.id })
    const b = await seedAd(payload, { author: author.id, apelido: 'Outro' })
    const team = await seedAd(payload, { author: author.id, status: 'rascunho', origemLegado: 'equipe' })
    const result = await approveAds(req, [a.id, b.id, team.id], NOW)
    expect(result).toEqual({ aprovados: [a.id, b.id, team.id], falhas: [] })
    for (const id of [a.id, b.id, team.id]) {
      const after = await load(id)
      expect(after.status).toBe('aprovado')
      expect(after.publishedAt).toBe(NOW.toISOString())
      expect(after.moderatedAt).toBe(NOW.toISOString())
      expect(after.moderatedBy).toBe(staffUser.id)
    }
    const rows = await audit('anuncio-aprovado')
    expect(rows).toHaveLength(3)
    expect(rows.every((r) => (r.details as { lote?: boolean }).lote === true)).toBe(true)
    // the single approval writes the same kind of row
    const single = await seedAd(payload, { author: author.id })
    await approveAd(req, single.id, NOW)
    expect(await audit('anuncio-aprovado')).toHaveLength(4)
  })

  it('reports what fails with the reason and leaves it as it was; the rest is approved', async () => {
    const ok = await seedAd(payload, { author: author.id })
    const noContact = await seedAd(payload, { author: author.id, status: 'rascunho', origemLegado: 'equipe', contato: {} })
    const memberDraft = await seedAd(payload, { author: author.id, status: 'rascunho' })
    const already = await seedAd(payload, { author: author.id, status: 'aprovado' })
    const missing = 999_999

    const result = await approveAds(req, [noContact.id, ok.id, memberDraft.id, already.id, missing], NOW)
    expect(result.aprovados).toEqual([ok.id])
    expect(result.falhas.map((f) => f.id)).toEqual([noContact.id, memberDraft.id, already.id, missing])
    const reasons = Object.fromEntries(result.falhas.map((f) => [f.id, f.motivo]))
    expect(reasons[noContact.id]).toMatch(/WhatsApp|Telegram|contato/i)
    expect(reasons[memberDraft.id]).toBe('Este anúncio já está em rascunho (só o anunciante pode enviar).')
    expect(reasons[already.id]).toBe('Este anúncio já está publicado.')
    expect(reasons[missing]).toBe('Anúncio não encontrado.')
    expect(result.falhas.find((f) => f.id === noContact.id)?.resumo).toBeTruthy()

    expect((await load(noContact.id)).status).toBe('rascunho')
    expect((await load(memberDraft.id)).status).toBe('rascunho')
    expect((await load(ok.id)).status).toBe('aprovado')
    expect(await audit('anuncio-aprovado')).toHaveLength(1)
  })

  it('refuses an ad whose text is over the limit and keeps it pending', async () => {
    const ad = await seedAd(payload, { author: author.id })
    // old data: a text over 600 characters that predates the rule (written straight to the table)
    const longText = 'x'.repeat(601)
    const pool = (payload.db as unknown as { pool: { query: (text: string, values: unknown[]) => Promise<unknown> } }).pool
    await pool.query('update ads set texto = $1 where id = $2', [longText, ad.id])
    const result = await approveAds(req, [ad.id], NOW)
    expect(result.aprovados).toEqual([])
    expect(result.falhas).toHaveLength(1)
    expect(result.falhas[0]!.motivo.length).toBeGreaterThan(5)
    expect((await load(ad.id)).status).toBe('pendente')
  })

  it('the Moderação preview shows the text exactly as visitors read it, contacts removed', async () => {
    const ad = await seedAd(payload, {
      author: author.id,
      apelido: 'Casal Prévia',
      cidade: 'Brasília',
      texto: 'Casal simpático, zap 61 98877-6655 ou prévia@exemplo.com',
    })
    const view = await getModerationView(req, ad.id)
    expect(view.publicTexto).toContain('Casal simpático,')
    expect(view.publicTexto).toContain('[contato só para assinantes]')
    expect(view.publicTexto).not.toMatch(/98877|exemplo\.com/)
    expect(view.publicCidade).toBe('Brasília')
    expect(view.removed).toBeGreaterThanOrEqual(2)
    expect(view.removedApelido).toBe(0)
    expect(view.contato.whatsapp).toBe('5561999990000') // staff still see the real contact fields
  })

  it('validates the id list: empty, junk, too many; duplicates count once', async () => {
    const ad = await seedAd(payload, { author: author.id })
    await expect(approveAds(req, [], NOW)).rejects.toMatchObject({ status: 400, message: 'Escolha pelo menos um anúncio.' })
    await expect(approveAds(req, undefined, NOW)).rejects.toMatchObject({ status: 400 })
    await expect(approveAds(req, ['abc'], NOW)).rejects.toMatchObject({ status: 400 })
    await expect(approveAds(req, [0], NOW)).rejects.toMatchObject({ status: 400 })
    await expect(approveAds(req, Array.from({ length: BULK_APPROVE_MAX + 1 }, (_, i) => i + 1), NOW)).rejects.toMatchObject({ status: 400 })
    expect((await load(ad.id)).status).toBe('pendente')
    const result = await approveAds(req, [ad.id, String(ad.id), ad.id], NOW)
    expect(result.aprovados).toEqual([ad.id])
    expect(result.falhas).toEqual([])
  })

  it('is staff-only in the service and on REST (subscriber and anonymous get 403, nothing changes)', async () => {
    const ad = await seedAd(payload, { author: author.id })
    const memberReq = await createLocalReq({ user: { ...author, collection: 'assinantes' } as never }, payload)
    await expect(approveAds(memberReq, [ad.id], NOW)).rejects.toMatchObject({ status: 403 })

    const memberToken = await tokenFor(payload, 'assinantes', MEMBER.email, MEMBER.password)
    const asMember = await rest('POST', ['ads', 'aprovar-lote'], { token: memberToken, body: { ids: [ad.id] } })
    expect(asMember.status).toBe(403)
    const anonymous = await rest('POST', ['ads', 'aprovar-lote'], { body: { ids: [ad.id] } })
    expect(anonymous.status).toBe(403)
    expect((await load(ad.id)).status).toBe('pendente')

    const staffToken = await tokenFor(payload, 'users', STAFF.email, STAFF.password)
    const asStaff = await rest('POST', ['ads', 'aprovar-lote'], { token: staffToken, body: { ids: [ad.id], status: 'recusado', publishedAt: '2000-01-01' } })
    expect(asStaff.status).toBe(200)
    expect(asStaff.json).toEqual({ aprovados: [ad.id], falhas: [] })
    const after = await load(ad.id)
    expect(after.status).toBe('aprovado')
    expect(new Date(after.publishedAt as string).getFullYear()).toBeGreaterThan(2020) // body dates are never read
    const bad = await rest('POST', ['ads', 'aprovar-lote'], { token: staffToken, body: { ids: 'x' } })
    expect(bad.status).toBe(400)
  })
})

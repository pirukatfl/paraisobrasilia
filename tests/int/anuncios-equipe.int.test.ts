import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { Payload } from 'payload'
import { createLocalReq } from 'payload'
import sharp from 'sharp'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as previaGET } from '../../src/app/(frontend)/classisex/previa/[id]/route'
import { findMemberAd, findMemberAds, findPublicAds } from '../../src/lib/classisex/board'
import { approveAd, getModerationView, listOwnAds, rejectAd, reportAd } from '../../src/lib/classisex/service'
import {
  EQUIPE_LEGADO_EMAIL,
  EQUIPE_LEGADO_NAME,
  formatLoadLines,
  importAccounts,
  importLegacyAds,
} from '../../src/lib/migracao/load'
import { extractAccounts, type AccountDecision } from '../../src/lib/migracao/wp-accounts'
import { extractLegacyAds, resolveFieldKeys, type WpLegacyAd } from '../../src/lib/migracao/wp-classisex'
import { rest, tokenFor } from '../helpers/rest'
import {
  getTestPayload,
  resetDatabase,
  seedAdCategories,
  seedAssinante,
  seedStaffUser,
  seedSubscription,
} from '../helpers/seed'
import { CLASSISEX_POST, FIXTURE_NOW, MIGRACAO_PREFIX, readMigracaoFixture } from '../helpers/wp-migracao-fixture'

vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

const NOW = new Date('2026-10-19T18:00:00.000Z')
const DAY = 86_400_000
const STAFF = { email: 'staff-equipe@teste.local', password: 'senha-equipe-123' }

describe('anúncios antigos da equipe: conta técnica (M-04; publicados desde 2026-10-22)', () => {
  let payload: Payload
  let decisions: AccountDecision[]
  let ads: WpLegacyAd[]
  let staffUser: Record<string, unknown>

  beforeAll(async () => {
    payload = await getTestPayload()
    const tables = await readMigracaoFixture()
    decisions = extractAccounts(tables, { prefix: MIGRACAO_PREFIX, now: FIXTURE_NOW })
    const keys = resolveFieldKeys(tables, { postId: CLASSISEX_POST })
    ads = extractLegacyAds(tables, { postId: CLASSISEX_POST, keys }).ads
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const u = await seedStaffUser(payload, STAFF)
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  const staffReq = () => createLocalReq({ user: staffUser as never }, payload)
  const allAds = async () =>
    (await payload.find({ collection: 'ads', limit: 50, depth: 0, overrideAccess: true, sort: 'wpCommentId' })).docs as unknown as Record<string, unknown>[]
  const teamDraft = async () => (await allAds()).find((r) => r.origemLegado === 'equipe')!
  const placeholder = async () =>
    (
      await payload.find({
        collection: 'assinantes',
        where: { email: { equals: EQUIPE_LEGADO_EMAIL } },
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
    ).docs as unknown as (Record<string, unknown> & { id: number })[]
  // Staging today: the team ads of the first import are still drafts. Puts them back to that state.
  const demote = async () => {
    for (const r of await allAds()) {
      await payload.update({
        collection: 'ads',
        id: r.id as number,
        data: { status: 'rascunho', publishedAt: null, fonteLegado: null } as never,
        overrideAccess: true,
        context: { skipAudit: true, legacyImport: true },
      })
    }
  }
  const run = async () => {
    await importAccounts(payload, decisions, { now: FIXTURE_NOW })
    return importLegacyAds(payload, ads, { now: FIXTURE_NOW })
  }
  const paying = async (email: string) => {
    const acc = await seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0]! })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 20 * DAY).toISOString(),
    })
    return acc
  }

  it('imports the administrator ad published, owned by one placeholder account that cannot log in', async () => {
    const result = await run()
    expect(result).toMatchObject({ criados: 5, promovidos: 0, daEquipe: 1, jaExistiam: 0 })
    const rows = await placeholder()
    expect(rows).toHaveLength(1)
    const team = rows[0]!
    expect(team).toMatchObject({
      name: EQUIPE_LEGADO_NAME,
      origem: 'site-antigo',
      _verified: false,
    })
    expect(team.revisarAssinaturaAntiga).toBeFalsy()
    expect(team.legacyPasswordHash ?? null).toBeNull()
    expect(team.wpUserId ?? null).toBeNull()

    const draft = await teamDraft()
    expect(draft).toMatchObject({ status: 'aprovado', fonteLegado: 'classisex', author: team.id, origemLegado: 'equipe', apelido: 'Anônimo', wpCommentId: 108 })
    // the other four ads keep their own authors and carry no team flag
    expect((await allAds()).filter((r) => r.origemLegado === 'equipe')).toHaveLength(1)

    for (const password of ['', 'senha-teste-1234', 'x'.repeat(32)]) {
      await expect(payload.login({ collection: 'assinantes', data: { email: EQUIPE_LEGADO_EMAIL, password } })).rejects.toThrow()
    }
  })

  it('has no subscription period and no access, so it is never an active member', async () => {
    await run()
    const team = (await placeholder())[0]!
    const periods = await payload.count({ collection: 'subscriptions', where: { assinante: { equals: team.id } }, overrideAccess: true })
    expect(periods.totalDocs).toBe(0)
    expect(team.accessUntil ?? null).toBeNull()
  })

  it('is idempotent: a re-run creates nothing; a new team ad later reuses the same placeholder', async () => {
    await run()
    const again = await run()
    expect(again).toMatchObject({ criados: 0, promovidos: 0, daEquipe: 0, jaExistiam: 5 })
    expect(await placeholder()).toHaveLength(1)
    expect(await allAds()).toHaveLength(5)

    const extra: WpLegacyAd[] = [
      { ...ads[0]!, wpCommentId: 9001, wpUserId: 424242 }, // deleted user: no account at all
    ]
    const third = await importLegacyAds(payload, [...ads, ...extra], { now: FIXTURE_NOW })
    expect(third).toMatchObject({ criados: 1, daEquipe: 1, jaExistiam: 5 })
    expect(await placeholder()).toHaveLength(1)
    expect(await allAds()).toHaveLength(6)
    expect((await allAds()).filter((r) => r.origemLegado === 'equipe')).toHaveLength(2)
    expect(formatLoadLines((await importAccounts(payload, decisions, { now: FIXTURE_NOW })).result, third).join('\n')).toContain(
      'Anúncios: publicados 1 · promovidos de rascunho 0 · já existiam 5 · da equipe 1',
    )
  })

  it('keeps a team draft the staff already handled when the importer runs again', async () => {
    await run()
    const d = await teamDraft()
    await payload.update({ collection: 'ads', id: d.id as number, data: { texto: 'Texto revisado pela equipe.' } as never, overrideAccess: true, context: { skipAudit: true } })
    await run()
    expect((await payload.findByID({ collection: 'ads', id: d.id as number, depth: 0, overrideAccess: true })).texto).toBe('Texto revisado pela equipe.')
  })

  it('stores the photos of a team draft', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'equipe-uploads-'))
    try {
      const jpeg = await sharp({ create: { width: 32, height: 32, channels: 3, background: '#33a' } }).jpeg().toBuffer()
      const team = { ...ads[0]!, wpCommentId: 9002, wpUserId: 424242, photos: [{ attachmentId: 1, relPath: '2025/05/eq.jpg' }] }
      await fs.mkdir(path.join(dir, '2025/05'), { recursive: true })
      await fs.writeFile(path.join(dir, '2025/05/eq.jpg'), jpeg)
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const r = await importLegacyAds(payload, [team], { now: FIXTURE_NOW, uploadsDir: dir })
      expect(r).toMatchObject({ criados: 1, daEquipe: 1, fotosGravadas: 1 })
    } finally {
      await fs.rm(dir, { recursive: true, force: true })
    }
  })

  it('a published team ad shows on the boards like any other old ad (owner without access: cover only)', async () => {
    await run()
    const d = await teamDraft()
    const member = await paying('membro@teste.local')
    const pub = (await findPublicAds(payload, {}, NOW)).items
    expect(pub).toHaveLength(5)
    expect(JSON.stringify(pub)).not.toContain('Sentinela@')
    const mine = (await findMemberAds(payload, {}, NOW)).items.find((i) => i.id === d.id)!
    expect(mine.autorGratuito).toBe(true)
    expect(await listOwnAds(payload, member.id, NOW)).toHaveLength(0)
  })

  it('an unpromoted team draft stays invisible to the public, to members, in media and reports', async () => {
    await run()
    await demote()
    const d = await teamDraft()
    const member = await paying('membro@teste.local')
    expect((await findPublicAds(payload, {}, NOW)).items).toHaveLength(0)
    expect((await findMemberAds(payload, {}, NOW)).items).toHaveLength(0)
    expect(await findMemberAd(payload, d.id as number, NOW)).toBeNull()
    expect(await listOwnAds(payload, member.id, NOW)).toHaveLength(0)
    const res = await previaGET(new Request('http://localhost/classisex/previa/1'), { params: Promise.resolve({ id: '1' }) })
    expect(res.status).toBe(404)
    await expect(reportAd(payload, { reporterId: member.id, adId: d.id as number, motivo: 'ofensivo', now: NOW })).rejects.toMatchObject({ status: 404 })
  })

  it('staff approve an unpromoted team draft directly; a draft of a real member stays out of reach', async () => {
    await run()
    await demote()
    const d = await teamDraft()
    const id = d.id as number
    const req = await staffReq()
    expect((await getModerationView(req, id)).rascunhoDaEquipe).toBe(true)

    // old ads are exempt from the contact rule (2026-10-22): no contact needed to approve
    await approveAd(req, id, NOW)
    const done = await payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })
    expect(done).toMatchObject({ status: 'aprovado' })
    expect(done.publishedAt).toBeTruthy()
    expect((await findMemberAds(payload, {}, NOW)).items.map((i) => i.id)).toEqual([id])

    // a draft with a real author is still only submitted by that author
    const other = (await allAds()).find((r) => r.origemLegado !== 'equipe' && r.status === 'rascunho')!
    await expect(approveAd(req, other.id as number, NOW)).rejects.toMatchObject({ status: 409 })
    await expect(rejectAd(req, id, 'motivo de teste', NOW)).rejects.toMatchObject({ status: 409 })
  })

  it('staff can hand the draft to the right member, who then sees it as an ordinary draft', async () => {
    await run()
    await demote()
    const d = await teamDraft()
    const id = d.id as number
    const member = await paying('dono@teste.local')
    await payload.update({ collection: 'ads', id, data: { author: member.id } as never, overrideAccess: true, context: { skipAudit: true } })
    const after = await payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })
    expect(after).toMatchObject({ author: member.id, status: 'rascunho' })
    expect(after.origemLegado ?? null).toBeNull()
    const own = await listOwnAds(payload, member.id, NOW)
    expect(own.map((a) => a.id)).toEqual([id])
    expect(own[0]!.status).toBe('rascunho')
    // from now on it is the member's draft: staff cannot approve it over their head, nor reassign it again
    await expect(approveAd(await staffReq(), id, NOW)).rejects.toMatchObject({ status: 409 })
    const another = await paying('outro@teste.local')
    await expect(
      payload.update({ collection: 'ads', id, data: { author: another.id } as never, overrideAccess: true, context: { skipAudit: true } }),
    ).rejects.toThrow()
  })

  it('refuses to change the owner of an ordinary ad; REST cannot forge the flag; staff can delete a team draft', async () => {
    await run()
    const ordinary = (await allAds()).find((r) => r.origemLegado !== 'equipe')!
    const member = await paying('dono@teste.local')
    await expect(
      payload.update({ collection: 'ads', id: ordinary.id as number, data: { author: member.id } as never, overrideAccess: true, context: { skipAudit: true } }),
    ).rejects.toThrow()

    const token = await tokenFor(payload, 'users', STAFF.email, STAFF.password)
    const created = await rest('POST', ['ads'], {
      token,
      body: {
        author: member.id,
        apelido: 'Casal',
        euSou: ordinary.euSou,
        texto: 'Texto curto.',
        contato: { whatsapp: '5561999990000' },
        origemLegado: 'equipe',
      },
    })
    expect(created.status).toBe(201)
    const newId = (created.json as { doc: { id: number } }).doc.id
    expect((await payload.findByID({ collection: 'ads', id: newId, depth: 0, overrideAccess: true })).origemLegado ?? null).toBeNull()

    const d = await teamDraft()
    const del = await rest('DELETE', ['ads', String(d.id)], { token })
    expect(del.status).toBe(200)
    expect((await allAds()).filter((r) => r.origemLegado === 'equipe')).toHaveLength(0)
    expect(await placeholder()).toHaveLength(1) // the placeholder stays for the next ones
  })
})


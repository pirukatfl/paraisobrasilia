import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MIGRATION_PLAN_NAME,
  formatLoadLines,
  importAccounts,
  importLegacyAds,
} from '../../src/lib/migracao/load'
import { extractAccounts, type AccountDecision, type WpAccount } from '../../src/lib/migracao/wp-accounts'
import { extractLegacyAds, resolveFieldKeys, type WpLegacyAd } from '../../src/lib/migracao/wp-classisex'
import { getTestPayload, resetDatabase, seedAdCategories, seedAssinante } from '../helpers/seed'
import {
  CLASSISEX_POST,
  FIXTURE_NOW,
  MIGRACAO_PREFIX,
  SENTINELS,
  readMigracaoFixture,
} from '../helpers/wp-migracao-fixture'

vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

type Importar = Extract<AccountDecision, { kind: 'importar' }>
const importar = (d: AccountDecision[]) => d.filter((x): x is Importar => x.kind === 'importar')
const byUser = (d: AccountDecision[], id: number) => importar(d).find((x) => x.account.wpUserId === id)!.account

describe('carga da migração do WordPress (06-07)', () => {
  let payload: Payload
  let decisions: AccountDecision[]
  let ads: WpLegacyAd[]
  let uploads: string
  let outside: string

  beforeAll(async () => {
    payload = await getTestPayload()
    const tables = await readMigracaoFixture()
    decisions = extractAccounts(tables, { prefix: MIGRACAO_PREFIX, now: FIXTURE_NOW })
    const keys = resolveFieldKeys(tables, { postId: CLASSISEX_POST })
    ads = extractLegacyAds(tables, { postId: CLASSISEX_POST, keys }).ads
    uploads = await fs.mkdtemp(path.join(os.tmpdir(), 'mig-uploads-'))
    outside = await fs.mkdtemp(path.join(os.tmpdir(), 'mig-outside-'))
    const jpeg = await sharp({ create: { width: 64, height: 64, channels: 3, background: '#a33' } }).jpeg().toBuffer()
    for (const p of ads.flatMap((a) => a.photos)) {
      if (!p.relPath) continue
      await fs.mkdir(path.dirname(path.join(uploads, p.relPath)), { recursive: true })
      await fs.writeFile(path.join(uploads, p.relPath), jpeg)
    }
    await fs.mkdir(path.join(uploads, '2025/05'), { recursive: true })
    await fs.writeFile(path.join(outside, 'segredo.jpg'), jpeg)
    await fs.symlink(path.join(outside, 'segredo.jpg'), path.join(uploads, '2025/05/fora.jpg'))
  })

  afterAll(async () => {
    await fs.rm(uploads, { recursive: true, force: true })
    await fs.rm(outside, { recursive: true, force: true })
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
  })

  const account = async (wpUserId: number) => {
    const { docs } = await payload.find({
      collection: 'assinantes',
      where: { wpUserId: { equals: wpUserId } },
      limit: 1,
      depth: 0,
      overrideAccess: true,
      showHiddenFields: true,
    })
    return docs[0] as unknown as Record<string, unknown> & { id: number }
  }
  const periods = async (assinante: number) =>
    (
      await payload.find({
        collection: 'subscriptions',
        where: { assinante: { equals: assinante } },
        depth: 1,
        overrideAccess: true,
      })
    ).docs as unknown as { id: number; endsAt: string; status: string; plan: { name: string; active: boolean } }[]
  const audits = async () =>
    (await payload.find({ collection: 'audit-log', limit: 200, overrideAccess: true })).docs as unknown as {
      action: string
      details: unknown
      summary: string
    }[]

  describe('contas', () => {
    it('creates the accounts with their legacy hash and no usable Payload password', async () => {
      const { result } = await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      expect(result).toMatchObject({ criadas: 9, vinculadas: 0, jaImportadas: 0, conflitoEmail: 0, erros: 0 })
      const u2 = await account(2)
      expect(u2).toMatchObject({ origem: 'site-antigo', _verified: true, wpUserId: 2 })
      expect(u2.importadoEm).toBe(FIXTURE_NOW.toISOString())
      expect(u2.legacyPasswordHash).toBe(byUser(decisions, 2).hash)
      expect((await account(11)).legacyPasswordHash ?? null).toBeNull()
      await expect(
        payload.login({ collection: 'assinantes', data: { email: byUser(decisions, 2).email, password: '' } }),
      ).rejects.toThrow()
      await expect(
        payload.login({
          collection: 'assinantes',
          data: { email: byUser(decisions, 2).email, password: byUser(decisions, 2).hash! },
        }),
      ).rejects.toThrow()
    })

    it('gives paid periods on the inactive migration plan and flags the ones to review', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const ends: Record<number, string> = {
        2: '2026-11-16T03:00:00.000Z',
        3: '2027-03-01T03:00:00.000Z',
        11: '2026-12-02T03:00:00.000Z',
        12: '2026-12-21T03:00:00.000Z',
      }
      for (const [id, endsAt] of Object.entries(ends)) {
        const a = await account(Number(id))
        const p = await periods(a.id)
        expect(p).toHaveLength(1)
        expect(p[0]).toMatchObject({ status: 'ativa', plan: { name: MIGRATION_PLAN_NAME, active: false } })
        expect(new Date(p[0].endsAt).toISOString()).toBe(endsAt)
        expect(new Date(a.accessUntil as string).toISOString()).toBe(endsAt)
      }
      for (const id of [4, 13]) {
        const a = await account(id)
        expect(await periods(a.id)).toHaveLength(0)
        expect(a.revisarAssinaturaAntiga).toBe(true)
      }
      for (const id of [5, 6, 7]) {
        const a = await account(id)
        expect(await periods(a.id)).toHaveLength(0)
        expect(a.revisarAssinaturaAntiga).toBeFalsy()
      }
      const active = await payload.find({
        collection: 'plans',
        where: { active: { equals: true } },
        overrideAccess: true,
      })
      expect(active.docs.map((p) => p.name)).not.toContain(MIGRATION_PLAN_NAME)
    })

    it('audits each created account without secrets', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const rows = (await audits()).filter((r) => r.action === 'conta-importada')
      expect(rows).toHaveLength(9)
      const text = JSON.stringify(await audits())
      for (const s of ['$wp$', '$P$', 'legacyPasswordHash']) expect(text).not.toContain(s)
    })

    it('is idempotent: a second run changes nothing', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const { result } = await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      expect(result).toMatchObject({ criadas: 0, jaImportadas: 9, periodosCriados: 0, periodosMantidos: 4, erros: 0 })
      expect((await audits()).filter((r) => r.action === 'conta-importada')).toHaveLength(9)
    })

    it('survives the cutover re-run without undoing the team or the members', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const u2 = await account(2)
      await payload.update({
        collection: 'assinantes',
        id: u2.id,
        data: { name: 'Nome da equipe', apelido: 'ApelidoEquipe' } as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
      const u3 = await account(3)
      await payload.update({
        collection: 'assinantes',
        id: u3.id,
        data: { password: 'senha-nova-123' } as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
      const u4 = await account(4)
      await payload.update({
        collection: 'assinantes',
        id: u4.id,
        data: { revisarAssinaturaAntiga: false } as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
      const periodsOf12 = (await periods((await account(12)).id))[0]

      const later: AccountDecision[] = decisions.map((d) => {
        if (d.kind !== 'importar') return d
        const a: WpAccount = { ...d.account }
        if (a.wpUserId === 2) a.endsAt = '2027-01-10T03:00:00.000Z'
        if (a.wpUserId === 12) a.endsAt = '2026-11-01T03:00:00.000Z'
        if (a.wpUserId === 7) a.hash = '$P$Bnovohashsintetico0000000000000000'
        return { kind: 'importar', account: a }
      })
      later.push({
        kind: 'importar',
        account: {
          ...byUser(decisions, 5),
          wpUserId: 14,
          email: 'novo14.sentinela@paraiso-sintetico.test',
          name: 'Novo Catorze',
          apelido: 'Novo14',
          assinatura: 'vencida',
          endsAt: null,
        },
      })
      const { result } = await importAccounts(payload, later, { now: FIXTURE_NOW })
      expect(result).toMatchObject({ criadas: 1, jaImportadas: 9, periodosEstendidos: 1, senhaAntigaAtualizada: 1 })

      const p2 = await periods(u2.id)
      expect(p2).toHaveLength(1)
      expect(new Date(p2[0].endsAt).toISOString()).toBe('2027-01-10T03:00:00.000Z')
      const p12 = await periods((await account(12)).id)
      expect(p12).toHaveLength(1)
      expect(p12[0].endsAt).toBe(periodsOf12.endsAt)
      expect((await account(7)).legacyPasswordHash).toBe('$P$Bnovohashsintetico0000000000000000')
      expect((await account(3)).legacyPasswordHash ?? null).toBeNull()
      expect(await account(2)).toMatchObject({ name: 'Nome da equipe', apelido: 'ApelidoEquipe' })
      expect((await account(4)).revisarAssinaturaAntiga).toBe(false)
      expect(await account(14)).toMatchObject({ origem: 'site-antigo' })
    })

    it('links a confirmed account with the same e-mail and skips an unconfirmed sign-up', async () => {
      const a2 = byUser(decisions, 2)
      const a3 = byUser(decisions, 3)
      const confirmed = await seedAssinante(payload, { email: a2.email, password: 'senha-propria-123', name: 'Dona do e-mail' })
      await payload.update({
        collection: 'assinantes',
        id: confirmed.id,
        data: { _verified: true } as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
      const pending = await seedAssinante(payload, { email: a3.email, password: 'senha-outra-123', name: 'Sem confirmar' })
      await payload.update({
        collection: 'assinantes',
        id: pending.id,
        data: { _verified: false, origem: 'cadastro' } as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })

      const { result } = await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      expect(result).toMatchObject({ vinculadas: 1, conflitoEmail: 1, criadas: 7 })

      const linked = await account(2)
      expect(linked.id).toBe(confirmed.id)
      expect(linked.legacyPasswordHash ?? null).toBeNull()
      expect(await periods(confirmed.id)).toHaveLength(1)
      await expect(
        payload.login({ collection: 'assinantes', data: { email: a2.email, password: 'senha-propria-123' } }),
      ).resolves.toBeTruthy()

      expect(await periods(pending.id)).toHaveLength(0)
      expect(await account(3)).toBeUndefined()
    })

    it('prints counts only', async () => {
      const { result } = await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const text = formatLoadLines(result).join('\n')
      expect(text).not.toContain('@')
      for (const s of SENTINELS) expect(text).not.toContain(s)
      expect(text).toMatch(/criadas 9/)
    })
  })

  describe('anúncios como rascunho', () => {
    const drafts = async () =>
      (await payload.find({ collection: 'ads', limit: 50, depth: 0, overrideAccess: true })).docs as unknown as Record<
        string,
        unknown
      >[]
    const mediaOf = async (ad: number) =>
      (
        await payload.find({
          collection: 'ad-media',
          where: { ad: { equals: ad } },
          depth: 0,
          overrideAccess: true,
        })
      ).docs as unknown as { kind: string; order: number }[]
    const withPhotos = () => ads.find((a) => a.photos.some((p) => p.relPath))!

    it('creates five private drafts; the administrator ad goes to the team placeholder', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const result = await importLegacyAds(payload, ads, { now: FIXTURE_NOW })
      expect(result).toMatchObject({ criados: 5, jaExistiam: 0, daEquipe: 1 })
      const rows = await drafts()
      expect(rows).toHaveLength(5)
      for (const row of rows.filter((r) => r.wpCommentId !== 108)) {
        const src = ads.find((a) => a.wpCommentId === row.wpCommentId)!
        const author = await account(src.wpUserId)
        expect(row).toMatchObject({
          status: 'rascunho',
          author: author.id,
          cidade: src.cidade,
          texto: src.texto,
          importadoEm: FIXTURE_NOW.toISOString(),
        })
        expect(row.apelido).toBe((author.apelido as string) || 'Anônimo')
        expect(new Date(row.criadoNoSiteAntigoEm as string).toISOString()).toBe(src.createdAt)
        expect(row.contato).toMatchObject({ whatsapp: null, telegram: null })
        expect(row.consentAt ?? null).toBeNull()
      }
      expect((rows.find((r) => r.wpCommentId === 104)!.texto as string).length).toBeGreaterThan(600)
    })

    it('stores photos from the uploads folder; none without it', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const without = await importLegacyAds(payload, ads, { now: FIXTURE_NOW })
      expect(without.fotosGravadas).toBe(0)
      const mid = (await drafts()).find((r) => r.wpCommentId === withPhotos().wpCommentId)!
      expect(await mediaOf(mid.id as number)).toHaveLength(0)

      const topUp = await importLegacyAds(payload, ads, { now: FIXTURE_NOW, uploadsDir: uploads })
      expect(topUp).toMatchObject({ criados: 0, jaExistiam: 5 })
      expect(topUp.fotosGravadas).toBeGreaterThanOrEqual(1)
      const media = await mediaOf(mid.id as number)
      expect(media[0]).toMatchObject({ kind: 'foto', order: 0 })
      const again = await importLegacyAds(payload, ads, { now: FIXTURE_NOW, uploadsDir: uploads })
      expect(again.fotosGravadas).toBe(0)
      expect(await mediaOf(mid.id as number)).toHaveLength(media.length)
    })

    it('refuses paths that escape the folder and unsupported files', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const base = withPhotos()
      const extra = (id: number, relPath: string): WpLegacyAd => ({
        ...base,
        wpCommentId: id,
        photos: [{ attachmentId: id, relPath }],
      })
      const r = await importLegacyAds(
        payload,
        [extra(9001, '../../etc/passwd'), extra(9002, '2025/05/fora.jpg'), extra(9003, '2025/05/a.gif'), extra(9004, '2025/05/b.mp4')],
        { now: FIXTURE_NOW, uploadsDir: uploads },
      )
      expect(r).toMatchObject({ criados: 4, daEquipe: 0, fotosGravadas: 0, fotosRecusadas: 2 })
      expect(r.fotosForaDaPasta).toBe(2)
    })

    it('never touches a draft the author already submitted', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      await importLegacyAds(payload, ads, { now: FIXTURE_NOW })
      const row = (await drafts()).find((r) => r.wpCommentId === withPhotos().wpCommentId)!
      await payload.update({
        collection: 'ads',
        id: row.id as number,
        data: { status: 'pendente', contato: { whatsapp: '5561988887777' } } as never,
        overrideAccess: true,
        context: { skipAudit: true, legacyImport: true },
      })
      const r = await importLegacyAds(payload, ads, { now: FIXTURE_NOW, uploadsDir: uploads })
      expect(r.fotosGravadas).toBe(0)
      expect(await mediaOf(row.id as number)).toHaveLength(0)
    })

    it('fails before writing anything when an "Eu sou" option is missing', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const homem = (await payload.find({ collection: 'ad-categories', where: { name: { equals: 'Homem' } }, overrideAccess: true }))
        .docs[0]
      await payload.update({
        collection: 'ad-categories',
        id: homem.id,
        data: { name: 'Homem renomeado' } as never,
        overrideAccess: true,
      })
      await expect(importLegacyAds(payload, ads, { now: FIXTURE_NOW })).rejects.toThrow(
        'Opção "Eu sou" não encontrada: Homem. Confira as opções no painel antes de importar.',
      )
      expect(await drafts()).toHaveLength(0)
    })

    it('prints no ad text', async () => {
      await importAccounts(payload, decisions, { now: FIXTURE_NOW })
      const r = await importLegacyAds(payload, ads, { now: FIXTURE_NOW })
      const text = formatLoadLines((await importAccounts(payload, decisions, { now: FIXTURE_NOW })).result, r).join('\n')
      for (const s of SENTINELS) expect(text).not.toContain(s)
      expect(text).toMatch(/rascunhos criados 5/)
      expect(text).toContain('da equipe (rascunho para revisar) 1')
      expect(text).not.toContain('autor não importado')
    })
  })
})

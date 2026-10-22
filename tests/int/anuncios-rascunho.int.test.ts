import type { Payload } from 'payload'
import { createLocalReq } from 'payload'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { GET as previaGET } from '../../src/app/(frontend)/classisex/previa/[id]/route'
import { findMemberAd, findMemberAds, findPublicAds } from '../../src/lib/classisex/board'
import { canViewMedia } from '../../src/lib/classisex/media-access'
import {
  approveAd,
  getModerationCounts,
  listOwnAds,
  rejectAd,
  reportAd,
  unpublishAd,
  updateAd,
} from '../../src/lib/classisex/service'
import { rest, tokenFor } from '../helpers/rest'
import {
  getTestPayload,
  resetDatabase,
  seedAd,
  seedAdCategories,
  seedAdMedia,
  seedAssinante,
  seedStaffUser,
  seedSubscription,
} from '../helpers/seed'

vi.mock('../../src/lib/cache/expire', () => ({ expire: vi.fn() }))

const NOW = new Date('2026-10-19T18:00:00.000Z')
const DAY = 86_400_000
const LONG_TEXT = 'Texto antigo sentinela-rascunho 61 98888-7777. '.repeat(15) // > 600
const STAFF = { email: 'staff-rascunho@teste.local', password: 'senha-equipe-123' }

describe('anúncios do site antigo como rascunho (06-06, M-04)', () => {
  let payload: Payload
  let cats: { id: number; name: string }[]
  let staffUser: Record<string, unknown>

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    cats = (await payload.find({ collection: 'ad-categories', sort: 'order', overrideAccess: true })).docs as never
    const u = await seedStaffUser(payload, STAFF)
    staffUser = { ...(u as unknown as Record<string, unknown>), collection: 'users' }
  })

  const paying = async (email: string) => {
    const acc = await seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0]! })
    await seedSubscription(payload, {
      assinanteId: acc.id,
      startsAt: new Date(NOW.getTime() - DAY).toISOString(),
      endsAt: new Date(NOW.getTime() + 20 * DAY).toISOString(),
    })
    return acc
  }
  const free = (email: string) => seedAssinante(payload, { email, password: 'senha-teste-1234', name: email.split('@')[0]! })
  const draft = (author: number, wpCommentId = 101, extra: Record<string, unknown> = {}) =>
    seedAd(payload, { author, status: 'rascunho', texto: LONG_TEXT, contato: {}, wpCommentId, ...extra } as never)
  const staffReq = () => createLocalReq({ user: staffUser as never }, payload)

  describe('schema rules', () => {
    it('a draft accepts no contact and a long text; the old comment id is unique', async () => {
      const a = await free('a@teste.local')
      const d = await draft(a.id)
      const doc = await payload.findByID({ collection: 'ads', id: d.id, depth: 0, overrideAccess: true })
      expect(doc.status).toBe('rascunho')
      expect(doc.texto.length).toBeGreaterThan(600)
      expect(doc.wpCommentId).toBe(101)
      expect(doc.importadoEm).toBeTruthy()
      expect(doc.criadoNoSiteAntigoEm).toBeTruthy()
      await expect(draft(a.id, 101)).rejects.toThrow()
    })

    it('outside draft the contact and 600-character rules are back', async () => {
      const a = await free('a@teste.local')
      await expect(seedAd(payload, { author: a.id, status: 'pendente', contato: {} } as never)).rejects.toThrow()
      await expect(seedAd(payload, { author: a.id, status: 'pendente', texto: LONG_TEXT })).rejects.toThrow()
    })

    it('REST cannot set wpCommentId (staff) and subscribers cannot write ads at all', async () => {
      const a = await paying('a@teste.local')
      const staffToken = await tokenFor(payload, 'users', STAFF.email, STAFF.password)
      const created = await rest('POST', ['ads'], {
        token: staffToken,
        body: { author: a.id, apelido: 'Casal', euSou: cats[0]!.id, texto: 'Texto curto.', contato: { whatsapp: '5561999990000' }, wpCommentId: 55 },
      })
      expect(created.status).toBe(201)
      const id = (created.json as { doc: { id: number } }).doc.id
      expect((await payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true })).wpCommentId ?? null).toBeNull()

      await payload.update({ collection: 'assinantes', id: a.id, data: { password: 'senha-sub-12345' }, overrideAccess: true })
      const subToken = await tokenFor(payload, 'assinantes', 'a@teste.local', 'senha-sub-12345')
      const denied = await rest('POST', ['ads'], { token: subToken, body: { apelido: 'x' } })
      expect(denied.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('nobody but the author and staff sees a draft', () => {
    it('public preview, members list, ad page, media and reports', async () => {
      const a = await free('a@teste.local')
      const b = await paying('b@teste.local')
      const d = await draft(a.id)
      const photo = await seedAdMedia(payload, { ad: d.id })
      const visible = await seedAd(payload, { author: b.id, status: 'aprovado' })

      const pub = await findPublicAds(payload, {}, NOW)
      expect(pub.items.map((i) => i.id)).toEqual([visible.id])
      const members = await findMemberAds(payload, {}, NOW)
      expect(members.items.map((i) => i.id)).toEqual([visible.id])
      expect(JSON.stringify(members)).not.toContain('sentinela-rascunho')
      expect(await findMemberAd(payload, d.id, NOW)).toBeNull()

      // preview image route: 404
      const res = await previaGET(new Request(`http://localhost/classisex/previa/${photo.id}`), {
        params: Promise.resolve({ id: String(photo.id) }),
      })
      expect(res.status).toBe(404)

      // members media decision: other member 404, anonymous never gets bytes, owner and staff allowed
      const base = { media: { owner: a.id, kind: 'foto' as const }, ad: { status: 'rascunho' }, authorTier: 'gratis' as const, isCover: true, variante: 'foto' as const }
      expect(canViewMedia({ ...base, principal: { collection: 'assinantes', id: b.id }, viewerActive: true })).toBe('not-found')
      expect(canViewMedia({ ...base, principal: null, viewerActive: false })).toBe('unauthenticated')
      expect(canViewMedia({ ...base, principal: { collection: 'assinantes', id: a.id }, viewerActive: false })).toBe('allow')
      expect(canViewMedia({ ...base, principal: { collection: 'users', id: 1 }, viewerActive: false })).toBe('allow')

      // reports refuse a draft like any hidden ad
      await expect(reportAd(payload, { reporterId: b.id, adId: d.id, motivo: 'ofensivo', now: NOW })).rejects.toMatchObject({ status: 404 })
    })

    it("the owner's own list shows the draft with its label", async () => {
      const a = await free('a@teste.local')
      const d = await draft(a.id)
      const own = await listOwnAds(payload, a.id, NOW)
      expect(own).toHaveLength(1)
      expect(own[0]).toMatchObject({ id: d.id, status: 'rascunho', statusLabel: 'Rascunho do site antigo (só você vê)' })
    })
  })

  describe('moderation and limits', () => {
    it('staff cannot approve, refuse or unpublish a draft; counters ignore it', async () => {
      const a = await paying('a@teste.local')
      const d = await draft(a.id)
      const req = await staffReq()
      await expect(approveAd(req, d.id, NOW)).rejects.toMatchObject({ status: 409 })
      await expect(rejectAd(req, d.id, 'motivo de teste', NOW)).rejects.toMatchObject({ status: 409 })
      await expect(unpublishAd(req, d.id, 'motivo de teste', NOW)).rejects.toMatchObject({ status: 409 })
      expect((await payload.findByID({ collection: 'ads', id: d.id, depth: 0, overrideAccess: true })).status).toBe('rascunho')
      expect((await getModerationCounts(payload)).pendentes).toBe(0)
    })

    it('the owner submits an old draft to the queue; the 600-character cap and the contact do not apply to it', async () => {
      const a = await paying('a@teste.local')
      const d = await draft(a.id)
      const input = { apelido: 'Casal Teste', euSou: cats[0]!.id, cidade: 'Brasília', texto: LONG_TEXT, whatsapp: '5561999990000', telegram: '', consent: true }
      // 2026-10-22: only the generous ceiling applies to an old ad
      await expect(
        updateAd(payload, { assinanteId: a.id, id: d.id, input: { ...input, texto: 'a'.repeat(5001) }, now: NOW }),
      ).rejects.toMatchObject({ code: 'invalido' })
      expect((await payload.findByID({ collection: 'ads', id: d.id, depth: 0, overrideAccess: true })).status).toBe('rascunho')

      await updateAd(payload, { assinanteId: a.id, id: d.id, input: { ...input, whatsapp: '' }, now: NOW })
      const after = await payload.findByID({ collection: 'ads', id: d.id, depth: 0, overrideAccess: true })
      expect(after.status).toBe('pendente')
      expect(after.submittedAt).toBe(NOW.toISOString())
      expect(after.texto.length).toBeGreaterThan(600)
      expect(after.wpCommentId).toBe(101)
      expect(after.criadoNoSiteAntigoEm).toBeTruthy()
      expect((await getModerationCounts(payload)).pendentes).toBe(1)
    })

    it('old ads never count toward the 3 active ads, and sending one is not blocked by the limit', async () => {
      const a = await paying('a@teste.local')
      for (let i = 0; i < 3; i++) await seedAd(payload, { author: a.id, status: i === 0 ? 'aprovado' : 'pendente' })
      const d1 = await draft(a.id, 201)
      const d2 = await draft(a.id, 202)
      const input = { apelido: 'Casal Teste', euSou: cats[0]!.id, cidade: '', texto: 'Texto curto.', whatsapp: '5561999990000', telegram: '', consent: true }
      await updateAd(payload, { assinanteId: a.id, id: d1.id, input, now: NOW })
      await updateAd(payload, { assinanteId: a.id, id: d2.id, input, now: NOW })
      expect((await payload.findByID({ collection: 'ads', id: d1.id, depth: 0, overrideAccess: true })).status).toBe('pendente')
      // ... but a NEW ad of the same author still hits the limit of 3
      const { createAd } = await import('../../src/lib/classisex/service')
      await expect(createAd(payload, { assinanteId: a.id, input, now: NOW })).rejects.toMatchObject({ code: 'limite' })
    })

    it('touching the photos of a draft does not submit it', async () => {
      const a = await free('a@teste.local')
      const d = await draft(a.id)
      const { attachMedia, removeMedia } = await import('../../src/lib/classisex/service')
      const fs = await import('node:fs')
      const path = await import('node:path')
      const data = fs.readFileSync(path.resolve(__dirname, '../fixtures/flyer-square.jpg'))
      const m = await attachMedia(payload, {
        assinanteId: a.id,
        adId: d.id,
        file: { data, mimetype: 'image/jpeg', name: 'a.jpg', size: data.length },
        now: NOW,
      })
      expect((await payload.findByID({ collection: 'ads', id: d.id, depth: 0, overrideAccess: true })).status).toBe('rascunho')
      await removeMedia(payload, { assinanteId: a.id, mediaId: m.id, now: NOW })
      expect((await payload.findByID({ collection: 'ads', id: d.id, depth: 0, overrideAccess: true })).status).toBe('rascunho')
    })
  })

  describe('importer-only photo limit bypass (T-06-23)', () => {
    // since 2026-10-22 an ad that carries wpCommentId is exempt from the tier count on its own; the T-06-23 flag
    // is still the importer's switch for any other ad, so these two tests use a draft WITHOUT wpCommentId
    const plainDraft = (author: number) => seedAd(payload, { author, status: 'rascunho', texto: 'Rascunho comum.', contato: {} })

    it('free author: two photos with legacyImport, the limit otherwise', async () => {
      const a = await free('a@teste.local')
      const d = await plainDraft(a.id)
      const upload = (context?: Record<string, unknown>) =>
        payload.create({
          collection: 'ad-media' as never,
          data: { ad: d.id, order: 0 } as never,
          filePath: new URL('../fixtures/flyer-square.jpg', import.meta.url).pathname,
          depth: 0,
          overrideAccess: true,
          ...(context ? { context } : {}),
        })
      await upload()
      await expect(upload()).rejects.toThrow()
      await upload({ legacyImport: true })
      await upload({ legacyImport: true })
      const { totalDocs } = await payload.count({ collection: 'ad-media', where: { ad: { equals: d.id } }, overrideAccess: true })
      expect(totalDocs).toBe(3)
    })

    it('the flag has no effect on a staff REST upload', async () => {
      const a = await free('a@teste.local')
      const d = await plainDraft(a.id)
      await seedAdMedia(payload, { ad: d.id })
      const staffToken = await tokenFor(payload, 'users', STAFF.email, STAFF.password)
      // REST cannot set req.context: whatever the body says, the limit still holds
      const fs = await import('node:fs')
      const form = new FormData()
      form.append('_payload', JSON.stringify({ ad: d.id, order: 1, legacyImport: true }))
      form.append('file', new Blob([fs.readFileSync(new URL('../fixtures/flyer-square.jpg', import.meta.url))], { type: 'image/jpeg' }), 'b.jpg')
      const { config } = await import('../../src/payload.config').then((m) => ({ config: m.default }))
      const routes = await import('@payloadcms/next/routes')
      const res = await routes.REST_POST(config)(
        new Request('http://localhost:3000/api/ad-media', { method: 'POST', headers: { authorization: `JWT ${staffToken}` }, body: form }),
        { params: Promise.resolve({ slug: ['ad-media'] }) },
      )
      expect(res.status).toBeGreaterThanOrEqual(400)
      expect(await res.text()).toContain('Conta gratuita: 1 foto por anúncio')
      const { totalDocs } = await payload.count({ collection: 'ad-media', where: { ad: { equals: d.id } }, overrideAccess: true })
      expect(totalDocs).toBe(1)
    })
  })
})

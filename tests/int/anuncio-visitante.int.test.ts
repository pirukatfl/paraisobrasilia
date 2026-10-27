import fs from 'fs'
import os from 'os'
import path from 'path'
import { createLocalReq, type Payload, type PayloadRequest } from 'payload'
import sharp from 'sharp'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { findPublicAds } from '../../src/lib/classisex/board'
import type { AdInput } from '../../src/lib/classisex/rules'
import { createVisitorAd, type VisitorAdInput } from '../../src/lib/classisex/visitante'
import { approveAd, approveAds, getModerationView, rejectAd, unpublishAd } from '../../src/lib/classisex/service'
import { buildMp4 } from '../helpers/mp4-fixtures'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedStaffUser } from '../helpers/seed'

const NOW = new Date('2026-10-23T15:00:00.000Z')
let seq = 0
// every test uses its own ip / e-mail so the in-memory limiter never leaks between tests
const fresh = () => {
  seq += 1
  return { ip: `203.0.113.${seq}`, email: `Visitante${seq}@Exemplo.com` }
}

const jpeg = (w = 900, h = 700) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 90, g: 120, b: 60 } } }).jpeg().toBuffer()

describe('ad sent without an account (S-02..S-09, S-12)', () => {
  let payload: Payload
  let casal: number
  let staffReq: PayloadRequest
  let member: { id: number }

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    const { docs } = await payload.find({ collection: 'ad-categories', sort: 'order', limit: 1, overrideAccess: true })
    casal = docs[0].id as number
    const u = await seedStaffUser(payload, { email: 'staff-vis@teste.local', password: 'senha-equipe-123' })
    staffReq = await createLocalReq({ user: { ...(u as unknown as Record<string, unknown>), collection: 'users' } as never }, payload)
    member = await seedAssinante(payload, { email: 'membro-vis@teste.local', password: 'senha-membro-1234', name: 'Membro' })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  const input = (over: Partial<AdInput> = {}): AdInput => ({
    apelido: 'Casal Visita',
    euSou: casal,
    cidade: 'Brasília',
    texto: 'Casal simpático procura amigos para a festa. Ligue 61 99988-9772.',
    whatsapp: '5561999889772',
    telegram: '',
    emailContato: '',
    links: [],
    observacao: '',
    consent: true,
    ...over,
  })

  async function send(over: Omit<Partial<VisitorAdInput>, 'input'> & { input?: Partial<AdInput> } = {}) {
    const who = fresh()
    const { input: partial, ...rest } = over
    return createVisitorAd(payload, {
      input: input(partial),
      email: over.email ?? who.email,
      termos: true,
      website: '',
      files: [{ data: await jpeg(), mimetype: 'image/jpeg', name: 'foto.jpg', size: 1000 }],
      ip: over.ip ?? who.ip,
      now: NOW,
      ...rest,
    } as VisitorAdInput)
  }

  const ad = (id: number) => payload.findByID({ collection: 'ads', id, depth: 0, overrideAccess: true }) as unknown as Promise<Record<string, unknown>>
  const countAds = async () => (await payload.count({ collection: 'ads', overrideAccess: true })).totalDocs
  const mediaOf = async (id: number) =>
    (await payload.find({ collection: 'ad-media', where: { ad: { equals: id } }, depth: 0, overrideAccess: true })).docs

  it('creates a pending ad with NO author, with the e-mail lower-cased and one photo', async () => {
    const who = fresh()
    const { id } = await send({ email: who.email, ip: who.ip })
    const doc = await ad(id!)
    expect(doc.status).toBe('pendente')
    expect(doc.enviadoSemConta).toBe(true)
    expect(doc.emailVisitante).toBe(who.email.toLowerCase())
    expect(doc.author ?? null).toBeNull()
    const media = await mediaOf(id!)
    expect(media.map((m) => m.kind)).toEqual(['foto'])
    expect(media[0].owner ?? null).toBeNull()
    // no technical account is created any more
    const { totalDocs } = await payload.count({ collection: 'assinantes', where: { email: { equals: 'visitantes@invalid.paraiso.local' } }, overrideAccess: true })
    expect(totalDocs).toBe(0)
  })

  it('works without a photo too (the photo is optional)', async () => {
    const { id } = await send({ files: [] })
    expect(await mediaOf(id!)).toHaveLength(0)
    expect((await ad(id!)).status).toBe('pendente')
  })

  it('staff can create an ad without an author and upload media to it (owner stays empty); later set an author', async () => {
    const created = await payload.create({
      collection: 'ads',
      data: { apelido: 'Sem dono', euSou: casal, texto: 'Anúncio criado pela equipe sem anunciante.', status: 'pendente' } as never,
      overrideAccess: true,
    })
    expect((created as unknown as Record<string, unknown>).author ?? null).toBeNull()
    const m = await payload.create({
      collection: 'ad-media',
      data: { ad: created.id, order: 0 } as never,
      file: { data: await jpeg(), mimetype: 'image/jpeg', name: 'foto.jpg', size: 1000 },
      depth: 0,
      overrideAccess: true,
    })
    expect((m as unknown as Record<string, unknown>).owner ?? null).toBeNull()
    // staff may fill the empty author afterwards
    const updated = await payload.update({
      collection: 'ads',
      id: created.id,
      data: { author: member.id } as never,
      overrideAccess: true,
    })
    const a = updated.author
    expect(typeof a === 'object' && a ? a.id : a).toBe(member.id)
  })

  it('refuses two photos and creates nothing', async () => {
    const f = { data: await jpeg(), mimetype: 'image/jpeg', name: 'a.jpg', size: 1000 }
    await expect(send({ files: [f, f] })).rejects.toMatchObject({ code: 'fotos-sem-conta' })
    expect(await countAds()).toBe(0)
  })

  it('refuses any video and creates nothing', async () => {
    const video = { data: buildMp4({ durationSeconds: 5 }), mimetype: 'video/mp4', name: 'v.mp4', size: 5000 }
    await expect(send({ files: [video] })).rejects.toMatchObject({ code: 'video-sem-conta' })
    await expect(send({ files: [{ ...video, mimetype: 'video/quicktime' }] })).rejects.toMatchObject({ code: 'video-sem-conta' })
    expect(await countAds()).toBe(0)
  })

  it('refuses a file that is not a photo type or is too large', async () => {
    const data = await jpeg()
    await expect(send({ files: [{ data, mimetype: 'application/pdf', name: 'a.pdf', size: 10 }] })).rejects.toMatchObject({ code: 'tipo' })
    await expect(send({ files: [{ data, mimetype: 'image/jpeg', name: 'a.jpg', size: 15_000_001 }] })).rejects.toMatchObject({ code: 'grande' })
    expect(await countAds()).toBe(0)
  })

  it('applies the same text rules as a paying author', async () => {
    const longText = await send({ input: { texto: 'a'.repeat(601) } }).catch((e) => e)
    expect(longText.errors.texto).toBeTruthy()
    const nickWithPhone = await send({ input: { apelido: 'Casal 61 99988-9772' } }).catch((e) => e)
    expect(nickWithPhone.errors.apelido).toBeTruthy()
    const noConsent = await send({ input: { consent: false } }).catch((e) => e)
    expect(noConsent.errors.consent).toBeTruthy()
    expect(await countAds()).toBe(0)
  })

  it('accepts an ad with no contact and no e-mail (both optional); only the IP limit applies', async () => {
    const r = await send({ email: '', input: { whatsapp: '', telegram: '' } })
    expect(r.id).toEqual(expect.any(Number))
    const doc = await payload.findByID({ collection: 'ads', id: r.id as number, depth: 0, overrideAccess: true })
    expect(doc.status).toBe('pendente')
    expect(doc.emailVisitante ?? null).toBeNull()
  })

  it('validates e-mail (when given) and terms', async () => {
    const err = await send({ email: 'sem-arroba', termos: false }).catch((e) => e)
    expect(err.code).toBe('invalido')
    expect(Object.keys(err.errors)).toEqual(expect.arrayContaining(['email', 'termos']))
    expect(await countAds()).toBe(0)
  })

  it('a filled honeypot answers success and creates nothing', async () => {
    const result = await send({ website: 'http://spam.example' })
    expect(result).toEqual({ id: null })
    expect(await countAds()).toBe(0)
    expect((await payload.count({ collection: 'assinantes', overrideAccess: true })).totalDocs).toBe(1) // only the member
  })

  it('allows 3 active ads per e-mail (any letter case); a refused one does not count', async () => {
    const ip = (n: number) => `198.51.100.${n}`
    const email = 'Mesmo@Exemplo.com'
    const first = await send({ email, ip: ip(1), files: [] })
    await send({ email: email.toLowerCase(), ip: ip(2), files: [] })
    await send({ email: email.toUpperCase(), ip: ip(3), files: [] })
    await expect(send({ email, ip: ip(4), files: [] })).rejects.toMatchObject({ code: 'limite', status: 409 })
    await rejectAd(staffReq, first.id!, 'Fora das regras', NOW)
    await expect(send({ email, ip: ip(5), files: [] })).resolves.toMatchObject({ id: expect.any(Number) })
    // another e-mail is unaffected
    await expect(send({ files: [] })).resolves.toMatchObject({ id: expect.any(Number) })
  })

  it('stops the 6th attempt of one IP within the hour (429)', async () => {
    const ip = '192.0.2.77'
    for (let i = 0; i < 5; i++) await send({ ip, files: [], email: `ip${i}-${Date.now()}@exemplo.com` })
    await expect(send({ ip, files: [], email: `ip6-${Date.now()}@exemplo.com` })).rejects.toMatchObject({ code: 'envios', status: 429 })
    // attempts that fail validation do not count
    const other = '192.0.2.78'
    for (let i = 0; i < 8; i++) await send({ ip: other, files: [], input: { texto: '' } }).catch(() => undefined)
    await expect(send({ ip: other, files: [] })).resolves.toMatchObject({ id: expect.any(Number) })
  })

  it('stops the 6th attempt for one e-mail within the hour', async () => {
    // 3 active ads is the lower bound; refuse each so the e-mail limit (5/h) is what trips
    const email = `mesmo-${Date.now()}@exemplo.com`
    for (let i = 0; i < 5; i++) {
      const r = await send({ email, files: [] })
      await rejectAd(staffReq, r.id!, 'Fora das regras', NOW)
    }
    await expect(send({ email, files: [] })).rejects.toMatchObject({ code: 'envios', status: 429 })
  })

  it('deletes the ad when the photo is rejected by the media hook', async () => {
    const bad = { data: Buffer.from('isto não é uma imagem'), mimetype: 'image/jpeg', name: 'x.jpg', size: 20 }
    await expect(send({ files: [bad] })).rejects.toMatchObject({ code: 'foto-ilegivel' })
    expect(await countAds()).toBe(0)
  })

  it('staff can fill the empty author once, but a real owner cannot be swapped afterwards', async () => {
    const { id } = await send({ files: [] })
    await payload.update({ collection: 'ads', id: id!, data: { author: member.id } as never, overrideAccess: true })
    const other = await seedAssinante(payload, { email: 'outro-vis@teste.local', password: 'senha-membro-1234', name: 'Outro' })
    await expect(
      payload.update({ collection: 'ads', id: id!, data: { author: other.id } as never, overrideAccess: true }),
    ).rejects.toThrow()
  })

  it('the e-mail field cannot be written or read outside the service (REST access)', async () => {
    const { id } = await send({ files: [] })
    const staff = { ...(staffReq.user as unknown as Record<string, unknown>) }
    const asStaff = (await payload.findByID({ collection: 'ads', id: id!, depth: 0, overrideAccess: false, user: staff as never })) as unknown as Record<string, unknown>
    expect(asStaff.emailVisitante).toBeTruthy() // staff read it
    const updated = (await payload.update({
      collection: 'ads',
      id: id!,
      data: { emailVisitante: 'troca@exemplo.com', enviadoSemConta: false } as never,
      overrideAccess: false,
      user: staff as never,
    })) as unknown as Record<string, unknown>
    const after = await ad(id!)
    expect(after.emailVisitante).not.toBe('troca@exemplo.com')
    expect(after.enviadoSemConta).toBe(true)
    expect(updated.id).toBe(id)
    const asMember = (await payload
      .findByID({ collection: 'ads', id: id!, depth: 0, overrideAccess: false, user: { ...member, collection: 'assinantes' } as never })
      .catch(() => null)) as unknown as Record<string, unknown> | null
    expect(asMember?.emailVisitante).toBeUndefined()
  })

  describe('visibility and e-mail secrecy', () => {
    it('after approval the open board shows redacted text and the sharp cover, without contacts or the e-mail', async () => {
      const who = fresh()
      const { id } = await send({ email: who.email, ip: who.ip })
      expect((await findPublicAds(payload, {} as never, NOW)).items).toHaveLength(0) // pending: invisible
      await approveAd(staffReq, id!, NOW)
      const board = await findPublicAds(payload, {} as never, NOW)
      expect(board.items).toHaveLength(1)
      const json = JSON.stringify(board)
      expect(board.items[0].foto?.previewUrl).toMatch(/^\/classisex\/previa\/\d+$/)
      expect(json).not.toContain('99988')
      expect(json).not.toContain('5561999889772')
      expect(json.toLowerCase()).not.toContain(who.email.toLowerCase())
      expect(json).not.toContain('invalid.paraiso.local')
    })

    it('the moderation view says "Sem conta (visitante)" and never carries the e-mail', async () => {
      const who = fresh()
      const { id } = await send({ email: who.email, ip: who.ip })
      const view = await getModerationView(staffReq, id!)
      expect(view.contaAutor).toBe('Sem conta (visitante)')
      expect(view.semConta).toBe(true)
      expect(JSON.stringify(view).toLowerCase()).not.toContain(who.email.toLowerCase())
      const member = await seedAd(payload, { author: (await seedAssinante(payload, { email: 'x-vis@teste.local', password: 'senha-xis-12345', name: 'Xis' })).id })
      const memberView = await getModerationView(staffReq, member.id)
      expect(memberView.semConta).toBe(false)
      expect(memberView.contaAutor).toBe('Conta gratuita')
    })

    it('moderation audit rows never contain the visitor e-mail', async () => {
      const a = fresh()
      const b = fresh()
      const first = await send({ email: a.email, ip: a.ip, files: [] })
      const second = await send({ email: b.email, ip: b.ip, files: [] })
      await approveAd(staffReq, first.id!, NOW)
      await rejectAd(staffReq, second.id!, 'Não cumpre as regras', NOW)
      await unpublishAd(staffReq, first.id!, 'Pedido da equipe', NOW)
      const { docs } = await payload.find({ collection: 'audit-log', depth: 0, overrideAccess: true, limit: 100 })
      const dump = JSON.stringify(docs).toLowerCase()
      expect(docs.length).toBeGreaterThanOrEqual(3)
      expect(dump).not.toContain(a.email.toLowerCase())
      expect(dump).not.toContain(b.email.toLowerCase())
    })
  })

  describe('e-mail notice to the visitor (S-07)', () => {
    const capture = () => {
      vi.stubEnv('EMAIL_CAPTURE_DIR', fs.mkdtempSync(path.join(os.tmpdir(), 'sem-conta-')))
      return vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
    }

    it('sends exactly one e-mail on approve, refuse and unpublish, to the visitor only', async () => {
      const spy = capture()
      const a = fresh()
      const b = fresh()
      const first = await send({ email: a.email, ip: a.ip, files: [] })
      const second = await send({ email: b.email, ip: b.ip, files: [] })
      await approveAd(staffReq, first.id!, NOW)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toMatchObject({ to: a.email.toLowerCase() })
      await rejectAd(staffReq, second.id!, 'Não cumpre as regras', NOW)
      expect(spy).toHaveBeenCalledTimes(2)
      expect(spy.mock.calls[1][0]).toMatchObject({ to: b.email.toLowerCase() })
      expect(String((spy.mock.calls[1][0] as { text: string }).text)).toContain('Não cumpre as regras')
      await unpublishAd(staffReq, first.id!, 'Pedido da pessoa', NOW)
      expect(spy).toHaveBeenCalledTimes(3)
    })

    it('bulk approval notices each visitor ad once; a member ad sends nothing', async () => {
      const spy = capture()
      const a = fresh()
      const first = await send({ email: a.email, ip: a.ip, files: [] })
      const mine = await seedAd(payload, { author: member.id })
      await approveAds(staffReq, [first.id, mine.id], NOW)
      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toMatchObject({ to: a.email.toLowerCase() })
    })

    it('a member ad gets no visitor notice', async () => {
      const spy = capture()
      const mine = await seedAd(payload, { author: member.id })
      await approveAd(staffReq, mine.id, NOW)
      expect(spy).not.toHaveBeenCalled()
    })

    it('does nothing when e-mail is off and survives a send failure', async () => {
      const spy = vi.spyOn(payload, 'sendEmail').mockResolvedValue(undefined as never)
      const a = fresh()
      const first = await send({ email: a.email, ip: a.ip, files: [] })
      await approveAd(staffReq, first.id!, NOW) // no SMTP, no capture dir
      expect(spy).not.toHaveBeenCalled()

      vi.stubEnv('EMAIL_CAPTURE_DIR', fs.mkdtempSync(path.join(os.tmpdir(), 'sem-conta-')))
      spy.mockRejectedValue(new Error('smtp caiu'))
      const logged = vi.spyOn(payload.logger, 'error')
      const b = fresh()
      const second = await send({ email: b.email, ip: b.ip, files: [] })
      await expect(approveAd(staffReq, second.id!, NOW)).resolves.toMatchObject({ status: 'aprovado' })
      expect((await ad(second.id!)).status).toBe('aprovado')
      const lines = logged.mock.calls.map((c) => String(c[0])).join('\n')
      expect(lines).toContain(String(second.id))
      expect(lines.toLowerCase()).not.toContain(b.email.toLowerCase())
    })
  })
})

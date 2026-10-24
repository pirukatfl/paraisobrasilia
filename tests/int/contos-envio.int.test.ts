import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { ServiceError } from '@/lib/classisex/service'
import { CONTO_MAX_PER_HOUR, createVisitorConto, type VisitorContoInput } from '@/lib/contos/envio'
import { toContoCardDTO } from '@/lib/contos/dto'
import { findPublishedConto, findPublishedContos } from '@/lib/contos/reads'

import { rest, tokenFor } from '../helpers/rest'
import { getTestPayload, resetDatabase, seedStaffUser } from '../helpers/seed'

const NOW = new Date('2026-10-24T15:00:00.000Z')
let seq = 0
// every test uses its own ip / e-mail so the in-memory limiter never leaks between tests
const fresh = () => {
  seq += 1
  return { ip: `198.51.100.${seq}`, email: `Leitor${seq}@Exemplo.com` }
}

const png = (w = 800, h = 600) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 60, b: 90 } } }).png().toBuffer()

const TEXTO = Array.from({ length: 6 }, (_, i) => `Parágrafo ${i + 1} do conto enviado. ${'Palavras de enchimento para o conto. '.repeat(4)}`).join('\n\n')

describe('conto sent without an account', () => {
  let payload: Payload
  let token: string

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await payload.delete({ collection: 'media', where: { id: { exists: true } }, overrideAccess: true })
    await seedStaffUser(payload, { email: 'staff-conto@teste.local', password: 'senha-equipe-123' })
    token = await tokenFor(payload, 'users', 'staff-conto@teste.local', 'senha-equipe-123')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  async function send(over: Partial<VisitorContoInput> & { withImage?: boolean } = {}) {
    const who = fresh()
    const { withImage = true, ...rest } = over
    return createVisitorConto(payload, {
      title: 'Uma noite no Paraíso',
      assinadoComo: 'Casal BSB',
      texto: TEXTO,
      email: who.email,
      consent: true,
      termos: true,
      website: '',
      file: withImage ? { data: await png(), mimetype: 'image/png', name: 'capa.png', size: 5000 } : null,
      ip: who.ip,
      now: NOW,
      ...rest,
    })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loosely typed read of a populated document
  type Doc = Record<string, any>
  const conto = async (id: number) =>
    (await payload.findByID({ collection: 'contos', id, depth: 1, draft: true, overrideAccess: true })) as unknown as Doc
  const countContos = async () => (await payload.count({ collection: 'contos', overrideAccess: true })).totalDocs
  const publish = (id: number) =>
    payload.update({ collection: 'contos', id, data: { _status: 'published' }, overrideAccess: true })

  it('creates a DRAFT with the marker, the staff-only e-mail and a pending image', async () => {
    const { id } = await send()
    const doc = await conto(id!)
    expect(doc._status).toBe('draft')
    expect(doc.enviadoPorVisitante).toBe(true)
    expect(doc.assinadoComo).toBe('Casal BSB')
    expect(doc.slug).toBe('uma-noite-no-paraiso')
    expect(doc.emailVisitante).toMatch(/@exemplo\.com$/)
    expect(doc.emailVisitante).toBe(doc.emailVisitante.toLowerCase())
    expect(doc.publishedAt).toBe(NOW.toISOString())
    expect(doc.paragrafosAbertos).toBe(3)
    expect(doc.texto.root.children).toHaveLength(6)
    expect(doc.imagem.pendente).toBe(true)
    expect(doc.imagem.alt).toBe('Imagem do conto Uma noite no Paraíso')
    // nothing public yet
    expect((await findPublishedContos(payload)).totalDocs).toBe(0)
    expect(await findPublishedConto(payload, doc.slug)).toBeNull()
  })

  it('works without image or e-mail', async () => {
    const { id } = await send({ withImage: false, email: '' })
    const doc = await conto(id!)
    expect(doc.imagem ?? null).toBeNull()
    expect(doc.emailVisitante ?? null).toBeNull()
  })

  it('adds a short suffix when the slug is taken', async () => {
    const a = await send({ withImage: false })
    const b = await send({ withImage: false })
    const [da, db] = [await conto(a.id!), await conto(b.id!)]
    expect(da.slug).toBe('uma-noite-no-paraiso')
    expect(db.slug).toMatch(/^uma-noite-no-paraiso-[0-9a-f]{6}$/)
  })

  it('a filled honeypot creates nothing and looks like success', async () => {
    const res = await send({ website: 'http://spam.example' })
    expect(res.id).toBeNull()
    expect(await countContos()).toBe(0)
    expect((await payload.count({ collection: 'media', overrideAccess: true })).totalDocs).toBe(0)
  })

  it.each([
    ['short text', { texto: 'curto demais' }, 'texto'],
    ['phone in the text', { texto: `${TEXTO}\n\nMe chame no 61 99988-9772 agora.` }, 'texto'],
    ['e-mail in the text', { texto: `${TEXTO}\n\nfale com casal@gmail.com` }, 'texto'],
    ['contact in the title', { title: 'Zap 61 99988-9772' }, 'title'],
    ['@ in the nickname', { assinadoComo: '@casalbsb' }, 'assinadoComo'],
    ['no declaration', { consent: false }, 'consent'],
    ['no terms', { termos: false }, 'termos'],
    ['bad e-mail', { email: 'sem-arroba' }, 'email'],
  ] as const)('refuses %s and writes nothing', async (_name, over, field) => {
    const err = await send(over as Partial<VisitorContoInput>).catch((e: unknown) => e)
    expect(err).toBeInstanceOf(ServiceError)
    expect((err as ServiceError).code).toBe('invalido')
    expect((err as ServiceError).errors).toHaveProperty(field)
    expect(await countContos()).toBe(0)
    expect((await payload.count({ collection: 'media', overrideAccess: true })).totalDocs).toBe(0)
  })

  it('refuses a non-image file and a video', async () => {
    for (const mimetype of ['video/mp4', 'application/pdf', 'image/svg+xml']) {
      const err = await send({ file: { data: Buffer.from('x'), mimetype, name: 'a.bin', size: 1 } }).catch((e: unknown) => e)
      expect((err as ServiceError).code).toBe('tipo')
    }
    const big = await send({ file: { data: Buffer.from('x'), mimetype: 'image/png', name: 'a.png', size: 16_000_000 } }).catch((e: unknown) => e)
    expect((big as ServiceError).code).toBe('grande')
    const broken = await send({ file: { data: Buffer.from('not an image'), mimetype: 'image/png', name: 'a.png', size: 12 } }).catch((e: unknown) => e)
    expect((broken as ServiceError).code).toBe('foto-ilegivel')
    expect(await countContos()).toBe(0)
    expect((await payload.count({ collection: 'media', overrideAccess: true })).totalDocs).toBe(0)
  })

  it(`rate-limits per IP after ${CONTO_MAX_PER_HOUR} valid submissions in an hour`, async () => {
    const ip = '198.51.100.250'
    for (let i = 0; i < CONTO_MAX_PER_HOUR; i += 1) await send({ ip, withImage: false })
    const err = await send({ ip, withImage: false }).catch((e: unknown) => e)
    expect((err as ServiceError).code).toBe('envios')
    expect((err as ServiceError).status).toBe(429)
    expect(await countContos()).toBe(CONTO_MAX_PER_HOUR)
  })

  it('anonymous REST never reads the contos (text, e-mail) at all', async () => {
    const { id } = await send()
    await publish(id!)
    for (const path of [['contos'], ['contos', String(id)]]) {
      const res = await rest('GET', path)
      expect([401, 403]).toContain(res.status)
      expect(res.text).not.toContain('emailVisitante')
      expect(res.text).not.toContain('Parágrafo 6')
    }
  })

  it('the pending image is unreadable for the public (document and files) and readable once the conto is published', async () => {
    const { id } = await send()
    const doc = await conto(id!)
    const mediaId = doc.imagem.id as number
    const files = [doc.imagem.filename as string, doc.imagem.sizes.card.filename as string]
    expect(files.every(Boolean)).toBe(true)

    const anonymousReads = async () => ({
      byId: await rest('GET', ['media', String(mediaId)]),
      list: await rest('GET', ['media']),
      files: await Promise.all(files.map((f) => rest('GET', ['media', 'file', f]))),
    })

    // pending: not found / forbidden for anonymous, nothing listed
    const pending = await anonymousReads()
    expect([403, 404]).toContain(pending.byId.status)
    expect((pending.list.json as { totalDocs: number }).totalDocs).toBe(0)
    for (const f of pending.files) expect([403, 404]).toContain(f.status)
    // the Local API with access enforced agrees
    const local = await payload.find({ collection: 'media', overrideAccess: false, user: null })
    expect(local.totalDocs).toBe(0)
    // staff see it
    expect((await rest('GET', ['media', String(mediaId)], { token })).status).toBe(200)
    expect((await rest('GET', ['media', 'file', files[0]!], { token })).status).toBe(200)

    // a draft save of the conto does not release it
    await payload.update({ collection: 'contos', id: id!, data: { title: 'Outro título' }, draft: true, overrideAccess: true })
    expect([403, 404]).toContain((await rest('GET', ['media', String(mediaId)])).status)

    // published: public
    await publish(id!)
    const open = await anonymousReads()
    expect(open.byId.status).toBe(200)
    expect((open.list.json as { totalDocs: number }).totalDocs).toBe(1)
    for (const f of open.files) expect(f.status).toBe(200)
    expect((await conto(id!)).imagem.pendente).toBe(false)
  })

  it('other media stay public (flyers, existing images)', async () => {
    const file = { data: await png(), mimetype: 'image/png', name: 'flyer.png', size: 5000 }
    const flyer = await payload.create({ collection: 'media', data: { alt: 'Flyer' }, file, overrideAccess: true })
    expect((await rest('GET', ['media', String(flyer.id)])).status).toBe(200)
  })

  it('a published conto exposes its image only through the DTO image and keeps the paywall', async () => {
    const { id } = await send()
    await publish(id!)
    const page = await findPublishedContos(payload)
    const card = toContoCardDTO(page.items[0]!)
    expect(card.imagem?.url).toContain('/api/media/file/')
    expect(card.imagem?.alt).toBe('Imagem do conto Uma noite no Paraíso')
    expect(card.assinadoComo).toBe('Casal BSB')
    expect(JSON.stringify(card)).not.toContain('exemplo.com')
    expect(JSON.stringify(card)).not.toContain('Parágrafo 6')
  })
})

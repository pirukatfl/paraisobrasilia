import fs from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { ServiceError, type UploadFile } from '@/lib/classisex/service'
import { privateMediaDir } from '@/lib/classisex/storage'
import { MIDIA_MAX_POR_HORA, anexarArquivoMidia, criarEnvioMidia, type EnvioMidiaParams } from '@/lib/midia-enviada/envio'
import { criarToken, lerToken, TOKEN_TTL_MS } from '@/lib/midia-enviada/token'
import { normalizarContato } from '@/lib/midia-enviada/regras'

import { buildMp4 } from '../helpers/mp4-fixtures'
import { graphql, rest, tokenFor } from '../helpers/rest'
import { getTestPayload, resetDatabase, seedAssinante, seedStaffUser } from '../helpers/seed'

const NOW = new Date('2026-11-02T15:00:00.000Z')
let seq = 0
// every test uses its own ip / contact so the in-memory limiter never leaks between tests
const fresh = () => {
  seq += 1
  return { ip: `203.0.113.${seq}`, contato: `Frequentador${seq}@Exemplo.com` }
}

const png = (w = 800, h = 600) =>
  sharp({ create: { width: w, height: h, channels: 3, background: { r: 120, g: 60, b: 90 } } }).png().toBuffer()

async function foto(name = 'foto.png'): Promise<UploadFile> {
  const data = await png()
  return { data, mimetype: 'image/png', name, size: data.length }
}
function video(seconds = 10, name = 'video.mp4'): UploadFile {
  const data = buildMp4({ durationSeconds: seconds })
  return { data, mimetype: 'video/mp4', name, size: data.length }
}

describe('fotos e vídeos enviados sem conta', () => {
  let payload: Payload
  let token: string

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedStaffUser(payload, { email: 'staff-midia@teste.local', password: 'senha-equipe-123' })
    token = await tokenFor(payload, 'users', 'staff-midia@teste.local', 'senha-equipe-123')
  })

  async function send(over: Partial<EnvioMidiaParams> = {}) {
    const who = fresh()
    return criarEnvioMidia(payload, {
      apelido: 'Casal BSB',
      contato: who.contato,
      mensagem: 'Fotos da festa de sábado',
      maior18: true,
      autorizacao: true,
      website: '',
      files: [await foto()],
      ip: who.ip,
      now: NOW,
      ...over,
    })
  }

  const countEnvios = async () => (await payload.count({ collection: 'envios-midia', overrideAccess: true })).totalDocs
  const countArquivos = async () => (await payload.count({ collection: 'envios-midia-arquivos', overrideAccess: true })).totalDocs
  const arquivos = async (envio: number) =>
    (await payload.find({ collection: 'envios-midia-arquivos', where: { envio: { equals: envio } }, overrideAccess: true, limit: 50, depth: 0 })).docs

  it('creates the submission as "novo" with the consent time, and stores the photo', async () => {
    const { id, token: t } = await send()
    expect(id).not.toBeNull()
    expect(t).toBeTruthy()
    const doc = await payload.findByID({ collection: 'envios-midia', id: id!, overrideAccess: true, depth: 0 })
    expect(doc.status).toBe('novo')
    expect(doc.apelido).toBe('Casal BSB')
    expect(doc.contato).toMatch(/@exemplo\.com$/)
    expect(doc.contato).toBe(doc.contato.toLowerCase())
    expect(doc.consentAt).toBe(NOW.toISOString())
    const files = await arquivos(id!)
    expect(files).toHaveLength(1)
    expect(files[0]!.kind).toBe('foto')
  })

  it('accepts a WhatsApp number as contact (digits only are stored)', async () => {
    const { id } = await send({ contato: '(61) 99988-9772' })
    expect((await payload.findByID({ collection: 'envios-midia', id: id!, overrideAccess: true, depth: 0 })).contato).toBe('61999889772')
    expect(normalizarContato('abc')).toBeNull()
    expect(normalizarContato('123')).toBeNull()
    expect(normalizarContato('a@b.co')).toBe('a@b.co')
  })

  it('stores the files in the private directory, outside the public media directory', async () => {
    const { id } = await send()
    const [file] = await arquivos(id!)
    const stored = path.join(privateMediaDir(), file!.filename!)
    expect(fs.existsSync(stored)).toBe(true)
    const publicDir = path.resolve(process.env.MEDIA_DIR || 'media')
    expect(path.relative(publicDir, stored).startsWith('..')).toBe(true)
  })

  it('adds more files with the token flow and enforces 10 photos and 2 videos', async () => {
    const { id } = await send()
    for (let i = 0; i < 9; i += 1) await anexarArquivoMidia(payload, id!, await foto(`f${i}.png`))
    const eleventh = await anexarArquivoMidia(payload, id!, await foto('extra.png')).catch((e: unknown) => e)
    expect((eleventh as ServiceError).code).toBe('limite-fotos')
    await anexarArquivoMidia(payload, id!, video(10, 'v1.mp4'))
    await anexarArquivoMidia(payload, id!, video(60, 'v2.mp4'))
    const third = await anexarArquivoMidia(payload, id!, video(5, 'v3.mp4')).catch((e: unknown) => e)
    expect((third as ServiceError).code).toBe('limite-video')
    expect(await arquivos(id!)).toHaveLength(12)
  })

  it('also enforces the limits at the collection hook (last line)', async () => {
    const { id } = await send()
    for (let i = 0; i < 9; i += 1) await anexarArquivoMidia(payload, id!, await foto(`h${i}.png`))
    await expect(
      payload.create({ collection: 'envios-midia-arquivos', data: { envio: id! } as never, file: await foto('x.png'), overrideAccess: true }),
    ).rejects.toThrow(/até 10 fotos/)
  })

  it('refuses a missing file, wrong types, big files, long videos and unreadable files, writing nothing', async () => {
    const none = await send({ files: [] }).catch((e: unknown) => e)
    expect((none as ServiceError).errors).toHaveProperty('arquivos')
    for (const mimetype of ['application/pdf', 'image/svg+xml', 'image/gif']) {
      const err = await send({ files: [{ data: Buffer.from('x'), mimetype, name: 'a.bin', size: 1 }] }).catch((e: unknown) => e)
      expect((err as ServiceError).code).toBe('tipo')
    }
    const bigPhoto = await send({ files: [{ data: Buffer.from('x'), mimetype: 'image/png', name: 'a.png', size: 16_000_000 }] }).catch((e: unknown) => e)
    expect((bigPhoto as ServiceError).code).toBe('grande')
    const bigVideo = await send({ files: [{ data: Buffer.from('x'), mimetype: 'video/mp4', name: 'a.mp4', size: 101_000_000 }] }).catch((e: unknown) => e)
    expect((bigVideo as ServiceError).code).toBe('grande')
    const broken = await send({ files: [{ data: Buffer.from('not an image'), mimetype: 'image/png', name: 'a.png', size: 12 }] }).catch((e: unknown) => e)
    expect((broken as ServiceError).code).toBe('foto-ilegivel')
    const longVideo = await send({ files: [video(181)] }).catch((e: unknown) => e)
    expect((longVideo as ServiceError).code).toBe('longo')
    const unreadable = await send({ files: [{ data: Buffer.from('isto não é vídeo'), mimetype: 'video/mp4', name: 'a.mp4', size: 16 }] }).catch((e: unknown) => e)
    expect((unreadable as ServiceError).code).toBe('video-ilegivel')
    // a failing file leaves no submission behind
    expect(await countEnvios()).toBe(0)
    expect(await countArquivos()).toBe(0)
  })

  it.each([
    ['no 18+ declaration', { maior18: false }, 'maior18'],
    ['no image-use authorization', { autorizacao: false }, 'autorizacao'],
    ['no nickname', { apelido: ' ' }, 'apelido'],
    ['bad contact', { contato: 'sem-contato' }, 'contato'],
    ['long message', { mensagem: 'x'.repeat(1001) }, 'mensagem'],
  ] as const)('refuses %s and writes nothing', async (_name, over, field) => {
    const err = await send(over as Partial<EnvioMidiaParams>).catch((e: unknown) => e)
    expect((err as ServiceError).code).toBe('invalido')
    expect((err as ServiceError).errors).toHaveProperty(field)
    expect(await countEnvios()).toBe(0)
    expect(await countArquivos()).toBe(0)
  })

  it('a filled honeypot creates nothing and looks like success', async () => {
    const res = await send({ website: 'http://spam.example' })
    expect(res).toEqual({ id: null, token: null, promocao: null })
    expect(await countEnvios()).toBe(0)
    expect(await countArquivos()).toBe(0)
  })

  it(`rate-limits per IP after ${MIDIA_MAX_POR_HORA} valid submissions in an hour`, async () => {
    const ip = '203.0.113.250'
    for (let i = 0; i < MIDIA_MAX_POR_HORA; i += 1) await send({ ip })
    const err = await send({ ip }).catch((e: unknown) => e)
    expect((err as ServiceError).code).toBe('envios')
    expect((err as ServiceError).status).toBe(429)
    expect(await countEnvios()).toBe(MIDIA_MAX_POR_HORA)
  })

  it('deleting a submission deletes its files from the database and the disk', async () => {
    const { id } = await send()
    const [file] = await arquivos(id!)
    const stored = path.join(privateMediaDir(), file!.filename!)
    await payload.delete({ collection: 'envios-midia', id: id!, overrideAccess: true })
    expect(await countArquivos()).toBe(0)
    expect(fs.existsSync(stored)).toBe(false)
  })

  describe('participação na promoção', () => {
    const setPromocao = (data: Record<string, unknown>) =>
      payload.updateGlobal({ slug: 'promocao', data: { titulo: '', texto: null, inicio: null, fim: null, ...data } as never, overrideAccess: true })
    const doc = (id: number) => payload.findByID({ collection: 'envios-midia', id, overrideAccess: true, depth: 0 })

    afterEach(async () => {
      await setPromocao({ ativa: false })
    })

    it('stores the title read from the global while the promotion is on', async () => {
      await setPromocao({ ativa: true, titulo: 'Promoção de Novembro' })
      const res = await send({ participarPromocao: true })
      expect(res.promocao).toBe('Promoção de Novembro')
      expect(await doc(res.id!)).toMatchObject({ promocao: 'Promoção de Novembro' })
    })

    it('the title is never taken from the request: extra fields in the params are ignored', async () => {
      await setPromocao({ ativa: true, titulo: 'Título do servidor' })
      const res = await send({ participarPromocao: true, ...({ promocao: 'Título forjado' } as object) })
      expect((await doc(res.id!)).promocao).toBe('Título do servidor')
    })

    it('in the promotion the e-mail is required: a WhatsApp number is refused and nothing is created', async () => {
      await setPromocao({ ativa: true, titulo: 'Promoção de Novembro' })
      const err = await send({ participarPromocao: true, contato: '(61) 99988-9772' }).catch((e: unknown) => e)
      expect((err as ServiceError).code).toBe('invalido')
      expect((err as ServiceError).errors).toHaveProperty('contato')
      expect(await countEnvios()).toBe(0)
    })

    it('without participating, the submission is a plain one (no promotion)', async () => {
      await setPromocao({ ativa: true, titulo: 'Promoção de Novembro' })
      const res = await send()
      expect(res.promocao).toBeNull()
      expect(await doc(res.id!)).toMatchObject({ promocao: null })
    })

    it.each([
      ['switched off', { ativa: false, titulo: 'X' }],
      ['expired', { ativa: true, titulo: 'X', fim: '2020-01-01T00:00:00.000Z' }],
      ['not started', { ativa: true, titulo: 'X', inicio: '2999-01-01T00:00:00.000Z' }],
    ])('asking to participate while the promotion is %s is ignored (plain submission)', async (_name, data) => {
      await setPromocao(data)
      const res = await send({ participarPromocao: true })
      expect(res.promocao).toBeNull()
      expect(await doc(res.id!)).toMatchObject({ promocao: null })
    })

    it('what was submitted for the promotion is still unreadable for the public, even by filtering on it', async () => {
      await setPromocao({ ativa: true, titulo: 'Promoção Secreta' })
      const { id } = await send({ participarPromocao: true, mensagem: 'Festa Reservada' })
      for (const res of [
        await rest('GET', ['envios-midia']),
        await rest('GET', ['envios-midia'], { query: '?where[promocao][equals]=Promo%C3%A7%C3%A3o%20Secreta' }),
        await rest('GET', ['envios-midia', String(id)]),
      ]) {
        expect([401, 403, 404]).toContain(res.status)
        expect(res.text).not.toContain('Promoção Secreta')
        expect(res.text).not.toContain('Festa Reservada')
      }
      await seedAssinante(payload, { email: 'a-promo@teste.local', password: 'senha-assinante-123', name: 'A' })
      const subToken = await tokenFor(payload, 'assinantes', 'a-promo@teste.local', 'senha-assinante-123')
      const asSub = await rest('GET', ['envios-midia'], { token: subToken })
      expect([401, 403]).toContain(asSub.status)
      const staff = await rest('GET', ['envios-midia'], { token, query: '?where[promocao][equals]=Promo%C3%A7%C3%A3o%20Secreta' })
      expect(staff.text).toContain('Festa Reservada')
    })
  })

  describe('token', () => {
    it('is accepted for the same submission until it expires, and only then', () => {
      const t = criarToken(42, NOW)
      expect(lerToken(t, NOW)).toBe(42)
      expect(lerToken(t, new Date(NOW.getTime() + TOKEN_TTL_MS - 1))).toBe(42)
      expect(lerToken(t, new Date(NOW.getTime() + TOKEN_TTL_MS + 1))).toBeNull()
    })
    it('rejects a tampered id, a tampered expiry and garbage', () => {
      const [, expiry, mac] = criarToken(42, NOW).split('.')
      expect(lerToken(`43.${expiry}.${mac}`, NOW)).toBeNull()
      expect(lerToken(`42.${Number(expiry) + 1_000_000}.${mac}`, NOW)).toBeNull()
      expect(lerToken('', NOW)).toBeNull()
      expect(lerToken('a.b.c', NOW)).toBeNull()
    })
  })

  describe('nothing submitted is public', () => {
    it('anonymous REST and GraphQL read, list, create and change nothing; files are denied', async () => {
      const { id } = await send()
      const [file] = await arquivos(id!)
      const name = file!.filename!
      const cardName = (file as unknown as { sizes?: { card?: { filename?: string } } }).sizes?.card?.filename

      const denied = [
        await rest('GET', ['envios-midia']),
        await rest('GET', ['envios-midia', String(id)]),
        await rest('GET', ['envios-midia-arquivos']),
        await rest('GET', ['envios-midia-arquivos', String(file!.id)]),
        await rest('GET', ['envios-midia-arquivos', 'file', name]),
        ...(cardName ? [await rest('GET', ['envios-midia-arquivos', 'file', cardName])] : []),
        await rest('POST', ['envios-midia'], { body: { apelido: 'x', contato: 'x@x.co' } }),
        await rest('PATCH', ['envios-midia', String(id)], { body: { status: 'aprovado' } }),
        await rest('DELETE', ['envios-midia', String(id)]),
        await rest('DELETE', ['envios-midia-arquivos', String(file!.id)]),
      ]
      for (const res of denied) {
        expect([401, 403, 404]).toContain(res.status)
        expect(res.text).not.toContain('Casal BSB')
        expect(res.text).not.toContain('exemplo.com')
      }

      // GraphQL is switched off for the whole site; either way nothing comes out of it
      const gql = await graphql('{ EnviosMidias { docs { apelido contato } } }')
      expect(gql.text).not.toContain('Casal BSB')
      expect(gql.text).not.toContain('exemplo.com')

      // the Local API with access enforced agrees
      for (const collection of ['envios-midia', 'envios-midia-arquivos'] as const) {
        await expect(payload.find({ collection, overrideAccess: false, user: null })).rejects.toThrow()
      }

      // nothing was changed
      expect((await payload.findByID({ collection: 'envios-midia', id: id!, overrideAccess: true, depth: 0 })).status).toBe('novo')
    })

    it('a subscriber (not staff) cannot read them either', async () => {
      await send()
      await seedAssinante(payload, { email: 'assinante-midia@teste.local', password: 'senha-assinante-123', name: 'Assinante' })
      const subToken = await tokenFor(payload, 'assinantes', 'assinante-midia@teste.local', 'senha-assinante-123')
      for (const slug of ['envios-midia', 'envios-midia-arquivos']) {
        const res = await rest('GET', [slug], { token: subToken })
        expect([401, 403]).toContain(res.status)
      }
    })

    it('staff read the submission and open the file', async () => {
      const { id } = await send()
      const [file] = await arquivos(id!)
      const list = await rest('GET', ['envios-midia'], { token })
      expect(list.status).toBe(200)
      expect(list.text).toContain('Casal BSB')
      const opened = await rest('GET', ['envios-midia-arquivos', 'file', file!.filename!], { token })
      expect(opened.status).toBe(200)
    })
  })
})

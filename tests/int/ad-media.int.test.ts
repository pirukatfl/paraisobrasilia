import fs from 'fs'
import path from 'path'
import type { Payload } from 'payload'
import sharp from 'sharp'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { attachMedia, removeMedia, ServiceError, setCover } from '../../src/lib/classisex/service'
import { privateMediaDir } from '../../src/lib/classisex/storage'
import { buildMp4 } from '../helpers/mp4-fixtures'
import { getTestPayload, resetDatabase, seedAd, seedAdCategories, seedAssinante, seedStaffUser, seedSubscription } from '../helpers/seed'

const DAY = 86_400_000
const pay = (payload: Payload, assinanteId: number, { start = -DAY, end = 30 * DAY } = {}) =>
  seedSubscription(payload, {
    assinanteId,
    startsAt: new Date(Date.now() + start).toISOString(),
    endsAt: new Date(Date.now() + end).toISOString(),
  })

type MediaDoc = {
  id: number
  kind: 'foto' | 'video'
  filename: string
  mimeType: string
  owner: number
  durationSeconds?: number | null
  previa?: string | null
  width?: number | null
  sizes?: { card?: { filename?: string | null } }
}

async function jpegWithExif(width = 1200, height = 900): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 120, g: 80, b: 60 } } })
    .withExif({ IFD0: { Copyright: 'teste-exif', Artist: 'Celular do Anunciante' } })
    .jpeg()
    .toBuffer()
}

describe('ad-media (CLAS-06, CLAS-03, D-01, T-04-02, T-04-06, T-04-10)', () => {
  let payload: Payload
  let owner: { id: number; email: string; name: string }
  let adId: number
  const dir = privateMediaDir()
  const mediaDir = path.resolve(process.env.MEDIA_DIR || 'media')

  const upload = (data: Buffer, mimetype: string, name: string, extra: Record<string, unknown> = {}, size?: number) =>
    payload.create({
      collection: 'ad-media',
      data: { ad: adId, ...extra } as never,
      file: { data, mimetype, name, size: size ?? data.length },
      depth: 0,
      overrideAccess: true,
    }) as unknown as Promise<MediaDoc>

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    owner = await seedAssinante(payload, { email: 'midia@teste.local', password: 'senha-midia-1234', name: 'Dono Mídia' })
    await pay(payload, owner.id)
    adId = (await seedAd(payload, { author: owner.id })).id
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('stores photos privately as webp without EXIF, with a card size and a blurred twin', async () => {
    const input = await jpegWithExif(2600, 1800)
    expect((await sharp(input).metadata()).exif).toBeDefined()
    const doc = await upload(input, 'image/jpeg', 'foto.jpg')
    expect(doc.kind).toBe('foto')
    expect(doc.owner).toBe(owner.id)
    expect(doc.mimeType).toBe('image/webp')
    const stored = fs.readFileSync(path.join(dir, doc.filename))
    const meta = await sharp(stored).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.exif).toBeUndefined()
    expect(meta.width).toBeLessThanOrEqual(2000)
    expect(stored.includes(Buffer.from('teste-exif'))).toBe(false)
    expect(doc.sizes?.card?.filename).toBeTruthy()
    expect(fs.existsSync(path.join(dir, doc.sizes!.card!.filename!))).toBe(true)

    const reread = (await payload.findByID({ collection: 'ad-media', id: doc.id, overrideAccess: true })) as unknown as MediaDoc
    expect(reread.previa).toBeTruthy()
    const previa = fs.readFileSync(path.join(dir, reread.previa!))
    const pmeta = await sharp(previa).metadata()
    expect(pmeta.format).toBe('webp')
    expect(pmeta.width).toBeLessThanOrEqual(480)

    // never under the public media dir
    expect(fs.existsSync(path.join(mediaDir, doc.filename))).toBe(false)
  })

  it('measures and scrubs videos; refuses long or unreadable ones', async () => {
    const video = buildMp4({ durationSeconds: 30, withLocation: '+15.59-047.97/' })
    const doc = await upload(video, 'video/mp4', 'video.mp4')
    expect(doc.kind).toBe('video')
    expect(doc.durationSeconds).toBe(30)
    const stored = fs.readFileSync(path.join(dir, doc.filename))
    expect(stored.length).toBe(video.length)
    expect(stored.includes(Buffer.from('+15.59'))).toBe(false)

    const other = (await seedAd(payload, { author: owner.id })).id
    adId = other
    await expect(upload(buildMp4({ durationSeconds: 61 }), 'video/mp4', 'longo.mp4')).rejects.toThrow(
      'O vídeo pode ter até 60 segundos.',
    )
    await expect(upload(Buffer.from('isto não é vídeo'), 'video/mp4', 'lixo.mp4')).rejects.toThrow(
      'Não conseguimos ler este vídeo. Envie um MP4 ou MOV gravado pelo celular.',
    )
  })

  it('refuses other types, oversized files and undecodable photos', async () => {
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: '#000' } }).gif().toBuffer()
    await expect(upload(gif, 'image/gif', 'a.gif')).rejects.toThrow()
    await expect(upload(Buffer.from('<html><script>alert(1)</script></html>'), 'text/html', 'a.html')).rejects.toThrow()
    const small = await jpegWithExif(50, 50)
    await expect(upload(small, 'image/jpeg', 'grande.jpg', {}, 16_000_000)).rejects.toThrow('A foto passa de 15 MB.')
    await expect(upload(buildMp4({ durationSeconds: 5 }), 'video/mp4', 'grande.mp4', {}, 105_000_000)).rejects.toThrow(
      'O vídeo passa de 100 MB.',
    )
    await expect(upload(Buffer.from('nao e jpeg nenhum'), 'image/jpeg', 'falso.jpg')).rejects.toThrow(
      'Não conseguimos ler esta foto. Envie JPG, PNG ou WebP.',
    )
  })

  it('limits each ad to 10 photos and 2 videos', async () => {
    const photo = await jpegWithExif(200, 200)
    for (let i = 0; i < 10; i++) await upload(photo, 'image/jpeg', `f${i}.jpg`)
    await expect(upload(photo, 'image/jpeg', 'f11.jpg')).rejects.toThrow('Cada anúncio pode ter até 10 fotos.')
    await upload(buildMp4({ durationSeconds: 10 }), 'video/mp4', 'v1.mp4')
    await upload(buildMp4({ durationSeconds: 60 }), 'video/mp4', 'v2.mp4')
    await expect(upload(buildMp4({ durationSeconds: 10 }), 'video/mp4', 'v3.mp4')).rejects.toThrow(
      'Cada anúncio pode ter até 2 vídeos.',
    )
  })

  it('is invisible to anonymous visitors and subscribers through the API', async () => {
    await upload(await jpegWithExif(200, 200), 'image/jpeg', 'x.jpg')
    for (const user of [undefined, { ...owner, collection: 'assinantes' }]) {
      const count = await payload
        .find({ collection: 'ad-media', overrideAccess: false, ...(user ? { user: user as never } : {}) })
        .then(
          (r) => r.docs.length,
          () => 0,
        )
      expect(count).toBe(0)
    }
  })

  it('deleting the media or the ad removes every file', async () => {
    const doc = await upload(await jpegWithExif(400, 400), 'image/jpeg', 'apagar.jpg')
    const reread = (await payload.findByID({ collection: 'ad-media', id: doc.id, overrideAccess: true })) as unknown as MediaDoc
    const files = [doc.filename, doc.sizes!.card!.filename!, reread.previa!].map((f) => path.join(dir, f))
    for (const f of files) expect(fs.existsSync(f)).toBe(true)
    await payload.delete({ collection: 'ad-media', id: doc.id, overrideAccess: true })
    for (const f of files) expect(fs.existsSync(f)).toBe(false)

    const second = await upload(await jpegWithExif(400, 400), 'image/jpeg', 'cascata.jpg')
    const video = await upload(buildMp4({ durationSeconds: 5 }), 'video/mp4', 'cascata.mp4')
    await payload.delete({ collection: 'ads', id: adId, overrideAccess: true })
    expect((await payload.count({ collection: 'ad-media', overrideAccess: true })).totalDocs).toBe(0)
    expect(fs.existsSync(path.join(dir, second.filename))).toBe(false)
    expect(fs.existsSync(path.join(dir, video.filename))).toBe(false)
  })

  it('refuses uploads in production when PRIVATE_MEDIA_DIR is not configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('PRIVATE_MEDIA_DIR', '')
    const err = await upload(await jpegWithExif(100, 100), 'image/jpeg', 'prod.jpg').catch((e) => e)
    expect(err.status).toBe(503)
    expect(err.message).toBe('Envio de fotos indisponível no momento.')
  })
})

describe('owner media service (CLAS-03, D-01, D-03, T-04-04)', () => {
  let payload: Payload
  let owner: { id: number }
  let other: { id: number }
  let adId: number
  const now = new Date()
  const dir = privateMediaDir()

  const photoFile = async (name = 'foto.jpg') => {
    const data = await jpegWithExif(300, 200)
    return { data, mimetype: 'image/jpeg', name, size: data.length }
  }
  const adStatus = async () =>
    ((await payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true })) as { status: string }).status
  const mediaOf = async () =>
    (
      await payload.find({
        collection: 'ad-media',
        where: { ad: { equals: adId } },
        sort: 'order',
        depth: 0,
        overrideAccess: true,
      })
    ).docs as unknown as MediaDoc[]

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
    owner = await seedAssinante(payload, { email: 'dono@teste.local', password: 'senha-dono-1234', name: 'Dono' })
    await pay(payload, owner.id)
    other = await seedAssinante(payload, { email: 'outro@teste.local', password: 'senha-outro-1234', name: 'Outro' })
    adId = (await seedAd(payload, { author: owner.id, status: 'aprovado' })).id
  })

  it('attaches a photo for the owner and sends the ad back to moderation', async () => {
    const { id } = await attachMedia(payload, { assinanteId: owner.id, adId, file: await photoFile(), now })
    const media = await mediaOf()
    expect(media.map((m) => m.id)).toEqual([id])
    expect(media[0].kind).toBe('foto')
    expect(await adStatus()).toBe('pendente')
  })

  it('refuses another subscriber with 404 and writes no file', async () => {
    const before = fs.existsSync(dir) ? fs.readdirSync(dir).length : 0
    const err = await attachMedia(payload, { assinanteId: other.id, adId, file: await photoFile(), now }).catch((e) => e)
    expect(err).toBeInstanceOf(ServiceError)
    expect(err.status).toBe(404)
    expect(await mediaOf()).toHaveLength(0)
    expect(fs.existsSync(dir) ? fs.readdirSync(dir).length : 0).toBe(before)
    expect(await adStatus()).toBe('aprovado')
  })

  it('turns hook refusals into ServiceError 400 with the same message', async () => {
    for (let i = 0; i < 10; i++) await attachMedia(payload, { assinanteId: owner.id, adId, file: await photoFile(`f${i}.jpg`), now })
    const err = await attachMedia(payload, { assinanteId: owner.id, adId, file: await photoFile('f11.jpg'), now }).catch((e) => e)
    expect(err).toBeInstanceOf(ServiceError)
    expect(err.status).toBe(400)
    expect(err.code).toBe('limite-fotos')
    expect(err.message).toBe('Cada anúncio pode ter até 10 fotos.')
    const long = buildMp4({ durationSeconds: 61 })
    const err2 = await attachMedia(payload, {
      assinanteId: owner.id,
      adId,
      file: { data: long, mimetype: 'video/mp4', name: 'longo.mp4', size: long.length },
      now,
    }).catch((e) => e)
    expect(err2.code).toBe('longo')
  })

  it('appends in order, sets the cover and removes media (files gone, ad pending)', async () => {
    const a = await attachMedia(payload, { assinanteId: owner.id, adId, file: await photoFile('a.jpg'), now })
    const b = await attachMedia(payload, { assinanteId: owner.id, adId, file: await photoFile('b.jpg'), now })
    const c = await attachMedia(payload, { assinanteId: owner.id, adId, file: await photoFile('c.jpg'), now })
    expect((await mediaOf()).map((m) => m.id)).toEqual([a.id, b.id, c.id])

    await payload.update({ collection: 'ads', id: adId, data: { status: 'aprovado' } as never, overrideAccess: true })
    await setCover(payload, { assinanteId: owner.id, mediaId: c.id, now })
    expect((await mediaOf()).map((m) => m.id)).toEqual([c.id, a.id, b.id])
    expect(await adStatus()).toBe('pendente')

    await expect(setCover(payload, { assinanteId: other.id, mediaId: a.id, now })).rejects.toMatchObject({ status: 404 })
    await expect(removeMedia(payload, { assinanteId: other.id, mediaId: a.id, now })).rejects.toMatchObject({ status: 404 })

    await payload.update({ collection: 'ads', id: adId, data: { status: 'aprovado' } as never, overrideAccess: true })
    const removed = (await mediaOf()).find((m) => m.id === a.id)!
    await removeMedia(payload, { assinanteId: owner.id, mediaId: a.id, now })
    expect((await mediaOf()).map((m) => m.id)).toEqual([c.id, b.id])
    expect(fs.existsSync(path.join(dir, removed.filename))).toBe(false)
    expect(await adStatus()).toBe('pendente')
  })
})

describe('limits by the ad author tier (G-02, G-03, G-05, I-1, I-3)', () => {
  let payload: Payload
  const now = new Date()

  const photoFile = async (name = 'foto.jpg') => {
    const data = await jpegWithExif(300, 200)
    return { data, mimetype: 'image/jpeg', name, size: data.length }
  }
  const videoFile = (name = 'v.mp4') => {
    const data = buildMp4({ durationSeconds: 10 })
    return { data, mimetype: 'video/mp4', name, size: data.length }
  }
  const count = async (adId: number, kind: 'foto' | 'video') =>
    (
      await payload.count({
        collection: 'ad-media',
        where: { and: [{ ad: { equals: adId } }, { kind: { equals: kind } }] },
        overrideAccess: true,
      })
    ).totalDocs

  beforeAll(async () => {
    payload = await getTestPayload()
  })

  beforeEach(async () => {
    await resetDatabase(payload)
    await seedAdCategories(payload)
  })

  it('free author: first photo ok, second photo and any video refused with the free messages', async () => {
    const free = await seedAssinante(payload, { email: 'livre@teste.local', password: 'senha-livre-123', name: 'Livre' })
    const ad = await seedAd(payload, { author: free.id })
    await attachMedia(payload, { assinanteId: free.id, adId: ad.id, file: await photoFile('a.jpg'), now })
    const second = await attachMedia(payload, { assinanteId: free.id, adId: ad.id, file: await photoFile('b.jpg'), now }).catch((e) => e)
    expect(second).toBeInstanceOf(ServiceError)
    expect(second.code).toBe('limite-fotos-gratis')
    expect(second.message).toBe('Conta gratuita: 1 foto por anúncio. Assine para enviar até 10 fotos e 2 vídeos.')
    const video = await attachMedia(payload, { assinanteId: free.id, adId: ad.id, file: videoFile(), now }).catch((e) => e)
    expect(video.code).toBe('video-gratis')
    expect(video.message).toBe('Conta gratuita não envia vídeos. Assine para enviar até 2 vídeos.')
    expect(await count(ad.id, 'foto')).toBe(1)
    expect(await count(ad.id, 'video')).toBe(0)
  })

  it('paying author: 10 photos + 2 videos ok, 11th photo and 3rd video refused', async () => {
    const payer = await seedAssinante(payload, { email: 'pago@teste.local', password: 'senha-pago-1234', name: 'Pago' })
    await pay(payload, payer.id)
    const ad = await seedAd(payload, { author: payer.id })
    for (let i = 0; i < 10; i++) await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: await photoFile(`f${i}.jpg`), now })
    for (let i = 0; i < 2; i++) await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: videoFile(`v${i}.mp4`), now })
    expect((await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: await photoFile('x.jpg'), now }).catch((e) => e)).code).toBe('limite-fotos')
    expect((await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: videoFile('x.mp4'), now }).catch((e) => e)).code).toBe('limite-video')
  }, 120_000)

  it('expired payer with 3 stored photos: cannot add a new photo; may Remover all and then add one', async () => {
    const payer = await seedAssinante(payload, { email: 'venceu@teste.local', password: 'senha-venceu-12', name: 'Venceu' })
    const sub = await pay(payload, payer.id)
    const ad = await seedAd(payload, { author: payer.id, status: 'aprovado' })
    const ids: number[] = []
    for (let i = 0; i < 3; i++) ids.push((await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: await photoFile(`e${i}.jpg`), now })).id)
    await payload.update({
      collection: 'subscriptions',
      id: (sub as { id: number }).id,
      data: { startsAt: new Date(Date.now() - 90 * DAY).toISOString(), endsAt: new Date(Date.now() - DAY).toISOString() },
      overrideAccess: true,
      context: { skipAudit: true },
    })
    const refused = await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: await photoFile('n.jpg'), now }).catch((e) => e)
    expect(refused.code).toBe('limite-fotos-gratis')
    expect(await count(ad.id, 'foto')).toBe(3)
    for (const id of ids) await removeMedia(payload, { assinanteId: payer.id, mediaId: id, now })
    expect(await count(ad.id, 'foto')).toBe(0)
    await attachMedia(payload, { assinanteId: payer.id, adId: ad.id, file: await photoFile('n.jpg'), now })
    expect(await count(ad.id, 'foto')).toBe(1)
  }, 120_000)

  it('staff upload to a free author ad is refused on the 2nd photo and on a video (I-3)', async () => {
    const free = await seedAssinante(payload, { email: 'livre2@teste.local', password: 'senha-livre-123', name: 'Livre 2' })
    const ad = await seedAd(payload, { author: free.id })
    await seedStaffUser(payload, { email: 'staff-midia@teste.local', password: 'senha-equipe-123' })
    const staff = (await payload.find({ collection: 'users', where: { email: { equals: 'staff-midia@teste.local' } }, overrideAccess: true })).docs[0]
    const asStaff = { overrideAccess: false, user: { ...staff, collection: 'users' } as never }
    const up = (file: { data: Buffer; mimetype: string; name: string; size: number }) =>
      payload.create({ collection: 'ad-media', data: { ad: ad.id } as never, file, depth: 0, ...asStaff })
    await up(await photoFile('s1.jpg'))
    await expect(up(await photoFile('s2.jpg'))).rejects.toThrow('Conta gratuita: 1 foto por anúncio.')
    await expect(up(videoFile('sv.mp4'))).rejects.toThrow('Conta gratuita não envia vídeos.')
    expect(await count(ad.id, 'foto')).toBe(1)
  })
})

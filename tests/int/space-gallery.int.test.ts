import fs from 'fs'
import os from 'os'
import path from 'path'
import type { Payload } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { getSpaceItems, getSpacePhotos } from '../../src/lib/gallery/queries'
import { getTestPayload, resetDatabase, seedSpacePhoto, seedSpaceVideo } from '../helpers/seed'

const FIXTURES = path.resolve('tests/fixtures')

describe('space gallery (MIDIA-01, PAINEL-02, T-02-05/06/07)', () => {
  let payload: Payload

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    await seedSpacePhoto(payload, {
      order: 2,
      caption: 'Pista',
      authorization: { date: '2026-10-12T12:00:00.000Z', note: 'Enviou por WhatsApp em 12/10' },
    })
    await seedSpacePhoto(payload, { order: 1, published: false, caption: 'Rascunho' })
    await seedSpaceVideo(payload, { order: 1 })
  })

  it('anonymous visitors see published items only, without the authorization group', async () => {
    const { docs } = await payload.find({ collection: 'space-items', overrideAccess: false, depth: 0 })
    expect(docs).toHaveLength(2)
    for (const doc of docs) expect(doc).not.toHaveProperty('imageAuthorization')
    // Staff do see it
    const staffView = await payload.find({ collection: 'space-items', overrideAccess: true, where: { caption: { equals: 'Pista' } } })
    expect(staffView.docs[0].imageAuthorization?.note).toContain('WhatsApp')
  })

  it('getSpaceItems() returns DTOs ordered by order then newest; video uses its poster', async () => {
    const items = await getSpaceItems()
    expect(items.map((i) => i.kind)).toEqual(['video', 'photo'])
    const [video, photo] = items
    expect(video.video?.url).toMatch(/\.mp4$/)
    expect(video.video?.title).toBe('Pista de dança numa noite de festa')
    expect(video.image.alt).toBe('Capa do vídeo do espaço')
    expect(photo.caption).toBe('Pista')
    expect(photo.image.thumbUrl).toMatch(/\.webp$/)
    expect(photo.image.url).toMatch(/\.webp$/)
    expect((await getSpacePhotos(6)).map((i) => i.kind)).toEqual(['photo'])
  })

  it('publishing without an image authorization is allowed (D-09)', async () => {
    const item = await seedSpacePhoto(payload, { order: 9 })
    expect((item as { _status?: string })._status).toBe('published')
  })

  it('anonymous visitors cannot create items, videos or media', async () => {
    const forbidden = /permiss|forbidden|not allowed/i
    await expect(
      payload.create({ collection: 'space-items', overrideAccess: false, data: { kind: 'photo' } as never }),
    ).rejects.toThrow(forbidden)
    await expect(
      payload.create({
        collection: 'videos',
        overrideAccess: false,
        data: { title: 'x' } as never,
        filePath: path.join(FIXTURES, 'espaco.mp4'),
      }),
    ).rejects.toThrow(forbidden)
    await expect(
      payload.create({
        collection: 'media',
        overrideAccess: false,
        data: { alt: 'x' },
        filePath: path.join(FIXTURES, 'flyer-square.jpg'),
      }),
    ).rejects.toThrow(forbidden)
  })

  it('rejects a text file disguised as .mp4', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-video-'))
    const fake = path.join(dir, 'falso.mp4')
    fs.writeFileSync(fake, '<html><script>alert(1)</script></html>')
    const poster = await payload.create({
      collection: 'media',
      data: { alt: 'capa' },
      filePath: path.join(FIXTURES, 'flyer-square.jpg'),
      overrideAccess: true,
    })
    await expect(
      payload.create({
        collection: 'videos',
        overrideAccess: true,
        data: { title: 'Falso', poster: poster.id },
        filePath: fake,
      }),
    ).rejects.toThrow()
  })

  it('rejects images over 15 MB with a Portuguese message', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pb-big-'))
    const big = path.join(dir, 'grande.jpg')
    // A real JPEG followed by padding (decoders ignore bytes after the end marker)
    fs.writeFileSync(big, Buffer.concat([fs.readFileSync(path.join(FIXTURES, 'flyer-square.jpg')), Buffer.alloc(16_000_000)]))
    await expect(
      payload.create({ collection: 'media', overrideAccess: true, data: { alt: 'grande' }, filePath: big }),
    ).rejects.toThrow('A imagem passa de 15 MB')
  })
})

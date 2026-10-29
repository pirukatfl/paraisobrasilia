import fs from 'node:fs'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'

import { toContoCardDTO } from '@/lib/contos/dto'
import { contoMediaIds, generateMissingThumbs } from '@/lib/media/thumbs'

import { getTestPayload, resetDatabase, seedConto } from '../helpers/seed'

type SizeRow = { url?: string | null; width?: number | null; height?: number | null; filename?: string | null }
type MediaRow = { id: number; filename: string; sizes?: Record<string, SizeRow | undefined> }

async function png(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: '#884422' } }).png().toBuffer()
}

describe('conto card thumbs (thumb 480x360 / thumb2x 960x720)', () => {
  let payload: Payload
  let mediaDir: string

  const upload = async (name: string, w: number, h: number) => {
    const data = await png(w, h)
    return (await payload.create({
      collection: 'media',
      data: { alt: 'Capa de teste' },
      file: { data, mimetype: 'image/png', name, size: data.length },
      overrideAccess: true,
    })) as unknown as MediaRow
  }

  beforeAll(async () => {
    payload = await getTestPayload()
    await resetDatabase(payload)
    await payload.delete({ collection: 'media', where: { id: { exists: true } }, overrideAccess: true })
    mediaDir = (payload.collections.media.config.upload as { staticDir: string }).staticDir
  })

  it('a new upload gets the 4:3 variants and the card DTO uses thumb2x', async () => {
    const media = await upload('thumbs-novo.png', 1600, 1200)
    expect(media.sizes?.thumb).toMatchObject({ width: 480, height: 360 })
    expect(media.sizes?.thumb2x).toMatchObject({ width: 960, height: 720 })
    const conto = await seedConto(payload, { title: 'Conto com capa', slug: 'conto-com-capa' })
    await payload.update({ collection: 'contos' as never, id: conto.id, data: { imagem: media.id } as never, overrideAccess: true })
    const doc = await payload.findByID({ collection: 'contos' as never, id: conto.id, depth: 1, overrideAccess: true })
    const card = toContoCardDTO(doc as never).imagem
    expect(card).toMatchObject({ width: 960, height: 720 })
    expect(card?.url).toBe(media.sizes?.thumb2x?.url)
  })

  it('a small original gets no variant bigger than itself and the card falls back', async () => {
    const media = await upload('thumbs-pequena.png', 400, 300)
    expect(media.sizes?.thumb2x?.url ?? null).toBeNull()
    expect(media.sizes?.thumb?.url ?? null).toBeNull()
  })

  it('backfills images sent before the sizes existed, idempotently, without touching the original', async () => {
    const media = await upload('thumbs-antiga.png', 1600, 1200)
    const original = path.join(mediaDir, media.filename)
    // Simulate an old row: no thumb columns and no files
    for (const s of ['thumb', 'thumb2x']) {
      fs.rmSync(path.join(mediaDir, media.sizes![s]!.filename!), { force: true })
    }
    await payload.update({
      collection: 'media',
      id: media.id,
      data: { sizes: { thumb: { url: null, width: null, height: null, filename: null }, thumb2x: { url: null, width: null, height: null, filename: null } } } as never,
      overrideAccess: true,
    })
    const before = fs.readFileSync(original)

    const first = await generateMissingThumbs(payload, mediaDir, [media.id])
    expect(first).toMatchObject({ medias: 1, geradas: 2, falhas: 0, semArquivo: 0 })
    const after = (await payload.findByID({ collection: 'media', id: media.id, overrideAccess: true })) as unknown as MediaRow
    expect(after.sizes?.thumb).toMatchObject({ width: 480, height: 360 })
    expect(after.sizes?.thumb2x).toMatchObject({ width: 960, height: 720 })
    const meta = await sharp(path.join(mediaDir, after.sizes!.thumb2x!.filename!)).metadata()
    expect([meta.width, meta.height, meta.format]).toEqual([960, 720, 'webp'])
    expect(fs.readFileSync(original).equals(before)).toBe(true)
    // Other stored sizes survive the update
    expect(after.sizes?.gallery?.url).toBeTruthy()

    const second = await generateMissingThumbs(payload, mediaDir, [media.id])
    expect(second).toMatchObject({ geradas: 0, jaTinham: 1 })
  })

  it('reports a media whose file is gone and lists the media attached to contos', async () => {
    const media = await upload('thumbs-sem-arquivo.png', 1600, 1200)
    await payload.update({ collection: 'media', id: media.id, data: { sizes: { thumb: { url: null, width: null, height: null, filename: null } } } as never, overrideAccess: true })
    fs.rmSync(path.join(mediaDir, media.filename), { force: true })
    expect(await generateMissingThumbs(payload, mediaDir, [media.id])).toMatchObject({ semArquivo: 1, geradas: 0 })
    const ids = await contoMediaIds(payload)
    expect(ids.length).toBeGreaterThanOrEqual(1)
  })
})

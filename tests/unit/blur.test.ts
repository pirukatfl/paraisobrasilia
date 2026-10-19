import sharp from 'sharp'
import { describe, expect, it } from 'vitest'

import { makeBlurredPreview } from '../../src/lib/classisex/blur'

async function checkerboard(size: number, square: number): Promise<Buffer> {
  const raw = Buffer.alloc(size * size * 3)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const v = (Math.floor(x / square) + Math.floor(y / square)) % 2 ? 255 : 0
      raw.fill(v, (y * size + x) * 3, (y * size + x) * 3 + 3)
    }
  }
  return sharp(raw, { raw: { width: size, height: size, channels: 3 } }).png().toBuffer()
}

describe('makeBlurredPreview (D-04, T-04-11)', () => {
  it('turns fine detail into an unreadable blur, 480 px wide webp', async () => {
    const out = await makeBlurredPreview(await checkerboard(800, 8))
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(480)
    const stats = await sharp(out).stats()
    for (const channel of stats.channels) expect(channel.stdev).toBeLessThan(20)
    expect(out.length).toBeLessThan(50_000)
  })

  it('keeps portrait photos within 480 px wide', async () => {
    const photo = await sharp({ create: { width: 300, height: 600, channels: 3, background: { r: 200, g: 50, b: 50 } } })
      .jpeg()
      .toBuffer()
    const out = await makeBlurredPreview(photo)
    const meta = await sharp(out).metadata()
    expect(meta.width).toBeLessThanOrEqual(480)
    expect(out.length).toBeLessThan(50_000)
  })
})

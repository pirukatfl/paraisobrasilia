#!/usr/bin/env node
/**
 * Builds the optimized logo, icon and default share image from the client's logo
 * (brand/logo-original.webp). Idempotent: same input → byte-identical outputs.
 *
 *   node scripts/brand/build-logo-assets.mjs
 *
 * The original vector file is still pending from the client (docs/discovery/README.md, D-03);
 * these raster derivatives are the Phase 1 header/favicon/OG assets.
 */
import { mkdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const SRC = path.join(root, 'brand/logo-original.webp')
const BG = { r: 0x0b, g: 0x09, b: 0x08, alpha: 1 } // --color-bg #0B0908

const out = (p) => path.join(root, p)
const written = []

async function save(pipeline, rel) {
  await mkdir(path.dirname(out(rel)), { recursive: true })
  await pipeline.toFile(out(rel))
  written.push(rel)
}

// The logo's own background is #010101; blending it with `lighten` over the site background
// turns that near-black into exactly #0B0908 (no visible box) and leaves the colors intact.
const meta = await sharp(SRC).metadata()
const blended = await sharp({ create: { width: meta.width, height: meta.height, channels: 3, background: BG } })
  .composite([{ input: await sharp(SRC).flatten({ background: '#000000' }).png().toBuffer(), blend: 'lighten' }])
  .png()
  .toBuffer()
const base = () => sharp(blended)

// Header logo (1x / 2x WebP, PNG fallback)
for (const width of [320, 640]) {
  await save(base().resize({ width }).webp({ quality: 90, effort: 6 }), `public/brand/logo-${width}.webp`)
}
await save(base().resize({ width: 640 }).png({ compressionLevel: 9 }), 'public/brand/logo-640.png')

// App icons: arch + symbols region (rows 0-375; the wordmark starts at row 378), contained on a
// square with 8% padding
async function icon(size, rel) {
  const pad = Math.round(size * 0.08)
  const inner = size - pad * 2
  const crop = await base()
    .extract({ left: 20, top: 0, width: 460, height: 376 })
    .resize({ width: inner, height: inner, fit: 'contain', background: BG })
    .png()
    .toBuffer()
  await save(
    sharp({ create: { width: size, height: size, channels: 4, background: BG } })
      .composite([{ input: crop, left: pad, top: pad }])
      .png({ compressionLevel: 9 }),
    rel,
  )
}
await icon(512, 'src/app/icon.png')
await icon(180, 'src/app/apple-icon.png')

// Default Open Graph image 1200x630
const ogLogo = await base().resize({ height: 420 }).png().toBuffer()
const ogMeta = await sharp(ogLogo).metadata()
await save(
  sharp({ create: { width: 1200, height: 630, channels: 3, background: BG } })
    .composite([
      { input: ogLogo, left: Math.round((1200 - ogMeta.width) / 2), top: Math.round((630 - ogMeta.height) / 2) },
    ])
    .jpeg({ quality: 82, mozjpeg: true }),
  'public/og-default.jpg',
)

for (const rel of written) {
  const { size } = await stat(out(rel))
  console.log(`${rel}\t${size} bytes`)
}

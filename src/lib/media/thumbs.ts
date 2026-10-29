import fs from 'node:fs/promises'
import path from 'node:path'

import type { Payload } from 'payload'
import sharp from 'sharp'

/** The conto-card sizes of the Media collection (keep in sync with imageSizes there). */
export const THUMB_SIZES = [
  { name: 'thumb', width: 480, height: 360 },
  { name: 'thumb2x', width: 960, height: 720 },
] as const

export type ThumbsReport = { medias: number; geradas: number; jaTinham: number; semArquivo: number; pequenas: number; falhas: number }

type StoredSize = { url?: string | null; width?: number | null; height?: number | null; mimeType?: string | null; filesize?: number | null; filename?: string | null }
type MediaDoc = {
  id: number | string
  filename?: string | null
  width?: number | null
  height?: number | null
  focalX?: number | null
  focalY?: number | null
  sizes?: Record<string, StoredSize | undefined> | null
}

/** Cover crop to w x h around the focal point (percent, centre when unset), like Payload does on upload. */
async function cropBuffer(file: string, w: number, h: number, focalX: number, focalY: number, srcW: number, srcH: number) {
  const scale = Math.max(w / srcW, h / srcH)
  const rw = Math.max(w, Math.round(srcW * scale))
  const rh = Math.max(h, Math.round(srcH * scale))
  const left = Math.min(rw - w, Math.max(0, Math.round((focalX / 100) * rw - w / 2)))
  const top = Math.min(rh - h, Math.max(0, Math.round((focalY / 100) * rh - h / 2)))
  return sharp(file).resize(rw, rh).extract({ left, top, width: w, height: h }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
}

/**
 * Creates the missing thumb/thumb2x files of the given media (next to the original, which is never touched)
 * and records them in the media row. Idempotent: a size that is already stored is left alone. An original
 * smaller than the size gets no variant (same rule as Payload on upload), the card falls back to another size.
 */
export async function generateMissingThumbs(payload: Payload, mediaDir: string, ids: Array<number | string>): Promise<ThumbsReport> {
  const report: ThumbsReport = { medias: ids.length, geradas: 0, jaTinham: 0, semArquivo: 0, pequenas: 0, falhas: 0 }
  for (const id of ids) {
    try {
      const doc = (await payload.findByID({ collection: 'media', id, depth: 0, overrideAccess: true })) as unknown as MediaDoc
      const missing = THUMB_SIZES.filter((s) => !doc.sizes?.[s.name]?.url)
      if (missing.length === 0) {
        report.jaTinham++
        continue
      }
      // basename: a filename from the database never leaves the media folder
      const file = doc.filename ? path.join(mediaDir, path.basename(doc.filename)) : ''
      const exists = file ? await fs.stat(file).then((s) => s.isFile(), () => false) : false
      if (!exists) {
        report.semArquivo++
        continue
      }
      const meta = await sharp(file).metadata()
      const srcW = doc.width ?? meta.width ?? 0
      const srcH = doc.height ?? meta.height ?? 0
      const sizes: Record<string, StoredSize | undefined> = { ...doc.sizes }
      let changed = false
      for (const s of missing) {
        if (srcW < s.width || srcH < s.height) {
          report.pequenas++
          continue
        }
        const { data, info } = await cropBuffer(file, s.width, s.height, doc.focalX ?? 50, doc.focalY ?? 50, srcW, srcH)
        const parsed = path.parse(path.basename(doc.filename!))
        const filename = `${parsed.name}-${s.width}x${s.height}.webp`
        await fs.writeFile(path.join(mediaDir, filename), data)
        sizes[s.name] = {
          url: `/api/media/file/${encodeURIComponent(filename)}`,
          width: info.width,
          height: info.height,
          mimeType: 'image/webp',
          filesize: info.size,
          filename,
        }
        changed = true
        report.geradas++
      }
      if (changed) {
        await payload.update({ collection: 'media', id, data: { sizes } as never, overrideAccess: true, depth: 0 })
      }
    } catch {
      report.falhas++
    }
  }
  return report
}

/** Ids of every media attached to a conto (any status, drafts included), without duplicates. */
export async function contoMediaIds(payload: Payload): Promise<Array<number | string>> {
  const ids = new Set<number | string>()
  let page = 1
  for (;;) {
    const res = await payload.find({ collection: 'contos', depth: 0, limit: 100, page, pagination: true, overrideAccess: true, draft: true })
    for (const doc of res.docs as Array<{ imagem?: unknown }>) {
      const img = doc.imagem
      if (typeof img === 'number' || typeof img === 'string') ids.add(img)
      else if (img && typeof img === 'object' && 'id' in img) ids.add((img as { id: number | string }).id)
    }
    if (!res.hasNextPage) break
    page++
  }
  return [...ids]
}

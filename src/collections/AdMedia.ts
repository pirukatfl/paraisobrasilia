import fs from 'fs/promises'
import path from 'path'
import {
  APIError,
  type CollectionAfterChangeHook,
  type CollectionAfterDeleteHook,
  type CollectionBeforeOperationHook,
  type CollectionConfig,
  type PayloadRequest,
} from 'payload'
import sharp from 'sharp'

import { isStaff } from '../access/roles'
import { withRequestState } from '../lib/assinantes/context'
import { expire } from '../lib/cache/expire'
import { makeBlurredPreview } from '../lib/classisex/blur'
import { MAX_VIDEO_SECONDS, Mp4Error, readMp4Info, scrubMp4Metadata } from '../lib/classisex/mp4'
import { privateStorageConfigured } from '../lib/classisex/storage'

export const MAX_AD_PHOTO_BYTES = 15_000_000
export const MAX_AD_VIDEO_BYTES = 100_000_000
export const MAX_AD_PHOTOS = 5
export const MAX_AD_VIDEOS = 1

export const AD_MEDIA_MESSAGES = {
  indisponivel: 'Envio de fotos indisponível no momento.',
  tipo: 'Envie fotos JPG, PNG ou WebP, ou um vídeo MP4 ou MOV.',
  fotoGrande: 'A foto passa de 15 MB.',
  videoGrande: 'O vídeo passa de 100 MB.',
  fotoIlegivel: 'Não conseguimos ler esta foto. Envie JPG, PNG ou WebP.',
  videoLongo: `O vídeo pode ter até ${MAX_VIDEO_SECONDS} segundos.`,
  fotos: 'Cada anúncio pode ter até 5 fotos.',
  videos: 'Cada anúncio pode ter 1 vídeo.',
  semAnuncio: 'Anúncio não encontrado.',
} as const

export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime']

const fail = (message: string, status = 400) => new APIError(message, status, null, true)

const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') return Number((value as { id?: number | string }).id)
  return Number(value)
}

/**
 * Validation and cleaning before Payload writes anything (req.file is set before this hook in
 * both REST and Local API create; generateFileData reads req.file afterwards).
 * - kind and owner are decided here, never taken from the client
 * - photos: size cap, decodable by sharp (Payload then re-encodes to webp: EXIF/GPS gone, T-04-06)
 * - videos: size cap, duration ≤ 60 s, location boxes zero-filled (T-04-06)
 * - per-ad limits (D-01)
 */
const validateAndClean: CollectionBeforeOperationHook = async ({ args, operation, req }) => {
  if (operation !== 'create' && operation !== 'update') return args
  const file = req.file
  if (!file) return args
  if (!privateStorageConfigured()) throw fail(AD_MEDIA_MESSAGES.indisponivel, 503)

  const writeArgs = args as { data?: Record<string, unknown> }
  const data = (writeArgs.data ??= {})
  const mimetype = String(file.mimetype ?? '')
  let buffer = file.data
  if ((!buffer || buffer.length === 0) && file.tempFilePath) buffer = await fs.readFile(file.tempFilePath)
  const size = Math.max(Number(file.size ?? 0), buffer?.length ?? 0)

  let kind: 'foto' | 'video'
  if (PHOTO_MIME_TYPES.includes(mimetype)) {
    kind = 'foto'
    if (size > MAX_AD_PHOTO_BYTES) throw fail(AD_MEDIA_MESSAGES.fotoGrande)
    const meta = await sharp(buffer)
      .metadata()
      .catch(() => null)
    if (!meta || !['jpeg', 'png', 'webp'].includes(String(meta.format)) || !meta.width || !meta.height) {
      throw fail(AD_MEDIA_MESSAGES.fotoIlegivel)
    }
  } else if (VIDEO_MIME_TYPES.includes(mimetype)) {
    kind = 'video'
    if (size > MAX_AD_VIDEO_BYTES) throw fail(AD_MEDIA_MESSAGES.videoGrande)
    try {
      const info = readMp4Info(buffer)
      if (info.durationSeconds > MAX_VIDEO_SECONDS + 0.5) throw fail(AD_MEDIA_MESSAGES.videoLongo)
      const { data: clean } = scrubMp4Metadata(buffer)
      // A2: Payload writes req.file.data, so the stored bytes are the scrubbed copy
      file.data = clean
      file.size = clean.length
      if (file.tempFilePath) await fs.writeFile(file.tempFilePath, clean)
      data.durationSeconds = Math.round(info.durationSeconds)
    } catch (err) {
      if (err instanceof Mp4Error) throw fail(err.message)
      throw err
    }
  } else {
    throw fail(AD_MEDIA_MESSAGES.tipo)
  }
  data.kind = kind

  if (operation === 'create') {
    const adId = relId(data.ad)
    const ad =
      adId === null || !Number.isInteger(adId)
        ? null
        : await withRequestState(req, () =>
            req.payload.findByID({ collection: 'ads', id: adId, depth: 0, overrideAccess: true, disableErrors: true, req }),
          )
    if (!ad) throw fail(AD_MEDIA_MESSAGES.semAnuncio)
    // The owner is always the ad's author (never from the request)
    data.owner = relId(ad.author)
    const { totalDocs } = await withRequestState(req, () =>
      req.payload.count({
        collection: 'ad-media',
        where: { and: [{ ad: { equals: ad.id } }, { kind: { equals: kind } }] },
        overrideAccess: true,
        req,
      }),
    )
    if (kind === 'foto' && totalDocs >= MAX_AD_PHOTOS) throw fail(AD_MEDIA_MESSAGES.fotos)
    if (kind === 'video' && totalDocs >= MAX_AD_VIDEOS) throw fail(AD_MEDIA_MESSAGES.videos)
  }
  return args
}

const staticDirOf = (req: PayloadRequest): string => {
  const upload = req.payload.collections['ad-media'].config.upload
  return (typeof upload === 'object' && upload.staticDir) || ''
}

const previaName = (filename: string) => `${path.parse(filename).name}-previa.webp`

/** Blurred twin of each photo for the public preview (D-04), next to the original. */
const writePreview: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (req.context?.skipPreview) return doc
  if (doc.kind !== 'foto' || !doc.filename) return doc
  if (operation !== 'create' && doc.previa) return doc
  const dir = staticDirOf(req)
  const source = await fs.readFile(path.join(dir, path.basename(doc.filename)))
  const name = previaName(path.basename(doc.filename))
  await fs.writeFile(path.join(dir, name), await makeBlurredPreview(source))
  await withRequestState(req, () =>
    req.payload.update({
      collection: 'ad-media',
      id: doc.id,
      data: { previa: name },
      overrideAccess: true,
      context: { skipPreview: true },
      req,
    }),
  )
  expire(['ads'])
  return { ...doc, previa: name }
}

/** Payload removes the original and its sizes; the blurred twin is ours. */
const removePreview: CollectionAfterDeleteHook = async ({ doc, req }) => {
  if (doc.previa) {
    await fs.unlink(path.join(staticDirOf(req), path.basename(doc.previa))).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err
    })
  }
  expire(['ads'])
  return doc
}

const webp = { format: 'webp' as const, options: { quality: 82 } }

/**
 * ClassiSex photos and videos (CLAS-06, D-01). Stored in PRIVATE_MEDIA_DIR (staticDir injected
 * in payload.config.ts), outside MEDIA_DIR and public/.
 *
 * T-04-02: read is staff-only — never `() => true`, or Payload's own file route
 * (/api/ad-media/file/…) would serve the originals to anyone. Subscribers see the files only
 * through /area-do-assinante/midia/… (auth-checked route handler).
 */
export const AdMedia: CollectionConfig = {
  slug: 'ad-media',
  labels: { singular: 'Mídia de anúncio', plural: 'Mídias de anúncios' },
  admin: {
    group: 'ClassiSex',
    useAsTitle: 'filename',
    defaultColumns: ['filename', 'kind', 'ad', 'createdAt'],
    description:
      'Fotos e vídeos dos anúncios. Ficam fora da área pública: só a equipe, o anunciante e assinantes ativos abrem.',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: {
    beforeOperation: [validateAndClean],
    afterChange: [
      writePreview,
      ({ doc }) => {
        expire(['ads'])
        return doc
      },
    ],
    afterDelete: [removePreview],
  },
  upload: {
    mimeTypes: [...PHOTO_MIME_TYPES, ...VIDEO_MIME_TYPES],
    // Re-encoding drops EXIF/GPS (no withMetadata); videos are never touched by sharp
    formatOptions: webp,
    resizeOptions: { width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true },
    imageSizes: [{ name: 'card', width: 480, withoutEnlargement: true, formatOptions: webp }],
    adminThumbnail: 'card',
    focalPoint: false,
    crop: false,
  },
  fields: [
    {
      name: 'ad',
      type: 'relationship',
      relationTo: 'ads',
      required: true,
      index: true,
      label: 'Anúncio',
    },
    {
      name: 'owner',
      type: 'relationship',
      relationTo: 'assinantes',
      required: true,
      index: true,
      label: 'Anunciante',
      admin: { readOnly: true, description: 'Preenchido com o autor do anúncio.' },
    },
    {
      name: 'kind',
      type: 'select',
      required: true,
      label: 'Tipo',
      options: [
        { label: 'Foto', value: 'foto' },
        { label: 'Vídeo', value: 'video' },
      ],
      admin: { readOnly: true },
    },
    { name: 'order', type: 'number', defaultValue: 0, label: 'Ordem', admin: { description: 'Menor aparece primeiro.' } },
    { name: 'durationSeconds', type: 'number', label: 'Duração (s)', admin: { readOnly: true } },
    { name: 'previa', type: 'text', admin: { hidden: true } },
  ],
}

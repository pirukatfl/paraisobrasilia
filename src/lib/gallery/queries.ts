import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Media, Model, SpaceItem, Video } from '../../payload-types'
import { cached } from '../cache/cached'
import { SLUG_RE } from '../contos/excerpt'
import { MODEL_VIDEOS_ENABLED } from './flags'
import type { GalleryImage, GalleryItemDTO, ModelCardDTO, ModelPageDTO, SpaceItemDTO } from './types'

const SPACE_LIMIT = 120 // bounded list
export const SPACE_PHOTO_ALT = 'Foto do espaço do Paraíso Brasília'

const asMedia = (value: unknown): Media | null => (typeof value === 'object' && value ? (value as Media) : null)

/** Media → GalleryImage: `gallery` derivative for the lightbox, `card` for tiles, original as fallback. */
export function toGalleryImage(value: unknown, altFallback: string): GalleryImage | null {
  const media = asMedia(value)
  if (!media?.url) return null
  const large = media.sizes?.gallery
  const thumb = media.sizes?.card
  const width = media.width ?? 1080
  const height = media.height ?? 1080
  const big =
    large?.url && large.width && large.height
      ? { url: large.url, width: large.width, height: large.height }
      : { url: media.url, width, height }
  const small =
    thumb?.url && thumb.width && thumb.height
      ? { thumbUrl: thumb.url, thumbWidth: thumb.width, thumbHeight: thumb.height }
      : { thumbUrl: big.url, thumbWidth: big.width, thumbHeight: big.height }
  return { ...big, ...small, alt: media.alt?.trim() || altFallback }
}

/** Populated video relation → video tile (poster as image); null when the file or poster is gone. */
function toVideoItem(value: unknown, id: string, caption: string | null, fallbackTitle: string): GalleryItemDTO | null {
  const video = typeof value === 'object' && value ? (value as Video) : null
  if (!video?.url) return null
  const title = video.title?.trim() || caption || fallbackTitle
  const poster = toGalleryImage(video.poster, title)
  if (!poster) return null
  return { id, kind: 'video', caption, image: poster, video: { url: video.url, title } }
}

export function toSpaceItemDTO(doc: SpaceItem): SpaceItemDTO | null {
  const caption = doc.caption?.trim() || null
  if (doc.kind === 'video') return toVideoItem(doc.video, String(doc.id), caption, 'Vídeo do espaço')
  const image = toGalleryImage(doc.image, caption || SPACE_PHOTO_ALT)
  if (!image) return null
  return { id: String(doc.id), kind: 'photo', caption, image, video: null }
}

async function fetchSpaceItems(): Promise<SpaceItemDTO[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'space-items',
    where: { _status: { equals: 'published' } },
    draft: false,
    sort: ['order', '-createdAt'],
    depth: 2,
    limit: SPACE_LIMIT,
  })
  return docs.map(toSpaceItemDTO).filter((d): d is SpaceItemDTO => d !== null)
}

/** Published space gallery (photos and videos), ordered by `order` then newest. Tag 'space'. */
export const getSpaceItems = cached(fetchSpaceItems, ['gallery:space'], () => ['space'])

/** Published space photos only (home teaser). */
export async function getSpacePhotos(limit: number): Promise<SpaceItemDTO[]> {
  return (await getSpaceItems()).filter((i) => i.kind === 'photo').slice(0, limit)
}

const MODELS_LIMIT = 60 // bounded list
export const MAX_MODEL_PHOTOS = 30
export const MAX_MODEL_VIDEOS = 3

export const modelAltFallback = (name: string) => `${name} — modelo do Paraíso Brasília`

/** Valid photos of a model (media with a file), in panel order, capped at the collection limit. */
function modelPhotos(doc: Model, name: string): GalleryImage[] {
  return (doc.photos ?? [])
    .slice(0, MAX_MODEL_PHOTOS)
    .map((row) => toGalleryImage(row.image, modelAltFallback(name)))
    .filter((p): p is GalleryImage => p !== null)
}

/** Valid videos of a model (file and poster present), in panel order, capped at the collection limit. */
function modelVideos(doc: Model, name: string): GalleryItemDTO[] {
  if (!MODEL_VIDEOS_ENABLED) return [] // off for now (client 2026-10-23); stored videos are kept, never shown
  return (doc.videos ?? [])
    .slice(0, MAX_MODEL_VIDEOS)
    .map((row, i) => toVideoItem(row.video, `${doc.id}-v${i}`, null, `Vídeo de ${name}`))
    .filter((v): v is GalleryItemDTO => v !== null)
}

export function toModelCardDTO(doc: Model): ModelCardDTO | null {
  const name = doc.name?.trim()
  if (!name || !doc.slug) return null
  const photos = modelPhotos(doc, name)
  if (photos.length === 0) return null
  return {
    id: String(doc.id),
    slug: doc.slug,
    name,
    cover: photos[0],
    photoCount: photos.length,
    videoCount: modelVideos(doc, name).length,
    updatedAt: doc.updatedAt,
  }
}

export function toModelPageDTO(doc: Model): ModelPageDTO | null {
  const name = doc.name?.trim()
  if (!name || !doc.slug) return null
  const photos = modelPhotos(doc, name)
  if (photos.length === 0) return null
  const videos = modelVideos(doc, name)
  const cover = photos[0]
  const coverMedia = asMedia(doc.photos?.[0]?.image)
  const og = coverMedia?.sizes?.og
  return {
    id: String(doc.id),
    slug: doc.slug,
    name,
    description: doc.description?.trim() || null,
    items: [
      ...videos,
      ...photos.map((image, i): GalleryItemDTO => ({ id: `${doc.id}-p${i}`, kind: 'photo', caption: null, image, video: null })),
    ],
    cover,
    ogImage:
      og?.url && og.width && og.height
        ? { url: og.url, width: og.width, height: og.height, alt: cover.alt }
        : { url: cover.url, width: cover.width, height: cover.height, alt: cover.alt },
    photoCount: photos.length,
    videoCount: videos.length,
    updatedAt: doc.updatedAt,
  }
}

async function fetchPublishedModels(): Promise<ModelCardDTO[]> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'models',
    where: { _status: { equals: 'published' } },
    draft: false,
    sort: ['order', 'name'],
    depth: 2,
    limit: MODELS_LIMIT,
  })
  return docs.map(toModelCardDTO).filter((d): d is ModelCardDTO => d !== null)
}

/** Published models with a cover, by `order` then name. Tag 'models'. */
export const getPublishedModels = cached(fetchPublishedModels, ['gallery:models'], () => ['models'])

async function fetchPublishedModel(slug: string): Promise<ModelPageDTO | null> {
  if (!SLUG_RE.test(slug)) return null
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'models',
    where: { and: [{ slug: { equals: slug } }, { _status: { equals: 'published' } }] },
    draft: false,
    depth: 2,
    limit: 1,
    pagination: false,
  })
  return docs[0] ? toModelPageDTO(docs[0]) : null
}

/** One published model page by slug, or null (draft, unknown, malformed). Tag 'models'. */
export const getPublishedModel = cached(fetchPublishedModel, ['gallery:model'], () => ['models'])

/** Whether the Modelos section exists (nav, footer, sitemap, /modelos). Same tag 'models'. */
export async function hasPublishedModels(): Promise<boolean> {
  return (await getPublishedModels()).length > 0
}

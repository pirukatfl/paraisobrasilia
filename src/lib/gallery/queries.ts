import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { Media, SpaceItem, Video } from '../../payload-types'
import { cached } from '../cache/cached'
import type { GalleryImage, SpaceItemDTO } from './types'

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

export function toSpaceItemDTO(doc: SpaceItem): SpaceItemDTO | null {
  const caption = doc.caption?.trim() || null
  if (doc.kind === 'video') {
    const video = typeof doc.video === 'object' && doc.video ? (doc.video as Video) : null
    if (!video?.url) return null
    const title = video.title?.trim() || caption || 'Vídeo do espaço'
    const poster = toGalleryImage(video.poster, title)
    if (!poster) return null
    return { id: String(doc.id), kind: 'video', caption, image: poster, video: { url: video.url, title } }
  }
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

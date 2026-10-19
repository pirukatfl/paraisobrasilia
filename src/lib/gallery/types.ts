/** Image as the galleries need it: large (lightbox) + thumbnail (grid tile). */
export type GalleryImage = {
  url: string
  width: number
  height: number
  alt: string
  thumbUrl: string
  thumbWidth: number
  thumbHeight: number
}

/** One /espaco tile. For videos, `image` is the poster. */
export type SpaceItemDTO = {
  id: string
  kind: 'photo' | 'video'
  caption: string | null
  image: GalleryImage
  video: { url: string; title: string } | null
}

export type ModelDTO = { id: string; name: string; photos: GalleryImage[] }

export type LightboxSlide = {
  kind: 'photo' | 'video'
  image: GalleryImage
  videoUrl?: string
  label: string
}

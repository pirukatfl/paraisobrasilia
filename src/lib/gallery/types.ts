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

/** One tile of a model page: same shape as the /espaco tiles, so Gallery and Lightbox are reused. */
export type GalleryItemDTO = SpaceItemDTO

/** /modelos card (UI-SPEC S11'): cover = first photo. */
export type ModelCardDTO = {
  id: string
  slug: string
  name: string
  cover: GalleryImage
  photoCount: number
  videoCount: number
  updatedAt: string
}

/** /modelos/{slug} (UI-SPEC S12). */
export type ModelPageDTO = {
  id: string
  slug: string
  name: string
  description: string | null
  items: GalleryItemDTO[]
  cover: GalleryImage
  ogImage: { url: string; width: number; height: number; alt: string } | null
  photoCount: number
  videoCount: number
  updatedAt: string
}

export type LightboxSlide = {
  kind: 'photo' | 'video'
  image: GalleryImage
  videoUrl?: string
  label: string
  /** Optional "more details" page for this slide (e.g. the party page), shown as a link in the footer */
  href?: string
}

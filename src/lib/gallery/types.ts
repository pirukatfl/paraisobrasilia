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
  /** Model photos only: media id, used for the blurred copy served to non-subscribers. */
  mediaId?: number
  /** Set on the server for viewers without access: shown as a blurred tile, not openable. */
  locked?: boolean
}

/** One tile of a model page: same shape as the /espaco tiles, so Gallery and Lightbox are reused. */
export type GalleryItemDTO = SpaceItemDTO

/** /modelos card (UI-SPEC S11'): cover = first photo. */
export type ModelCategoria = 'profissional' | 'amadora'

export type ModelCardDTO = {
  id: string
  slug: string
  name: string
  categoria: ModelCategoria
  description: string | null
  cover: GalleryImage
  photoCount: number
  videoCount: number
  updatedAt: string
  /** Own link when the card is not a model page (a submission from the public: /amadoras/{id}). */
  href?: string
  /** Cover skips the Next image optimizer (files that staff can unpublish at any time). */
  semOtimizador?: boolean
}

/** /modelos/{slug} (UI-SPEC S12). */
export type ModelPageDTO = {
  id: string
  slug: string
  name: string
  description: string | null
  /** Whether a contact is registered; the contact itself is read per request, for subscribers only. */
  hasContact: boolean
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

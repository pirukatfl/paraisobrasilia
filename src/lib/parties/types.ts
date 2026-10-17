/** Plain data shapes handed from server queries to UI components (no Payload types leak out). */
export type FlyerFormat = 'square' | 'portrait'

export interface FlyerImage {
  url: string
  width: number
  height: number
  alt: string
}

export interface PartyCardDTO {
  id: string
  slug: string
  title: string
  startsAt: string
  endsAt: string
  flyerFormat: FlyerFormat
  flyer: FlyerImage
}

export interface PriceRow {
  label: string
  value: string
}

export interface Attraction {
  kind: 'dj' | 'show' | 'modelo' | 'outro'
  name: string
}

/** Lexical editor JSON as stored by Payload (rendered with @payloadcms/richtext-lexical/react). */
export type RichTextState = import('@payloadcms/richtext-lexical/lexical').SerializedEditorState

export interface PartyDetailDTO extends PartyCardDTO {
  summary: string | null
  details: RichTextState | null
  prices: PriceRow[]
  dressCode: string | null
  attractions: Attraction[]
  isPast: boolean
  updatedAt: string
  /** Absolute URL of the 1200x630 JPEG share image */
  flyerOgUrl: string | null
  /** Staff-editable SEO overrides (@payloadcms/plugin-seo) */
  meta?: { title?: string | null; description?: string | null } | null
}

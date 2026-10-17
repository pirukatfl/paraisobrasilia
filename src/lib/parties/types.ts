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

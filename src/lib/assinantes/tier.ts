/**
 * Account tiers (conta gratuita G-02/G-03/G-05, I-2). Pure module: no Payload/Next imports.
 *
 * Binary tier derived from the existing access logic: `assinante` iff the account has an active
 * period right now; every other state (sem-assinatura, vencida, encerrada) is `gratis`.
 */
import { ACTIVE_LIMIT } from '../classisex/rules'
import { MAX_AD_PHOTOS, MAX_AD_VIDEOS } from '../classisex/media-messages'
import type { AccessState } from './status'

export type Tier = 'gratis' | 'assinante'

export const TIER_LABELS: Record<Tier, 'Conta gratuita' | 'Assinante'> = { gratis: 'Conta gratuita', assinante: 'Assinante' }

export const TIER_LIMITS: Record<Tier, { fotos: number; videos: number; anunciosAtivos: number }> = {
  gratis: { fotos: 1, videos: 0, anunciosAtivos: ACTIVE_LIMIT },
  assinante: { fotos: MAX_AD_PHOTOS, videos: MAX_AD_VIDEOS, anunciosAtivos: ACTIVE_LIMIT },
}

export function tierOf(access: { state: AccessState }): Tier {
  return access.state === 'ativa' ? 'assinante' : 'gratis'
}

/** For lists of other people's ads: the denormalised `assinantes.accessUntil` (same approximation as before). */
export function tierFromAccessUntil(accessUntil: string | Date | null | undefined, now: Date): Tier {
  if (!accessUntil) return 'gratis'
  const time = new Date(accessUntil).getTime()
  return Number.isFinite(time) && time > now.getTime() ? 'assinante' : 'gratis'
}

type MediaLike = { id: number; kind: 'foto' | 'video'; order?: number | null }

const byOrder = (a: MediaLike, b: MediaLike) => Number(a.order ?? 0) - Number(b.order ?? 0) || a.id - b.id

/** The cover: first photo by (order, id). Same ordering as the DTOs, the public preview and the media route. */
export function coverOf<T extends MediaLike>(media: T[]): T | null {
  const photos = media.filter((m) => m.kind === 'foto').sort(byOrder)
  return photos[0] ?? null
}

/** What other members may see of an ad's media: everything for a paying author, only the cover otherwise. */
export function visibleMediaFor<T extends MediaLike>(tier: Tier, media: T[]): T[] {
  if (tier === 'assinante') return media
  const cover = coverOf(media)
  return cover ? [cover] : []
}

/** G-06 comparison rows (shown on /cadastro, Meus anúncios, Novo anúncio and /assine-ja). */
export const TIER_COMPARISON: { item: string; gratis: string; assinante: string }[] = [
  { item: 'Fotos por anúncio', gratis: '1', assinante: `até ${MAX_AD_PHOTOS}` },
  { item: 'Vídeos por anúncio', gratis: 'não', assinante: `até ${MAX_AD_VIDEOS}` },
  { item: 'Anúncios ativos', gratis: `até ${ACTIVE_LIMIT}`, assinante: `até ${ACTIVE_LIMIT}` },
  { item: 'Ver anúncios do ClassiSex', gratis: 'só os seus', assinante: 'todos, com contatos' },
  { item: 'Mensagens e recados', gratis: 'não', assinante: 'sim' },
  { item: 'Contos completos', gratis: 'só o início', assinante: 'sim' },
]

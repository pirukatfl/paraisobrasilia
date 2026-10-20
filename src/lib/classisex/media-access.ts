import type { Tier } from '../assinantes/tier'
import { isAdVisible } from './visibility'

/**
 * Who may open a ClassiSex photo or video through /area-do-assinante/midia/… (CLAS-06, D-05, G-05).
 * Owner and staff open every stored file; other paying members open everything of a paying author but
 * only the cover of a free author. Free viewers never open other people's files (G-02).
 * Pure decision, unit-tested; the route handler loads the facts and maps the answer to
 * 200 / 403 / 404. Pure module.
 */
export type Principal = { collection: 'users' | 'assinantes'; id: number } | null
export type MediaVariant = 'miniatura' | 'foto' | 'video'
export type MediaDecision = 'allow' | 'unauthenticated' | 'not-found'

export const MEDIA_VARIANTS: MediaVariant[] = ['miniatura', 'foto', 'video']

export function canViewMedia(args: {
  principal: Principal
  viewerActive: boolean
  media: { owner: number | null; kind: 'foto' | 'video' }
  ad: { status: string } | null
  /** Tier of the AD AUTHOR right now (accessStatusFor, per request). */
  authorTier: Tier
  /** True when this file is coverOf(photos of the ad). */
  isCover: boolean
  variante: MediaVariant
}): MediaDecision {
  const { principal, media, variante } = args
  // A variant that does not exist for this kind of file is simply not there
  if ((variante === 'video') !== (media.kind === 'video')) return 'not-found'
  if (!principal) return 'unauthenticated'
  if (principal.collection === 'users') return 'allow'
  if (media.owner !== null && principal.id === media.owner) return 'allow'
  // T-04-05: entitlement of the viewer is checked on every request
  if (!args.viewerActive) return 'unauthenticated'
  if (!args.ad || !isAdVisible(args.ad)) return 'not-found'
  if (args.authorTier === 'assinante') return 'allow'
  // G-05: a free (or expired) author exposes only the cover photo; videos and extra photos are 404
  return media.kind === 'foto' && args.isCover ? 'allow' : 'not-found'
}

import type { Where } from 'payload'

/**
 * ClassiSex visibility (conta gratuita G-04, G-05; replaces 04-CONTEXT D-06): an ad exists for
 * members and for the public preview iff it is approved. The author's access NO LONGER hides it:
 * an author without an active subscription is a free account, whose approved ads stay up showing
 * only the cover photo (see `visibleMediaFor` in src/lib/assinantes/tier.ts). Renewal brings the
 * stored extra media back with no re-upload. `now` is kept for call-site stability.
 */
export function visibleAdsWhere(now?: Date): Where {
  void now
  return { status: { equals: 'aprovado' } }
}

export function isAdVisible(ad: { status: string }): boolean {
  return ad.status === 'aprovado'
}

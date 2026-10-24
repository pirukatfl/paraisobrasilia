import { validUntilLabel } from './periods'
import type { AccessStatus } from './status'

/** Days before the end of an active subscription when the renewal notice starts (same window as the staff panel). */
export const RENEWAL_WARNING_DAYS = 7

export type RenewalNotice =
  | { kind: 'expiring'; daysLeft: number; validUntilLabel: string }
  | { kind: 'expired'; endedLabel: string }

/**
 * Renewal notice for the top banner. Only former or soon-to-end subscribers get one: accounts that
 * never subscribed (`sem-assinatura`) and accounts ended by staff (`encerrada`) see nothing.
 */
export function renewalNotice(access: AccessStatus): RenewalNotice | null {
  if (access.state === 'ativa' && access.daysLeft !== null && access.validUntilLabel !== null) {
    if (access.daysLeft > RENEWAL_WARNING_DAYS) return null
    return { kind: 'expiring', daysLeft: access.daysLeft, validUntilLabel: access.validUntilLabel }
  }
  if (access.state === 'vencida' && access.lastEndedAt) {
    return { kind: 'expired', endedLabel: validUntilLabel(access.lastEndedAt) }
  }
  return null
}

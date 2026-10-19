import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { accessUntilOf, daysLeft, isPeriodActive, validUntilLabel, type PeriodLike } from './periods'

export type AccessState = 'ativa' | 'vencida' | 'encerrada' | 'sem-assinatura'

export type AccessStatus = {
  state: AccessState
  validUntil: Date | null
  validUntilLabel: string | null
  daysLeft: number | null
  lastEndedAt: Date | null
}

type PeriodDoc = PeriodLike & { closedAt?: string | null }

const PERIODS_LIMIT = 200

/** Pure part: state of an account from its periods at `now` (exported for tests and the panel). */
export function accessStatusOf(periods: PeriodDoc[], now: Date): AccessStatus {
  if (periods.some((p) => isPeriodActive(p, now))) {
    const until = accessUntilOf(periods)!
    return {
      state: 'ativa',
      validUntil: until,
      validUntilLabel: validUntilLabel(until),
      daysLeft: daysLeft(until, now),
      lastEndedAt: null,
    }
  }
  if (periods.length === 0) {
    return { state: 'sem-assinatura', validUntil: null, validUntilLabel: null, daysLeft: null, lastEndedAt: null }
  }
  const lastNaturalEnd = accessUntilOf(periods)
  const closings = periods
    .filter((p) => p.status === 'encerrada' && p.closedAt)
    .map((p) => new Date(p.closedAt as string).getTime())
  const lastClosed = closings.length ? Math.max(...closings) : null
  if (lastClosed !== null && (lastNaturalEnd === null || lastClosed > lastNaturalEnd.getTime())) {
    return {
      state: 'encerrada',
      validUntil: null,
      validUntilLabel: null,
      daysLeft: null,
      lastEndedAt: new Date(lastClosed),
    }
  }
  if (lastNaturalEnd === null) {
    // Only ended periods without a closing date (should not happen): treat as ended by staff
    return { state: 'encerrada', validUntil: null, validUntilLabel: null, daysLeft: null, lastEndedAt: null }
  }
  return { state: 'vencida', validUntil: null, validUntilLabel: null, daysLeft: null, lastEndedAt: lastNaturalEnd }
}

/**
 * Entitlement of one subscriber, computed from its periods on every request (ASS-04: no cron).
 * Never cached: subscriber-specific (T-03-05).
 */
export async function getAccessStatus(assinanteId: number | string, now: Date = new Date()): Promise<AccessStatus> {
  const payload = await getPayload({ config })
  const { docs } = await payload.find({
    collection: 'subscriptions',
    where: { assinante: { equals: assinanteId } },
    sort: '-endsAt',
    depth: 0,
    limit: PERIODS_LIMIT,
    overrideAccess: true,
  })
  return accessStatusOf(docs as PeriodDoc[], now)
}

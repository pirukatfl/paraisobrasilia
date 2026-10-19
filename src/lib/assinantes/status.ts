import type { Payload, PayloadRequest } from 'payload'

import { accessUntilOf, daysLeft, isPeriodActive, validUntilLabel, type PeriodLike } from './periods'

/**
 * Entitlement from periods. No 'server-only' import: also loaded by the Payload config
 * (collection endpoints) in plain Node (CLI, migrations).
 */
export type AccessState = 'ativa' | 'vencida' | 'encerrada' | 'sem-assinatura'

export type AccessStatus = {
  state: AccessState
  validUntil: Date | null
  validUntilLabel: string | null
  daysLeft: number | null
  lastEndedAt: Date | null
}

export type PeriodDoc = PeriodLike & { closedAt?: string | null }

const PERIODS_LIMIT = 200

/** State of an account from its periods at `now`. */
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

export async function findPeriods(
  payload: Payload,
  assinanteId: number | string,
  req?: Partial<PayloadRequest>,
): Promise<(PeriodDoc & { id: number })[]> {
  const { docs } = await payload.find({
    collection: 'subscriptions',
    where: { assinante: { equals: assinanteId } },
    sort: '-endsAt',
    depth: 0,
    limit: PERIODS_LIMIT,
    overrideAccess: true,
    ...(req ? { req } : {}),
  })
  return docs as (PeriodDoc & { id: number })[]
}

export async function accessStatusFor(
  payload: Payload,
  assinanteId: number | string,
  now: Date,
  req?: Partial<PayloadRequest>,
): Promise<AccessStatus> {
  return accessStatusOf(await findPeriods(payload, assinanteId, req), now)
}

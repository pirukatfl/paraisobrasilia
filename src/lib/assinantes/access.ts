import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { accessStatusFor, type AccessStatus } from './status'

export { accessStatusOf, type AccessState, type AccessStatus } from './status'

/**
 * Entitlement of one subscriber, computed from its periods on every request (ASS-04: no cron).
 * Never cached: subscriber-specific (T-03-05).
 */
export async function getAccessStatus(assinanteId: number | string, now: Date = new Date()): Promise<AccessStatus> {
  const payload = await getPayload({ config })
  return accessStatusFor(payload, assinanteId, now)
}

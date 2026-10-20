import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { InboxItemDTO, ThreadDTO } from './dto'
import {
  composeTargetFor,
  type ComposeTarget,
  getThread,
  listInbox,
  markRead,
  threadSafetyState,
} from './service'

// Subscriber-specific reads: never cached; callers run the DAL guard first (T-05-06).

export async function getInbox(
  me: number,
  page: number,
): Promise<{ items: InboxItemDTO[]; page: number; totalPages: number }> {
  const payload = await getPayload({ config })
  return listInbox(payload, me, { page })
}

/** Loads the thread (participants only, T-05-05) and marks it read when it is the newest page. */
export async function getThreadFor(me: number, id: string, antes?: number): Promise<ThreadDTO | null> {
  const payload = await getPayload({ config })
  const thread = await getThread(payload, me, id, { antes })
  if (thread && !antes) await markRead(payload, me, thread.id, new Date())
  return thread
}

export type { ComposeTarget } from './service'

export async function getComposeTarget(
  me: number,
  id: string,
  ownApelido: string | null | undefined,
): Promise<ComposeTarget> {
  const payload = await getPayload({ config })
  return composeTargetFor(payload, { me, id, ownApelido, now: new Date() })
}

export async function getThreadSafety(me: number, id: string): Promise<{ euBloqueei: boolean }> {
  const payload = await getPayload({ config })
  return (await threadSafetyState(payload, me, id)) ?? { euBloqueei: false }
}

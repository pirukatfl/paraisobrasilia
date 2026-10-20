import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import type { InboxItemDTO, ThreadDTO } from './dto'
import {
  findExistingConversation,
  getThread,
  listInbox,
  markRead,
  resolveTarget,
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

export type ComposeTarget =
  | { state: 'nao-encontrado' }
  | { state: 'propria' }
  | { state: 'existente'; conversationId: number }
  | { state: 'novo'; recipientApelido: string; assunto: string; apelido: string }

/** Who the viewer would write to, derived from a visible ad/recado only (T-05-10). */
export async function getComposeTarget(
  me: number,
  origem: 'anuncio' | 'recado',
  id: string,
  ownApelido: string | null | undefined,
): Promise<ComposeTarget> {
  const payload = await getPayload({ config })
  const target = await resolveTarget(payload, { origem, id, viewerId: me, now: new Date() })
  if (!target) return { state: 'nao-encontrado' }
  if ('error' in target) return { state: 'propria' }
  const existing = await findExistingConversation(payload, me, target.recipientId)
  if (existing !== null) return { state: 'existente', conversationId: existing }
  return {
    state: 'novo',
    recipientApelido: target.recipientApelido,
    assunto: target.assunto,
    apelido: ownApelido ?? '',
  }
}

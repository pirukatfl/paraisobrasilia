/**
 * Private messaging service (REC-02, D-02, D-04). Runs after the members-area DAL check in the
 * server actions (05-09). No 'server-only': reachable from tests and later services.
 *
 * T-05-05: only participants read or write a thread. T-05-10: the recipient is always derived
 * from a visible ad/recado (or an existing conversation), never taken from the caller.
 * T-05-06/08: both sides must have access now; daily limits per São Paulo day.
 */
import type { Payload, Where } from 'payload'

import { spDate, spMidnight } from '../assinantes/periods'
import { accessStatusFor } from '../assinantes/status'
import { findVisibleAdDoc } from '../classisex/board'
import { apelidoError } from '../classisex/rules'
import { categoryLabels, ServiceError } from '../classisex/service'
import { findVisibleRecadoDoc } from '../recados/board'
import { formatMessageTime, snippetOf, type InboxItemDTO, type ThreadDTO } from './dto'
import {
  INBOX_PAGE,
  MENSAGEM_MESSAGES,
  MESSAGES_PER_DAY,
  NEW_CONVERSATIONS_PER_DAY,
  normaliseMessage,
  messageError,
  pairKey,
  THREAD_PAGE,
  UNREAD_CAP,
  type SendError,
} from './rules'

const relId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'object') {
    const id = (value as { id?: number | string }).id
    return id === undefined ? null : Number(id)
  }
  return Number(value)
}

const STATUS_OF: Partial<Record<SendError, number>> = {
  limiteConversas: 429,
  limiteMensagens: 429,
  remetenteInativo: 403,
  destinatarioInativo: 403,
  bloqueado: 403,
  voceBloqueou: 403,
  suspenso: 403,
}

const fail = (code: SendError): ServiceError => new ServiceError(code, MENSAGEM_MESSAGES[code], STATUS_OF[code] ?? 400)
const notFound = () => new ServiceError('nao-encontrado', 'Conversa não encontrada.', 404)

type ConversationDoc = {
  id: number
  participantA: unknown
  participantB: unknown
  pairKey: string
  apelidoA?: string | null
  apelidoB?: string | null
  assunto?: string | null
  lastMessageAt?: string | null
  lastSender?: unknown
  lastReadA?: string | null
  lastReadB?: string | null
}

export type Target = { recipientId: number; recipientApelido: string; assunto: string }

/** The recipient of a new conversation comes from a visible ad or recado of someone else. */
export async function resolveTarget(
  payload: Payload,
  { origem, id, viewerId, now }: { origem: 'anuncio' | 'recado'; id: number | string; viewerId: number; now: Date },
): Promise<Target | { error: 'propria' } | null> {
  if (origem === 'anuncio') {
    const ad = await findVisibleAdDoc(payload, id, now)
    if (!ad) return null
    const authorId = relId((ad as unknown as { author?: unknown }).author)
    if (authorId === null) return null
    if (authorId === Number(viewerId)) return { error: 'propria' }
    const labels = await categoryLabels(payload)
    const tipo = labels.get(relId(ad.euSou) ?? -1) ?? 'Anúncio'
    const apelido = ad.apelido?.trim() || 'Anúncio'
    return { recipientId: authorId, recipientApelido: apelido, assunto: `Anúncio: ${apelido} · ${tipo}`.slice(0, 120) }
  }
  const recado = await findVisibleRecadoDoc(payload, id, now)
  if (!recado) return null
  const authorId = relId(recado.author)
  if (authorId === null) return null
  if (authorId === Number(viewerId)) return { error: 'propria' }
  const flat = recado.texto.replace(/\s+/g, ' ').trim()
  const trecho = flat.length > 40 ? `${flat.slice(0, 40).trimEnd()}…` : flat
  return {
    recipientId: authorId,
    recipientApelido: recado.apelido?.trim() || 'Recado',
    assunto: `Recado: ${trecho}`.slice(0, 120),
  }
}

/** Both sides need access now. Block/suspension rules join in 05-10. */
export async function canSend(
  payload: Payload,
  { senderId, recipientId, now }: { senderId: number; recipientId: number; now: Date },
): Promise<SendError | null> {
  const [sender, recipient] = await Promise.all([
    accessStatusFor(payload, senderId, now),
    accessStatusFor(payload, recipientId, now),
  ])
  if (sender.state !== 'ativa') return 'remetenteInativo'
  if (recipient.state !== 'ativa') return 'destinatarioInativo'
  return null
}

export async function findExistingConversation(payload: Payload, a: number, b: number): Promise<number | null> {
  const { docs } = await payload.find({
    collection: 'conversations',
    where: { pairKey: { equals: pairKey(a, b) } },
    depth: 0,
    limit: 1,
    overrideAccess: true,
  })
  return docs[0]?.id ?? null
}

async function loadParticipantConversation(
  payload: Payload,
  me: number,
  conversationId: number | string,
): Promise<ConversationDoc | null> {
  const id = Number(conversationId)
  if (!Number.isInteger(id) || id <= 0) return null
  const doc = (await payload.findByID({
    collection: 'conversations',
    id,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as ConversationDoc | null
  if (!doc) return null
  // T-05-05: anyone else gets the same answer as an unknown id
  if (relId(doc.participantA) !== Number(me) && relId(doc.participantB) !== Number(me)) return null
  return doc
}

const dayStart = (now: Date) => spMidnight(spDate(now)).toISOString()

async function assertMessageLimit(payload: Payload, senderId: number, now: Date): Promise<void> {
  const { totalDocs } = await payload.count({
    collection: 'messages',
    where: { and: [{ sender: { equals: senderId } }, { createdAt: { greater_than_equal: dayStart(now) } }] },
    overrideAccess: true,
  })
  if (totalDocs >= MESSAGES_PER_DAY) throw fail('limiteMensagens')
}

async function assertConversationLimit(payload: Payload, senderId: number, now: Date): Promise<void> {
  const { totalDocs } = await payload.count({
    collection: 'conversations',
    where: { and: [{ startedBy: { equals: senderId } }, { createdAt: { greater_than_equal: dayStart(now) } }] },
    overrideAccess: true,
  })
  if (totalDocs >= NEW_CONVERSATIONS_PER_DAY) throw fail('limiteConversas')
}

async function appendMessage(
  payload: Payload,
  conversation: ConversationDoc,
  senderId: number,
  texto: string,
  now: Date,
): Promise<number> {
  const created = await payload.create({
    collection: 'messages',
    data: { conversation: conversation.id, sender: senderId, texto, createdAt: now.toISOString() },
    overrideAccess: true,
  })
  const mine = relId(conversation.participantA) === senderId ? 'lastReadA' : 'lastReadB'
  await payload.update({
    collection: 'conversations',
    id: conversation.id,
    data: { lastMessageAt: now.toISOString(), lastSender: senderId, [mine]: now.toISOString() },
    overrideAccess: true,
  })
  return created.id
}

export type StartInput = {
  senderId: number
  origem: 'anuncio' | 'recado'
  id: number | string
  texto: string
  apelido?: string
  now: Date
}

export async function startConversation(payload: Payload, input: StartInput): Promise<{ conversationId: number }> {
  const { senderId, now } = input
  const invalid = messageError(input.texto)
  if (invalid) throw fail(invalid)
  const texto = normaliseMessage(input.texto)

  // T-05-10: only origem + id are read; the recipient is the author of the visible ad/recado
  const target = await resolveTarget(payload, { origem: input.origem, id: input.id, viewerId: senderId, now })
  if (!target) throw new ServiceError('nao-encontrado', 'Anúncio ou recado não encontrado.', 404)
  if ('error' in target) throw fail(target.error)

  const account = (await payload.findByID({
    collection: 'assinantes',
    id: senderId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as { apelido?: string | null } | null
  if (!account) throw new ServiceError('nao-encontrado', 'Conta não encontrada.', 404)
  const given = typeof input.apelido === 'string' ? input.apelido.replace(/\s+/g, ' ').trim() : ''
  const apelido = given || account.apelido?.trim() || ''
  if (!apelido) throw fail('semApelido')
  const apelidoProblem = apelidoError(apelido)
  if (apelidoProblem) throw new ServiceError('apelido', apelidoProblem, 400)

  const blocked = await canSend(payload, { senderId, recipientId: target.recipientId, now })
  if (blocked) throw fail(blocked)

  await assertMessageLimit(payload, senderId, now)
  let conversationId = await findExistingConversation(payload, senderId, target.recipientId)
  if (conversationId === null) {
    await assertConversationLimit(payload, senderId, now)
    const [low, high] = senderId < target.recipientId ? [senderId, target.recipientId] : [target.recipientId, senderId]
    const senderIsA = low === senderId
    try {
      const created = await payload.create({
        collection: 'conversations',
        data: {
          participantA: low,
          participantB: high,
          pairKey: pairKey(senderId, target.recipientId),
          apelidoA: senderIsA ? apelido : target.recipientApelido,
          apelidoB: senderIsA ? target.recipientApelido : apelido,
          assunto: target.assunto,
          startedBy: senderId,
          createdAt: now.toISOString(),
        },
        overrideAccess: true,
      })
      conversationId = created.id
    } catch (err) {
      // Two simultaneous first messages: the unique pairKey sends the loser to the winner's thread
      conversationId = await findExistingConversation(payload, senderId, target.recipientId)
      if (conversationId === null) throw err
    }
  }
  if (given && given !== account.apelido) {
    await payload.update({
      collection: 'assinantes',
      id: senderId,
      data: { apelido: given },
      overrideAccess: true,
      context: { skipAudit: true },
    })
  }
  const conversation = (await loadParticipantConversation(payload, senderId, conversationId))!
  await appendMessage(payload, conversation, senderId, texto, now)
  return { conversationId }
}

export async function sendMessage(
  payload: Payload,
  { senderId, conversationId, texto, now }: { senderId: number; conversationId: number | string; texto: string; now: Date },
): Promise<{ messageId: number }> {
  const conversation = await loadParticipantConversation(payload, senderId, conversationId)
  if (!conversation) throw notFound()
  const invalid = messageError(texto)
  if (invalid) throw fail(invalid)
  const recipientId = (relId(conversation.participantA) === senderId
    ? relId(conversation.participantB)
    : relId(conversation.participantA))!
  const blocked = await canSend(payload, { senderId, recipientId, now })
  if (blocked) throw fail(blocked)
  await assertMessageLimit(payload, senderId, now)
  const messageId = await appendMessage(payload, conversation, senderId, normaliseMessage(texto), now)
  return { messageId }
}

const isA = (c: ConversationDoc, me: number) => relId(c.participantA) === Number(me)

const unreadIn = (c: ConversationDoc, me: number): boolean => {
  if (!c.lastMessageAt || relId(c.lastSender) === Number(me)) return false
  const marker = isA(c, me) ? c.lastReadA : c.lastReadB
  return !marker || new Date(c.lastMessageAt).getTime() > new Date(marker).getTime()
}

export async function listInbox(
  payload: Payload,
  me: number,
  { page = 1 }: { page?: number } = {},
): Promise<{ items: InboxItemDTO[]; page: number; totalPages: number }> {
  const result = await payload.find({
    collection: 'conversations',
    where: { or: [{ participantA: { equals: me } }, { participantB: { equals: me } }] },
    sort: '-lastMessageAt',
    depth: 0,
    limit: INBOX_PAGE,
    page,
    overrideAccess: true,
  })
  const docs = result.docs as unknown as ConversationDoc[]
  const lasts = await Promise.all(
    docs.map((c) =>
      payload.find({
        collection: 'messages',
        where: { conversation: { equals: c.id } },
        sort: '-id',
        depth: 0,
        limit: 1,
        overrideAccess: true,
      }),
    ),
  )
  const items = docs.map((c, i) => ({
    id: c.id,
    outroApelido: (isA(c, me) ? c.apelidoB : c.apelidoA) ?? 'Assinante',
    assunto: c.assunto ?? '',
    ultimo: snippetOf(lasts[i]!.docs[0]?.texto ?? ''),
    quando: c.lastMessageAt ? formatMessageTime(c.lastMessageAt) : '',
    naoLida: unreadIn(c, me),
  }))
  return { items, page, totalPages: Math.max(1, result.totalPages) }
}

export async function getThread(
  payload: Payload,
  me: number,
  conversationId: number | string,
  { antes }: { antes?: number } = {},
): Promise<ThreadDTO | null> {
  const conversation = await loadParticipantConversation(payload, me, conversationId)
  if (!conversation) return null
  const result = await payload.find({
    collection: 'messages',
    where: {
      and: [{ conversation: { equals: conversation.id } }, ...(antes ? [{ id: { less_than: antes } }] : [])],
    },
    sort: '-id',
    depth: 0,
    limit: THREAD_PAGE + 1,
    pagination: false,
    overrideAccess: true,
  })
  const hasMore = result.docs.length > THREAD_PAGE
  const shown = result.docs.slice(0, THREAD_PAGE).reverse()
  return {
    id: conversation.id,
    outroApelido: (isA(conversation, me) ? conversation.apelidoB : conversation.apelidoA) ?? 'Assinante',
    meuApelido: (isA(conversation, me) ? conversation.apelidoA : conversation.apelidoB) ?? '',
    assunto: conversation.assunto ?? '',
    mensagens: shown.map((m) => ({
      id: m.id,
      minha: relId(m.sender) === Number(me),
      texto: m.texto,
      quando: formatMessageTime(m.createdAt),
    })),
    temAnteriores: hasMore,
    antesDe: hasMore ? (shown[0]?.id ?? null) : null,
  }
}

export async function markRead(
  payload: Payload,
  me: number,
  conversationId: number | string,
  now: Date,
): Promise<void> {
  const conversation = await loadParticipantConversation(payload, me, conversationId)
  if (!conversation) return
  await payload.update({
    collection: 'conversations',
    id: conversation.id,
    data: { [isA(conversation, me) ? 'lastReadA' : 'lastReadB']: now.toISOString() },
    overrideAccess: true,
  })
}

/** Unread messages from other people, capped at UNREAD_CAP + 1 (the UI shows "99+"). */
export async function countUnread(payload: Payload, me: number): Promise<number> {
  const { docs } = await payload.find({
    collection: 'conversations',
    where: {
      and: [
        { or: [{ participantA: { equals: me } }, { participantB: { equals: me } }] },
        { lastSender: { not_equals: me } },
      ],
    },
    depth: 0,
    pagination: false,
    limit: 200,
    overrideAccess: true,
  })
  const clauses = (docs as unknown as ConversationDoc[]).map((c): Where => {
    const marker = isA(c, me) ? c.lastReadA : c.lastReadB
    return marker
      ? { and: [{ conversation: { equals: c.id } }, { createdAt: { greater_than: marker } }] }
      : { conversation: { equals: c.id } }
  })
  if (clauses.length === 0) return 0
  const { totalDocs } = await payload.count({
    collection: 'messages',
    where: { and: [{ sender: { not_equals: me } }, { or: clauses }] },
    overrideAccess: true,
  })
  return Math.min(totalDocs, UNREAD_CAP + 1)
}

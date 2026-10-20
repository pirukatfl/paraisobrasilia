/**
 * Private messaging service (REC-02, D-02, D-04). Runs after the members-area DAL check in the
 * server actions (05-09). No 'server-only': reachable from tests and later services.
 *
 * T-05-05: only participants read or write a thread. T-05-10: the recipient is always derived
 * from a visible ad/recado (or an existing conversation), never taken from the caller.
 * T-05-06/08: both sides must have access now; daily limits per São Paulo day.
 */
import { createLocalReq, type Payload, type PayloadRequest, type Where } from 'payload'

import { isStaff } from '../../access/roles'
import { writeAudit } from '../assinantes/audit'
import { withRequestState } from '../assinantes/context'
import { spDate, spMidnight } from '../assinantes/periods'
import { accessStatusFor } from '../assinantes/status'
import { findVisibleAdDoc } from '../classisex/board'
import { apelidoError } from '../classisex/rules'
import { DETAILS_MAX, NOTE_MAX, DAILY_LIMIT } from '../classisex/report-rules'
import { categoryLabels, ServiceError } from '../classisex/service'
import { findVisibleRecadoDoc } from '../recados/board'
import { formatMessageTime, formatSnapshotTime, snippetOf, type InboxItemDTO, type ThreadDTO } from './dto'
import {
  INBOX_PAGE,
  isMessageReportReason,
  MENSAGEM_MESSAGES,
  MESSAGE_URGENT_REASON,
  messageReasonLabel,
  REPORT_MESSAGES_PT,
  SNAPSHOT_MESSAGES,
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

const blockKey = (blocker: number, blocked: number) => `${blocker}-${blocked}`

async function hasBlock(payload: Payload, blocker: number, blocked: number): Promise<boolean> {
  const { totalDocs } = await payload.count({
    collection: 'blocks',
    where: { pairKey: { equals: blockKey(blocker, blocked) } },
    overrideAccess: true,
  })
  return totalDocs > 0
}

/** UI state: only `euBloqueei` is ever shown; `fuiBloqueado` just selects the neutral send error. */
export async function blockState(
  payload: Payload,
  me: number,
  otherId: number,
): Promise<{ euBloqueei: boolean; fuiBloqueado: boolean }> {
  const [euBloqueei, fuiBloqueado] = await Promise.all([hasBlock(payload, me, otherId), hasBlock(payload, otherId, me)])
  return { euBloqueei, fuiBloqueado }
}

/**
 * T-05-07: checked on start and on every send. Order: suspended sender, blocks in both
 * directions, then access of both sides.
 */
export async function canSend(
  payload: Payload,
  { senderId, recipientId, now }: { senderId: number; recipientId: number; now: Date },
): Promise<SendError | null> {
  const sender = (await payload.findByID({
    collection: 'assinantes',
    id: senderId,
    depth: 0,
    overrideAccess: true,
    disableErrors: true,
  })) as { mensagensSuspensas?: boolean | null } | null
  if (sender?.mensagensSuspensas) return 'suspenso'
  const blocks = await blockState(payload, senderId, recipientId)
  if (blocks.euBloqueei) return 'voceBloqueou'
  if (blocks.fuiBloqueado) return 'bloqueado'
  const [senderAccess, recipientAccess] = await Promise.all([
    accessStatusFor(payload, senderId, now),
    accessStatusFor(payload, recipientId, now),
  ])
  if (senderAccess.state !== 'ativa') return 'remetenteInativo'
  if (recipientAccess.state !== 'ativa') return 'destinatarioInativo'
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

// ---------------------------------------------------------------------------------------------
// Block / unblock (REC-03)
// ---------------------------------------------------------------------------------------------

/** The other participant of a conversation I take part in, or null (T-05-05). */
async function otherParticipant(
  payload: Payload,
  me: number,
  conversationId: number | string,
): Promise<{ conversation: ConversationDoc; otherId: number } | null> {
  const conversation = await loadParticipantConversation(payload, me, conversationId)
  if (!conversation) return null
  const a = relId(conversation.participantA)!
  const b = relId(conversation.participantB)!
  return { conversation, otherId: a === Number(me) ? b : a }
}

export async function blockUser(
  payload: Payload,
  { me, conversationId }: { me: number; conversationId: number | string; now?: Date },
): Promise<void> {
  const found = await otherParticipant(payload, me, conversationId)
  if (!found) throw notFound()
  if (await hasBlock(payload, me, found.otherId)) return // idempotent
  try {
    await payload.create({
      collection: 'blocks',
      data: { blocker: me, blocked: found.otherId, pairKey: blockKey(me, found.otherId) },
      overrideAccess: true,
    })
  } catch (err) {
    if (!(await hasBlock(payload, me, found.otherId))) throw err
  }
}

export async function unblockUser(
  payload: Payload,
  { me, conversationId }: { me: number; conversationId: number | string; now?: Date },
): Promise<void> {
  const found = await otherParticipant(payload, me, conversationId)
  if (!found) throw notFound()
  await payload.delete({
    collection: 'blocks',
    where: { pairKey: { equals: blockKey(me, found.otherId) } },
    overrideAccess: true,
  })
}

// ---------------------------------------------------------------------------------------------
// Reports (REC-03). The reporter always comes from the session; staff only ever see the snapshot.
// ---------------------------------------------------------------------------------------------

async function suspendMessaging(payload: Payload, assinanteId: number): Promise<void> {
  await payload.update({
    collection: 'assinantes',
    id: assinanteId,
    data: { mensagensSuspensas: true },
    overrideAccess: true,
    context: { skipAudit: true },
  })
}

export async function reportConversation(
  payload: Payload,
  input: {
    me: number
    conversationId: number | string
    motivo: unknown
    detalhes?: unknown
    bloquear?: boolean
    now: Date
  },
): Promise<{ id: number; suspended: boolean }> {
  const { me, now } = input
  if (!isMessageReportReason(input.motivo)) {
    throw new ServiceError('invalido', 'Escolha o motivo da denúncia.', 400)
  }
  const detalhes = typeof input.detalhes === 'string' ? input.detalhes.replace(/\r\n/g, '\n').trim() : ''
  if (detalhes.length > DETAILS_MAX) throw new ServiceError('invalido', `Escreva até ${DETAILS_MAX} caracteres.`, 400)
  const found = await otherParticipant(payload, me, input.conversationId)
  if (!found) throw notFound()
  const { conversation, otherId } = found

  const open = await payload.count({
    collection: 'message-reports',
    where: {
      and: [
        { conversationId: { equals: conversation.id } },
        { reporter: { equals: me } },
        { status: { equals: 'aberta' } },
      ],
    },
    overrideAccess: true,
  })
  if (open.totalDocs > 0) throw new ServiceError('duplicada', REPORT_MESSAGES_PT.jaDenunciou, 409)
  const today = await payload.count({
    collection: 'message-reports',
    where: { and: [{ reporter: { equals: me } }, { createdAt: { greater_than_equal: dayStart(now) } }] },
    overrideAccess: true,
  })
  if (today.totalDocs >= DAILY_LIMIT) throw new ServiceError('limite', REPORT_MESSAGES_PT.limite, 429)

  const recent = await payload.find({
    collection: 'messages',
    where: { conversation: { equals: conversation.id } },
    sort: '-id',
    depth: 0,
    limit: SNAPSHOT_MESSAGES,
    pagination: false,
    overrideAccess: true,
  })
  const apelidoOf = (senderId: number | null) =>
    (relId(conversation.participantA) === senderId ? conversation.apelidoA : conversation.apelidoB) ?? 'Assinante'
  const mensagens = recent.docs
    .slice()
    .reverse()
    .map((m) => `${apelidoOf(relId(m.sender))} · ${formatSnapshotTime(m.createdAt)}: ${m.texto}`)
    .join('\n')
  const reportedApelido = apelidoOf(otherId)

  const created = await payload.create({
    collection: 'message-reports',
    data: {
      conversationId: conversation.id,
      reporter: me,
      reported: otherId,
      reportedApelido,
      motivo: input.motivo,
      detalhes: detalhes || null,
      mensagens,
      status: 'aberta',
      createdAt: now.toISOString(),
    },
    overrideAccess: true,
  })
  if (input.bloquear) await blockUser(payload, { me, conversationId: conversation.id })

  // Orchestrator default: a report of a minor suspends the reported person's messaging at once
  let suspended = false
  if (input.motivo === MESSAGE_URGENT_REASON) {
    await suspendMessaging(payload, otherId)
    suspended = true
    const req = await createLocalReq({}, payload)
    const account = (await payload.findByID({
      collection: 'assinantes',
      id: otherId,
      depth: 0,
      overrideAccess: true,
      disableErrors: true,
    })) as { id: number; name?: string | null; email?: string | null } | null
    await writeAudit(req, {
      action: 'mensagens-suspensas',
      assinante: account ? { id: account.id, name: account.name, email: account.email } : null,
      summary: `Mensagens de ${reportedApelido} suspensas automaticamente: denúncia de pessoa menor de idade (#${created.id})`,
      details: { denuncia: created.id, automatico: true },
    })
  }
  return { id: created.id, suspended }
}

export type MessageResolveAction = 'descartar' | 'resolver' | 'suspender'

type MessageReportDoc = {
  id: number
  status: 'aberta' | 'resolvida' | 'descartada'
  motivo: string
  reported?: unknown
  reporter?: unknown
  reportedApelido?: string | null
}

/** Staff closes a report; `suspender` also blocks the reported person's messaging (T-05-11). */
export async function resolveMessageReport(
  req: PayloadRequest,
  reportId: number | string,
  { acao, nota }: { acao: MessageResolveAction; nota?: unknown },
  now: Date = new Date(),
): Promise<{ status: 'resolvida' | 'descartada'; closed: number; suspended: boolean }> {
  if (!isStaff({ req })) throw new ServiceError('proibido', 'Sem permissão.', 403)
  if (acao !== 'descartar' && acao !== 'resolver' && acao !== 'suspender') {
    throw new ServiceError('invalido', 'Escolha uma ação.', 400)
  }
  const text = typeof nota === 'string' ? nota.replace(/\s+/g, ' ').trim() : ''
  if (text.length > NOTE_MAX) throw new ServiceError('nota', `Escreva até ${NOTE_MAX} caracteres.`, 400)

  const numericId = Number(reportId)
  const report =
    Number.isInteger(numericId) && numericId > 0
      ? ((await withRequestState(req, () =>
          req.payload.findByID({
            collection: 'message-reports',
            id: numericId,
            depth: 0,
            overrideAccess: true,
            disableErrors: true,
            req,
          }),
        )) as unknown as MessageReportDoc | null)
      : null
  if (!report) throw new ServiceError('nao-encontrado', 'Denúncia não encontrada.', 404)
  if (report.status !== 'aberta') throw new ServiceError('transicao', 'Esta denúncia já foi resolvida.', 409)
  const reportedId = relId(report.reported)
  if (acao === 'suspender' && reportedId === null) {
    throw new ServiceError('sem-conta', 'A conta da pessoa denunciada não existe mais.', 409)
  }

  const staffId = (req.user as { id?: number } | null)?.id ?? null
  let ids = [report.id]
  if (acao === 'suspender' && reportedId !== null) {
    const { docs } = await withRequestState(req, () =>
      req.payload.find({
        collection: 'message-reports',
        where: { and: [{ reported: { equals: reportedId } }, { status: { equals: 'aberta' } }] },
        depth: 0,
        limit: 200,
        pagination: false,
        overrideAccess: true,
        req,
      }),
    )
    ids = Array.from(new Set([report.id, ...docs.map((d) => d.id)]))
    await withRequestState(req, () =>
      req.payload.update({
        collection: 'assinantes',
        id: reportedId,
        data: { mensagensSuspensas: true },
        overrideAccess: true,
        context: { skipAudit: true },
        req,
      }),
    )
  }
  const finalStatus = acao === 'descartar' ? 'descartada' : 'resolvida'
  for (const id of ids) {
    await withRequestState(req, () =>
      req.payload.update({
        collection: 'message-reports',
        id,
        data: { status: finalStatus, resolvidaPor: staffId, resolvidaEm: now.toISOString(), nota: text || null },
        overrideAccess: true,
        req,
      }),
    )
  }

  const account =
    reportedId === null
      ? null
      : await withRequestState(req, () =>
          req.payload.findByID({ collection: 'assinantes', id: reportedId, depth: 0, overrideAccess: true, disableErrors: true, req }),
        )
  const who = account ? { id: account.id, name: account.name, email: account.email } : null
  const label = report.reportedApelido ?? 'pessoa denunciada'
  await writeAudit(req, {
    action: 'denuncia-mensagem-resolvida',
    assinante: who,
    summary: `Denúncia de mensagem #${report.id} (${messageReasonLabel(report.motivo)}) sobre ${label}: ${
      acao === 'descartar' ? 'descartada' : acao === 'suspender' ? 'mensagens suspensas' : 'resolvida'
    }${text ? ` — ${text}` : ''}`,
    details: { denuncia: report.id, acao, motivo: report.motivo, nota: text || null, fechadas: ids.length },
  })
  if (acao === 'suspender') {
    await writeAudit(req, {
      action: 'mensagens-suspensas',
      assinante: who,
      summary: `Mensagens de ${label} suspensas pela equipe (denúncia #${report.id})`,
      details: { denuncia: report.id, nota: text || null },
    })
  }
  return { status: finalStatus, closed: ids.length, suspended: acao === 'suspender' }
}

export async function getMessageReportCounts(payload: Payload): Promise<{ abertas: number; urgentes: number }> {
  const [abertas, urgentes] = await Promise.all([
    payload.count({ collection: 'message-reports', where: { status: { equals: 'aberta' } }, overrideAccess: true }),
    payload.count({
      collection: 'message-reports',
      where: { and: [{ status: { equals: 'aberta' } }, { urgente: { equals: true } }] },
      overrideAccess: true,
    }),
  ])
  return { abertas: abertas.totalDocs, urgentes: urgentes.totalDocs }
}

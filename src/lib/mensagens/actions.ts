'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { requireActiveSubscription } from '../assinantes/session'
import { ServiceError } from '../classisex/service'
import { MENSAGEM_MESSAGES, REPORT_MESSAGES_PT } from './rules'
import { blockUser, reportConversation, sendMessage, startConversation, unblockUser } from './service'

const BASE = '/area-do-assinante/mensagens'

export type MessageFormState = { error: string | null; values: { texto: string; apelido?: string } } | null

const field = (formData: FormData, name: string) => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Starts (or continues) a conversation from an ad (REC-02, D-02, R-01). Only alvo,
 * texto and apelido are read from the form: the recipient is derived by the service (T-05-10).
 */
export async function iniciarConversa(_prev: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const alvo = field(formData, 'alvo')
  const check = await requireActiveSubscription(`${BASE}/nova`)
  const values = { texto: field(formData, 'texto'), apelido: field(formData, 'apelido') }
  if (check.inactive) return { error: MENSAGEM_MESSAGES.remetenteInativo, values }
  const payload = await getPayload({ config })
  let conversationId: number
  try {
    const result = await startConversation(payload, {
      senderId: check.assinante.id,
      id: alvo,
      texto: values.texto,
      apelido: values.apelido || undefined,
      now: new Date(),
    })
    conversationId = result.conversationId
  } catch (err) {
    if (err instanceof ServiceError) return { error: err.message, values }
    throw err
  }
  // redirect() throws: keep it outside the try block
  redirect(`${BASE}/${conversationId}`)
}

/** Reply in an existing thread; only conversa and texto are read from the form (T-05-05). */
export async function responderMensagem(_prev: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const conversa = field(formData, 'conversa')
  const check = await requireActiveSubscription(`${BASE}/${encodeURIComponent(conversa)}`)
  const values = { texto: field(formData, 'texto') }
  if (check.inactive) return { error: MENSAGEM_MESSAGES.remetenteInativo, values }
  const payload = await getPayload({ config })
  try {
    await sendMessage(payload, {
      senderId: check.assinante.id,
      conversationId: conversa,
      texto: values.texto,
      now: new Date(),
    })
  } catch (err) {
    if (err instanceof ServiceError) return { error: err.message, values }
    throw err
  }
  // Same URL as the page that posted: revalidate so the router shows the new message (a hash-only
  // redirect would be treated as in-page navigation and keep the stale thread)
  revalidatePath(`${BASE}/${Number(conversa)}`)
  redirect(`${BASE}/${Number(conversa)}`)
}

export type ReportState = { ok: boolean; message: string } | null

/** Block: only `conversa` is read; the other person comes from the conversation (T-05-05). */
export async function bloquear(formData: FormData): Promise<void> {
  const conversa = field(formData, 'conversa')
  const check = await requireActiveSubscription(`${BASE}/${encodeURIComponent(conversa)}`)
  if (check.inactive) redirect(BASE)
  const payload = await getPayload({ config })
  try {
    await blockUser(payload, { me: check.assinante.id, conversationId: conversa })
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err
    redirect(BASE)
  }
  revalidatePath(`${BASE}/${Number(conversa)}`)
  redirect(`${BASE}/${Number(conversa)}?ok=bloqueado`)
}

export async function desbloquear(formData: FormData): Promise<void> {
  const conversa = field(formData, 'conversa')
  const check = await requireActiveSubscription(`${BASE}/${encodeURIComponent(conversa)}`)
  if (check.inactive) redirect(BASE)
  const payload = await getPayload({ config })
  try {
    await unblockUser(payload, { me: check.assinante.id, conversationId: conversa })
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err
    redirect(BASE)
  }
  revalidatePath(`${BASE}/${Number(conversa)}`)
  redirect(`${BASE}/${Number(conversa)}?ok=desbloqueado`)
}

/** Report: reads only conversa, motivo, detalhes and bloquear; the reporter is the session (T-05-28). */
export async function denunciarConversa(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const conversa = field(formData, 'conversa')
  const check = await requireActiveSubscription(`${BASE}/${encodeURIComponent(conversa)}`)
  if (check.inactive) return { ok: false, message: MENSAGEM_MESSAGES.remetenteInativo }
  const payload = await getPayload({ config })
  try {
    await reportConversation(payload, {
      me: check.assinante.id,
      conversationId: conversa,
      motivo: field(formData, 'motivo'),
      detalhes: field(formData, 'detalhes'),
      bloquear: formData.get('bloquear') === 'on',
      now: new Date(),
    })
  } catch (err) {
    if (err instanceof ServiceError) return { ok: false, message: err.message }
    throw err
  }
  revalidatePath(`${BASE}/${Number(conversa)}`)
  return { ok: true, message: REPORT_MESSAGES_PT.enviada }
}

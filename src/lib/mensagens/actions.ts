'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { requireActiveSubscription } from '../assinantes/session'
import { ServiceError } from '../classisex/service'
import { MENSAGEM_MESSAGES } from './rules'
import { sendMessage, startConversation } from './service'

const BASE = '/area-do-assinante/mensagens'

export type MessageFormState = { error: string | null; values: { texto: string; apelido?: string } } | null

const field = (formData: FormData, name: string) => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/**
 * Starts (or continues) a conversation from an ad or recado (REC-02, D-02). Only origem, alvo,
 * texto and apelido are read from the form: the recipient is derived by the service (T-05-10).
 */
export async function iniciarConversa(_prev: MessageFormState, formData: FormData): Promise<MessageFormState> {
  const origemRaw = field(formData, 'origem')
  const origem = origemRaw === 'recado' ? 'recado' : 'anuncio'
  const alvo = field(formData, 'alvo')
  const check = await requireActiveSubscription(`${BASE}/nova`)
  const values = { texto: field(formData, 'texto'), apelido: field(formData, 'apelido') }
  if (check.inactive) return { error: MENSAGEM_MESSAGES.remetenteInativo, values }
  const payload = await getPayload({ config })
  let conversationId: number
  try {
    const result = await startConversation(payload, {
      senderId: check.assinante.id,
      origem,
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

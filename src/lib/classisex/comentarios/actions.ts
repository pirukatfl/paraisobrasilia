'use server'

import config from '@payload-config'
import { revalidatePath } from 'next/cache'
import { unstable_rethrow } from 'next/navigation'
import { getPayload } from 'payload'

import { requireActiveSubscription, requireAssinante } from '../../assinantes/session'
import { mensagemAmigavel } from '../../errors'
import { registrarErro } from '../../errors/server'
import { ServiceError } from '../service'
import { createComment, deleteOwnComment } from './service'
import { COMENTARIO_MESSAGES, QUEM_COMENTA } from './rules'

export type ComentarioState = {
  ok: boolean
  message: string
  /** What was typed, handed back on an error so the form keeps it. */
  values?: { apelido: string; texto: string }
  /** Changes on every success so the form can clear itself. */
  sent?: number
} | null

const field = (formData: FormData, name: string) => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

const idField = (formData: FormData, name: string) => {
  const raw = field(formData, name)
  return /^\d{1,12}$/.test(raw) ? Number(raw) : 0
}

/** Both pages that carry the conversation of an ad. */
function refresh(adId: number) {
  revalidatePath(`/classisex/anuncio/${adId}`)
  revalidatePath(`/area-do-assinante/classisex/${adId}`)
}

/**
 * Comentar / Responder. Only adId, parentId, apelido and texto are read from the form: the author
 * is the session's account and the status is always "publicado" (set by the service).
 */
export async function comentar(_prev: ComentarioState, formData: FormData): Promise<ComentarioState> {
  const adId = idField(formData, 'anuncio')
  const parentId = idField(formData, 'resposta')
  const values = { apelido: field(formData, 'apelido'), texto: field(formData, 'texto') }
  const path = `/classisex/anuncio/${adId || ''}`
  let assinanteId: number
  if (QUEM_COMENTA === 'assinante') {
    const check = await requireActiveSubscription(path)
    if (check.inactive) return { ok: false, message: COMENTARIO_MESSAGES.assinatura, values }
    assinanteId = check.assinante.id
  } else {
    assinanteId = (await requireAssinante(path)).id
  }
  const payload = await getPayload({ config })
  try {
    await createComment(payload, { assinanteId, adId, parentId: parentId || null, apelido: values.apelido, texto: values.texto, now: new Date() })
  } catch (err) {
    if (err instanceof ServiceError) return { ok: false, message: err.message, values }
    unstable_rethrow(err)
    registrarErro('comentario-criar', err)
    return { ok: false, message: `Não foi possível enviar o comentário: ${mensagemAmigavel(err)}`, values }
  }
  refresh(adId)
  return { ok: true, message: '', sent: Date.now() }
}

/** Apagar o próprio comentário: the comment id is the only identifier read from the form. */
export async function apagarComentario(_prev: ComentarioState, formData: FormData): Promise<ComentarioState> {
  const adId = idField(formData, 'anuncio')
  const id = idField(formData, 'comentario')
  const assinante = await requireAssinante(`/classisex/anuncio/${adId || ''}`)
  const payload = await getPayload({ config })
  try {
    await deleteOwnComment(payload, assinante.id, id)
  } catch (err) {
    if (err instanceof ServiceError) return { ok: false, message: err.message }
    unstable_rethrow(err)
    registrarErro('comentario-apagar', err)
    return { ok: false, message: `Não foi possível apagar o comentário: ${mensagemAmigavel(err)}` }
  }
  refresh(adId)
  return { ok: true, message: '', sent: Date.now() }
}

'use server'

import config from '@payload-config'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { requireActiveSubscription, requireAssinante } from '../assinantes/session'
import { ServiceError } from '../classisex/service'
import { createRecado, deleteRecado } from './service'

const RECADOS = '/area-do-assinante/recados'

export type RecadoFormValues = { apelido: string; texto: string }
export type RecadoFormState = { errors: Record<string, string>; values: RecadoFormValues } | null

const field = (formData: FormData, name: string) => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

const INACTIVE = 'Sua assinatura não está ativa. Renove para publicar recados.'

/**
 * Novo recado (REC-01): lands as 'pendente'. Only apelido and texto are read from the form;
 * author and status never are (T-05-04).
 */
export async function publicarRecado(_prev: RecadoFormState, formData: FormData): Promise<RecadoFormState> {
  // DAL guard first (T-05-02): only subscribers with active access post
  const check = await requireActiveSubscription(RECADOS)
  const values: RecadoFormValues = { apelido: field(formData, 'apelido'), texto: field(formData, 'texto') }
  if (check.inactive) return { errors: { form: INACTIVE }, values }
  const payload = await getPayload({ config })
  let removed = 0
  try {
    const created = await createRecado(payload, { assinanteId: check.assinante.id, input: values, now: new Date() })
    removed = created.contatosRemovidos
  } catch (err) {
    if (err instanceof ServiceError) {
      return { errors: (err.errors as Record<string, string> | undefined) ?? { form: err.message }, values }
    }
    throw err
  }
  // redirect() throws: keep it outside the try block
  redirect(`${RECADOS}?ok=enviado${removed > 0 ? `&removidos=${removed}` : ''}`)
}

/** Apagar: needs only a login, so an expired subscriber can still delete their data (LGPD). */
export async function apagarRecado(formData: FormData): Promise<void> {
  const assinante = await requireAssinante(RECADOS)
  const payload = await getPayload({ config })
  let failed = false
  try {
    await deleteRecado(payload, { assinanteId: assinante.id, id: field(formData, 'id') })
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err
    failed = true
  }
  redirect(`${RECADOS}?${failed ? 'erro=nao-encontrado' : 'ok=apagado'}`)
}

'use server'

import config from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'

import { requireActiveSubscription, requireAssinante } from '../assinantes/session'
import type { AdInput } from './rules'
import { validateAdInput } from './rules'
import { REPORT_MESSAGES } from './report-rules'
import { createAd, deleteAd, removeMedia, reportAd, ServiceError, setCover, updateAd } from './service'

const CLASSISEX = '/area-do-assinante/classisex'
const MEUS_ANUNCIOS = '/area-do-assinante/meus-anuncios'

export type AdFormValues = {
  euSou: string
  cidade: string
  texto: string
  whatsapp: string
  telegram: string
  email: string
}

export type AdFormState = { errors: Record<string, string>; values: AdFormValues } | null

const field = (formData: FormData, name: string) => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

/** What the subscriber typed. Never reads author or status from the form (T-04-04). */
function readInput(formData: FormData): { input: AdInput; values: AdFormValues } {
  const values: AdFormValues = {
    euSou: field(formData, 'euSou'),
    cidade: field(formData, 'cidade'),
    texto: field(formData, 'texto'),
    whatsapp: field(formData, 'whatsapp'),
    telegram: field(formData, 'telegram'),
    email: field(formData, 'email'),
  }
  const euSou = Number.parseInt(values.euSou, 10)
  return {
    values,
    input: {
      euSou: Number.isInteger(euSou) && euSou > 0 ? euSou : null,
      cidade: values.cidade,
      texto: values.texto,
      whatsapp: values.whatsapp,
      telegram: values.telegram,
      email: values.email,
      consent: field(formData, 'consent') === 'sim',
    },
  }
}

const INACTIVE = 'Sua assinatura não está ativa. Renove para publicar anúncios.'

async function save(
  formData: FormData,
  path: string,
  write: (assinanteId: number, input: AdInput) => Promise<unknown>,
): Promise<AdFormState> {
  // DAL guard first (T-04-05): only subscribers with active access create or edit
  const check = await requireActiveSubscription(path)
  const { input, values } = readInput(formData)
  if (check.inactive) return { errors: { form: INACTIVE }, values }
  const result = validateAdInput(input)
  if (!result.ok) return { errors: result.errors as Record<string, string>, values }
  try {
    await write(check.assinante.id, input)
  } catch (err) {
    if (err instanceof ServiceError) {
      if (err.code === 'nao-encontrado') notFound()
      return { errors: (err.errors as Record<string, string> | undefined) ?? { form: err.message }, values }
    }
    throw err
  }
  // redirect() throws: keep it outside the try block
  redirect(`${MEUS_ANUNCIOS}?ok=enviado`)
}

/** Novo anúncio (D-01, D-02, D-03): lands as 'pendente'. */
export async function criarAnuncio(_prev: AdFormState, formData: FormData): Promise<AdFormState> {
  const payload = await getPayload({ config })
  return save(formData, `${MEUS_ANUNCIOS}/novo`, (assinanteId, input) =>
    createAd(payload, { assinanteId, input, now: new Date() }),
  )
}

/** Editar anúncio: back to 'pendente' until staff approve again (D-03). */
export async function salvarAnuncio(_prev: AdFormState, formData: FormData): Promise<AdFormState> {
  const id = field(formData, 'id')
  const payload = await getPayload({ config })
  return save(formData, `${MEUS_ANUNCIOS}/${encodeURIComponent(id)}/editar`, (assinanteId, input) =>
    updateAd(payload, { assinanteId, id, input, now: new Date() }),
  )
}

/** Apagar: needs only a login, so an expired subscriber can still delete their data (LGPD). */
export async function apagarAnuncio(formData: FormData): Promise<void> {
  const assinante = await requireAssinante(MEUS_ANUNCIOS)
  const payload = await getPayload({ config })
  let failed = false
  try {
    await deleteAd(payload, { assinanteId: assinante.id, id: field(formData, 'id') })
  } catch (err) {
    if (!(err instanceof ServiceError)) throw err
    failed = true
  }
  redirect(`${MEUS_ANUNCIOS}?${failed ? 'erro=nao-encontrado' : 'ok=apagado'}`)
}

/** Remover / Usar como capa on "Fotos e vídeo" (CLAS-03, D-03): active access, owner only. */
async function changeMedia(
  formData: FormData,
  change: (assinanteId: number, mediaId: string) => Promise<{ adId: number }>,
  ok: 'removida' | 'capa',
): Promise<void> {
  const adId = field(formData, 'anuncio')
  const editar = `${MEUS_ANUNCIOS}/${encodeURIComponent(adId)}/editar`
  const check = await requireActiveSubscription(editar)
  if (check.inactive) redirect(`${editar}?midia=erro&codigo=inativo`)
  let target = ''
  try {
    const { adId: owned } = await change(check.assinante.id, field(formData, 'id'))
    target = `${MEUS_ANUNCIOS}/${owned}/editar?midia=${ok}`
  } catch (err) {
    if (err instanceof ServiceError && err.code === 'nao-encontrado') notFound()
    throw err
  }
  redirect(target)
}

export async function removerMidia(formData: FormData): Promise<void> {
  const payload = await getPayload({ config })
  await changeMedia(formData, (assinanteId, mediaId) => removeMedia(payload, { assinanteId, mediaId, now: new Date() }), 'removida')
}

export async function definirCapa(formData: FormData): Promise<void> {
  const payload = await getPayload({ config })
  await changeMedia(formData, (assinanteId, mediaId) => setCover(payload, { assinanteId, mediaId, now: new Date() }), 'capa')
}

export type ReportState = { ok: boolean; message: string } | null

/**
 * Denunciar (CLAS-05, D-08): active access, never the owner. The reporter is the session's
 * account; the ad id is the only identifier read from the form (T-04-12).
 */
export async function denunciarAnuncio(_prev: ReportState, formData: FormData): Promise<ReportState> {
  const rawId = field(formData, 'anuncio')
  const adId = /^\d{1,12}$/.test(rawId) ? Number(rawId) : 0
  const check = await requireActiveSubscription(`/area-do-assinante/classisex/${adId || ''}`)
  if (check.inactive) return { ok: false, message: INACTIVE }
  const payload = await getPayload({ config })
  let hidden = false
  try {
    ;({ hidden } = await reportAd(payload, {
      reporterId: check.assinante.id,
      adId,
      motivo: field(formData, 'motivo'),
      detalhes: field(formData, 'detalhes'),
      now: new Date(),
    }))
  } catch (err) {
    if (err instanceof ServiceError) return { ok: false, message: err.message }
    throw err
  }
  // A report of a minor takes the ad down at once, so this page no longer exists: confirm on the board
  if (hidden) redirect(`${CLASSISEX}?denuncia=enviada`)
  return { ok: true, message: REPORT_MESSAGES.enviada }
}

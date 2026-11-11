import 'server-only'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { headersDoAssinante } from '../assinantes/cookie'
import { accessStatusFor } from '../assinantes/status'

export type EspectadorVideos = {
  /** Only a subscriber with active access (no staff exception, client decision 2026-11-11). */
  podeAssistir: boolean
  /** A subscriber account is signed in: decides whether the invitation offers "Entrar". A staff-only session counts as a visitor. */
  logado: boolean
}

/**
 * Who is looking at /videos-amadores, computed per request (never cached) with the same rule as the video route
 * (a subscriber whose access is `ativa`; staff sessions get no play). The page only uses it to choose what the dialog shows; the
 * route is what actually refuses the bytes.
 */
export async function espectadorDeVideos(): Promise<EspectadorVideos> {
  const payload = await getPayload({ config })
  const swapped = headersDoAssinante(await headers(), payload.config.cookiePrefix)
  const { user } = swapped ? await payload.auth({ headers: swapped }) : { user: null }
  if (user?.collection === 'assinantes') {
    const ativa = (await accessStatusFor(payload, Number(user.id), new Date())).state === 'ativa'
    return { podeAssistir: ativa, logado: true }
  }
  return { podeAssistir: false, logado: false }
}

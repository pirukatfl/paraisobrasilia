import 'server-only'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'

import { accessStatusFor } from '../assinantes/status'

export type EspectadorVideos = {
  /** Staff or a subscriber with active access: the only ones the video route serves. */
  podeAssistir: boolean
  /** Some account (subscriber or staff) is signed in: decides whether the invitation offers "Entrar". */
  logado: boolean
}

/**
 * Who is looking at /videos-amadores, computed per request (never cached) with the same rule as the video route
 * (staff, or a subscriber whose access is `ativa`). The page only uses it to choose what the dialog shows; the
 * route is what actually refuses the bytes.
 */
export async function espectadorDeVideos(): Promise<EspectadorVideos> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (user?.collection === 'users') return { podeAssistir: true, logado: true }
  if (user?.collection === 'assinantes') {
    const ativa = (await accessStatusFor(payload, Number(user.id), new Date())).state === 'ativa'
    return { podeAssistir: ativa, logado: true }
  }
  return { podeAssistir: false, logado: false }
}

import 'server-only'

import config from '@payload-config'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Assinante } from '../../payload-types'

export type AssinantePrincipal = Assinante & { collection: 'assinantes' }

/**
 * Data access layer for the members area. Never cached across requests (subscriber-specific);
 * React `cache` only dedupes within one render.
 * Staff sessions (collection `users`) are not subscribers and get null.
 */
export const getAssinante = cache(async (): Promise<AssinantePrincipal | null> => {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  return user?.collection === 'assinantes' ? (user as AssinantePrincipal) : null
})

/**
 * Guard used by every members page and every server action (Next layouts do not re-run on
 * navigation and do not gate child segments or actions).
 */
export async function requireAssinante(path: string): Promise<AssinantePrincipal> {
  const assinante = await getAssinante()
  if (!assinante) redirect(`/entrar?next=${encodeURIComponent(path)}`)
  return assinante
}

'use server'

import config from '@payload-config'
import { logout } from '@payloadcms/next/auth'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthenticationError, getPayload, LockedAuth, ValidationError } from 'payload'
import { generatePayloadCookie } from 'payload/shared'

import { safeNext } from './redirect'

type LoginError = 'credenciais' | 'bloqueado'

const field = (formData: FormData, name: string) => {
  const value = formData.get(name)
  return typeof value === 'string' ? value : ''
}

const loginErrorUrl = (erro: LoginError, next: string) =>
  `/entrar?erro=${erro}&next=${encodeURIComponent(safeNext(next))}`

/** Sets the same httpOnly auth cookie Payload's REST login sets (30 days for subscribers). */
async function setAuthCookie(token: string): Promise<void> {
  const payload = await getPayload({ config })
  const authConfig = payload.collections.assinantes.config.auth
  const cookie = generatePayloadCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  })
  ;(await cookies()).set(cookie.name, cookie.value ?? '', {
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: Boolean(cookie.secure),
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
  })
}

/**
 * Login form action (/entrar). Works without client JS.
 * Errors never reveal whether the e-mail exists (T-03-04).
 */
export async function entrar(formData: FormData): Promise<void> {
  const email = field(formData, 'email').trim().toLowerCase()
  const password = field(formData, 'password')
  const next = field(formData, 'next')
  if (!email || !password) redirect(loginErrorUrl('credenciais', next))

  let error: LoginError | null = null
  try {
    const payload = await getPayload({ config })
    // Phase 6: when this throws AuthenticationError, try the legacy WordPress hash
    // (legacyPasswordHash) here, rehash with payload.update({ password }) and log in again.
    const result = await payload.login({ collection: 'assinantes', data: { email, password } })
    if (!result.token) throw new AuthenticationError()
    await setAuthCookie(result.token)
  } catch (err) {
    if (err instanceof LockedAuth) error = 'bloqueado'
    else if (err instanceof AuthenticationError || err instanceof ValidationError) error = 'credenciais'
    else throw err
  }
  // redirect() throws: keep it outside the try block
  if (error) redirect(loginErrorUrl(error, next))
  redirect(safeNext(next))
}

/** Logout: revokes the session stored in the account and deletes the cookie. */
export async function sair(): Promise<void> {
  await logout({ config })
  redirect('/')
}

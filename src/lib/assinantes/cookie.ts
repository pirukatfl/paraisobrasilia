import { JWTAuthentication, type AuthStrategy } from 'payload'

/**
 * The subscriber session lives in its own cookie. Payload names the auth cookie `<prefix>-token` for every
 * collection, so a subscriber login and a staff (admin) login used to overwrite each other: only one of the
 * two could be signed in per browser. Staff keep Payload's `payload-token`; subscribers use this one.
 */
export const ASSINANTE_COOKIE = 'paraiso-assinante'

const cookieNames = (payloadPrefix: string) => ({ staff: `${payloadPrefix}-token`, assinante: ASSINANTE_COOKIE })

/**
 * Headers as Payload's JWT strategy expects them for the subscriber: the subscriber cookie takes the place
 * of `<prefix>-token` (the staff token is dropped), so the stock JWT verification, session check and
 * `verify` rule apply unchanged. Returns null when there is no subscriber cookie.
 */
export function headersDoAssinante(headers: Headers, payloadPrefix: string): Headers | null {
  const names = cookieNames(payloadPrefix)
  const pairs = (headers.get('cookie') ?? '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
  const token = pairs.find((p) => p.startsWith(`${names.assinante}=`))?.slice(names.assinante.length + 1)
  if (!token) return null
  const rest = pairs.filter((p) => !p.startsWith(`${names.assinante}=`) && !p.startsWith(`${names.staff}=`))
  const swapped = new Headers(headers)
  swapped.set('cookie', [...rest, `${names.staff}=${token}`].join('; '))
  swapped.set('DisableAutologin', 'true')
  return swapped
}

/** Payload auth strategy: authenticates a subscriber from its own cookie, alongside the stock staff one. */
export const assinanteCookieStrategy: AuthStrategy = {
  name: 'assinante-cookie',
  authenticate: async (args) => {
    const swapped = headersDoAssinante(args.headers, args.payload.config.cookiePrefix)
    if (!swapped) return { user: null }
    const result = await JWTAuthentication({ ...args, headers: swapped, strategyName: 'assinante-cookie' })
    return result.user?.collection === 'assinantes' ? result : { user: null }
  },
}

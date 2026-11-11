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

const temCookieDeEquipe = (headers: Headers, payloadPrefix: string): boolean =>
  (headers.get('cookie') ?? '').split(';').some((p) => p.trim().startsWith(`${cookieNames(payloadPrefix).staff}=`))

/** Payload auth strategy: authenticates a subscriber from its own cookie, alongside the stock staff one. */
export const assinanteCookieStrategy: AuthStrategy = {
  name: 'assinante-cookie',
  authenticate: async (args) => {
    // The admin UI authenticates without a request object (initReq). A subscriber must never count as a
    // signed-in user there: the login screen would treat the browser as already logged in and refuse the
    // staff login. Only REST/GraphQL/Local API calls (which carry `req`) may use the subscriber cookie.
    if (!args.req) return { user: null }
    const swapped = headersDoAssinante(args.headers, args.payload.config.cookiePrefix)
    if (!swapped) return { user: null }
    // Payload runs custom strategies BEFORE its stock JWT one. A team member who is also signed in on the site as a
    // subscriber (both cookies) would be authenticated as the subscriber here and be refused everywhere in the admin
    // ("sem permissão" / "não autorizado"). Staff wins: if the staff token is valid, hand over to it.
    if (temCookieDeEquipe(args.headers, args.payload.config.cookiePrefix)) {
      const equipe = await JWTAuthentication({ ...args, strategyName: 'local-jwt' })
      if (equipe.user?.collection === 'users') return equipe
    }
    const result = await JWTAuthentication({ ...args, headers: swapped, strategyName: 'assinante-cookie' })
    return result.user?.collection === 'assinantes' ? result : { user: null }
  },
}

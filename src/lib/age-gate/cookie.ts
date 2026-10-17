/** First-party cookie remembering the 18+ confirmation. Holds only '1' — no identifier (T-01-17). */
export const AGE_COOKIE = 'pb_age_ok'
export const AGE_COOKIE_MAX_AGE = 2592000 // 30 days, seconds

export function isAgeCookieValid(value: string | undefined): boolean {
  return value === '1'
}

export function buildAgeCookie(opts: { secure: boolean }): string {
  const cookie = `${AGE_COOKIE}=1; Max-Age=${AGE_COOKIE_MAX_AGE}; Path=/; SameSite=Lax`
  return opts.secure ? `${cookie}; Secure` : cookie
}

/** Reads the cookie value from a `document.cookie`-style string. */
export function readAgeCookie(cookieHeader: string): string | undefined {
  for (const part of cookieHeader.split(';')) {
    const [name, ...rest] = part.trim().split('=')
    if (name === AGE_COOKIE) return rest.join('=')
  }
  return undefined
}

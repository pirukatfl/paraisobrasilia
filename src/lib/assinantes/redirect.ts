/**
 * `?next=` allowlist for the login form (T-03-08: no open redirect).
 * Only paths inside the members area (and the open page of one ad) pass; anything else falls back to its home.
 */
export const MEMBERS_HOME = '/area-do-assinante'

/** The open page of one ad: where "Entre para comentar" brings the person back to (quick classisex-comentarios). */
const PUBLIC_AD_PATH = /^\/classisex\/anuncio\/\d{1,12}$/

export function safeNext(next: unknown): string {
  if (typeof next !== 'string') return MEMBERS_HOME
  if (PUBLIC_AD_PATH.test(next)) return next
  if (next !== MEMBERS_HOME && !next.startsWith(`${MEMBERS_HOME}/`)) return MEMBERS_HOME
  if (next.includes('//') || next.includes('\\') || next.includes(':')) return MEMBERS_HOME
  return next
}

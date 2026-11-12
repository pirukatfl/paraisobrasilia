/**
 * Before the subscriber got its own cookie (`paraiso-assinante`), the site login wrote the subscriber's JWT into
 * Payload's staff cookie (`payload-token`, 30 days). A browser that kept it (typically a phone used to test the
 * site) is "signed in" to /admin as a subscriber and gets "Não autorizado, esse usuário não tem acesso ao painel"
 * instead of the login screen. Detect that cookie (collection claim only; the signature is verified by Payload
 * whenever the token is actually used) so the proxy can drop it.
 */
export function tokenLegadoDeAssinante(cookieHeader: string | null, payloadPrefix = 'payload'): boolean {
  const name = `${payloadPrefix}-token=`
  const raw = (cookieHeader ?? '')
    .split(';')
    .map((p) => p.trim())
    .find((p) => p.startsWith(name))
    ?.slice(name.length)
  const part = raw?.split('.')[1]
  if (!part) return false
  try {
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    return (JSON.parse(json) as { collection?: unknown }).collection === 'assinantes'
  } catch {
    return false
  }
}

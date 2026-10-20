'use server'

import config from '@payload-config'
import { logout } from '@payloadcms/next/auth'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { AuthenticationError, createLocalReq, getPayload, LockedAuth, UnverifiedEmail, ValidationError } from 'payload'
import { generatePayloadCookie } from 'payload/shared'

import { MIN_PASSWORD_LENGTH } from '../../collections/Assinantes'
import { writeAudit } from './audit'
import { safeNext } from './redirect'
import { requestPasswordEmail } from './reset-email'
import { requireAssinante } from './session'
import { confirmEmail, resendVerification, signUp } from './signup'

type LoginError = 'credenciais' | 'bloqueado' | 'nao-confirmado'

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
    // Payload checks the confirmation only after the password matched, so this does not reveal accounts
    else if (err instanceof UnverifiedEmail) error = 'nao-confirmado'
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

const SENHA_PATH = '/area-do-assinante/senha'

/**
 * Self password change (D-04). Re-checks the principal inside the action, verifies the current
 * password through a login (counts toward the lockout, T-03-04), then updates as the subscriber:
 * Payload keeps the current session and revokes every other one.
 */
export async function trocarSenha(formData: FormData): Promise<void> {
  const assinante = await requireAssinante(SENHA_PATH)
  const atual = field(formData, 'atual')
  const nova = field(formData, 'nova')
  const confirmacao = field(formData, 'confirmacao')
  if (nova.length < MIN_PASSWORD_LENGTH) redirect(`${SENHA_PATH}?erro=curta`)
  if (nova !== confirmacao) redirect(`${SENHA_PATH}?erro=diferente`)

  const payload = await getPayload({ config })
  let error: 'atual' | 'bloqueado' | null = null
  try {
    await payload.login({ collection: 'assinantes', data: { email: assinante.email, password: atual } })
  } catch (err) {
    if (err instanceof LockedAuth) error = 'bloqueado'
    else if (err instanceof AuthenticationError || err instanceof ValidationError) error = 'atual'
    else throw err
  }
  if (error) redirect(`${SENHA_PATH}?erro=${error}`)

  await payload.update({
    collection: 'assinantes',
    id: assinante.id,
    data: { password: nova, mustChangePassword: false },
    overrideAccess: true,
    // The authenticated subscriber (with its session id): audit actor and the session kept
    user: assinante,
  })
  redirect('/area-do-assinante?ok=senha')
}

const novaSenhaUrl = (token: string, erro: string) =>
  `/nova-senha?token=${encodeURIComponent(token)}&erro=${erro}`

/**
 * /nova-senha form: consumes the staff-generated link (single use, 48 h), logs the subscriber
 * in and records the change. Payload's resetPassword writes through the database adapter (no
 * hooks), so the audit row is written here (Pitfall 6).
 */
export async function definirNovaSenha(formData: FormData): Promise<void> {
  const token = field(formData, 'token')
  const nova = field(formData, 'nova')
  const confirmacao = field(formData, 'confirmacao')
  if (!token) redirect('/nova-senha?erro=expirado')
  if (nova.length < MIN_PASSWORD_LENGTH) redirect(novaSenhaUrl(token, 'curta'))
  if (nova !== confirmacao) redirect(novaSenhaUrl(token, 'diferente'))

  const payload = await getPayload({ config })
  let result: Awaited<ReturnType<typeof payload.resetPassword>> | null = null
  try {
    result = await payload.resetPassword({
      collection: 'assinantes',
      data: { token, password: nova },
      overrideAccess: true,
    })
  } catch {
    result = null
  }
  if (!result?.token || !result.user) redirect('/nova-senha?erro=expirado')

  await setAuthCookie(result.token)
  const user = result.user as unknown as { id: number; name: string; email: string }
  await payload.update({
    collection: 'assinantes',
    id: user.id,
    data: { mustChangePassword: false },
    overrideAccess: true,
    context: { skipAudit: true },
  })
  const req = await createLocalReq({ user: { ...user, collection: 'assinantes' } as never }, payload)
  await writeAudit(req, {
    action: 'senha-trocada-pelo-assinante',
    assinante: user,
    summary: 'Senha criada pelo link enviado pela equipe',
  })
  redirect('/area-do-assinante?ok=senha')
}

/**
 * "Esqueci minha senha" form (/esqueci-senha). The visible answer is the same whether or not the
 * e-mail has an account (no enumeration); only the rate limit and "e-mail off" differ.
 */
export async function pedirNovaSenha(formData: FormData): Promise<void> {
  const email = field(formData, 'email')
  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'desconhecido').trim()
  const payload = await getPayload({ config })
  const result = await requestPasswordEmail(payload, { email, ip })
  redirect(result === 'enviado' ? '/esqueci-senha?enviado=1' : `/esqueci-senha?erro=${result}`)
}

const clientIp = async () => {
  const h = await headers()
  return (h.get('x-forwarded-for')?.split(',')[0] ?? h.get('x-real-ip') ?? 'desconhecido').trim()
}

export type CadastroState = {
  errors: Record<string, string>
  values: { email: string; apelido: string; maior18: boolean; termos: boolean }
} | null

/**
 * /cadastro form (G-01): creates a free account. Answers the same ('enviado') for new, unconfirmed
 * and confirmed e-mails; field errors come back with the typed values (never the password).
 * With e-mail off nothing is created and the page shows the closed message.
 */
export async function cadastrar(_prev: CadastroState, formData: FormData): Promise<CadastroState> {
  const values = {
    email: field(formData, 'email'),
    apelido: field(formData, 'apelido'),
    maior18: field(formData, 'maior18') === 'sim',
    termos: field(formData, 'termos') === 'sim',
  }
  const payload = await getPayload({ config })
  const result = await signUp(
    payload,
    { ...values, password: field(formData, 'password'), website: field(formData, 'website') },
    { ip: await clientIp() },
  )
  if (typeof result === 'object') return { errors: result.errors, values }
  if (result === 'fechado') redirect('/cadastro')
  if (result === 'limite') redirect('/cadastro?erro=limite')
  redirect('/cadastro?enviado=1')
}

/** "Reenviar link" (from /cadastro, /cadastro/confirmar and /entrar): neutral answer. */
export async function reenviarConfirmacao(formData: FormData): Promise<void> {
  const payload = await getPayload({ config })
  const result = await resendVerification(payload, { email: field(formData, 'email') }, { ip: await clientIp() })
  if (result === 'fechado') redirect('/cadastro')
  redirect(result === 'limite' ? '/cadastro?erro=limite' : '/cadastro?enviado=1')
}

/**
 * Button on /cadastro/confirmar (a POST, so link scanners that only GET the e-mail link do not use
 * up the token). Single use.
 */
export async function confirmarEmail(formData: FormData): Promise<void> {
  const payload = await getPayload({ config })
  const result = await confirmEmail(payload, field(formData, 'token'))
  redirect(result === 'ok' ? '/entrar?confirmado=1' : '/cadastro/confirmar?erro=invalido')
}

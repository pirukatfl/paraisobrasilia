/**
 * Public sign-up (conta gratuita G-01): create an account, send/resend the confirmation link,
 * confirm the e-mail. No 'server-only' import: used by server actions and int tests.
 *
 * Neutral answers (T-CG-04): a new e-mail, an unconfirmed one and an already confirmed one all get
 * the same 'enviado' answer; the work and the e-mail run in the background so response time does
 * not tell them apart. Abuse brakes (T-CG-06): in-memory attempt limits per IP and per e-mail, a
 * honeypot field, and lazy deletion of unconfirmed sign-ups after 7 days.
 */
import crypto from 'node:crypto'

import type { Payload } from 'payload'

import { MIN_PASSWORD_LENGTH, PASSWORD_TOO_SHORT } from '../../collections/Assinantes'
import { emailEnabled } from '../email/config'
import { allowAttempt } from '../email/rate-limit'
import { notifyNewSignup } from '../email/new-signup-notice'
import { recadoApelidoError } from '../recados/rules'
import { buildAlreadyHasAccountEmail, buildVerifyEmail, verifyUrl, VERIFY_DAYS } from '../email/verify-account'

export const SIGNUP_MAX_PER_IP = 5
export const SIGNUP_MAX_PER_EMAIL = 3
export const CLEANUP_BATCH = 50
const DAY_MS = 86_400_000

export const SIGNUP_MESSAGES = {
  email: 'Informe um e-mail válido.',
  senha: PASSWORD_TOO_SHORT,
  maior18: 'Confirme que você tem 18 anos ou mais.',
  termos: 'Aceite os Termos de Uso e a Política de Privacidade para criar a conta.',
} as const

export type SignUpInput = {
  email: string
  password: string
  apelido: string
  maior18: boolean
  termos: boolean
  /** Honeypot: real people leave it empty */
  website?: string
}

export type SignUpResult = 'enviado' | 'limite' | 'fechado' | { errors: Record<string, string> }
export type SimpleResult = 'enviado' | 'limite' | 'fechado'

type Options = { ip: string; now?: number; background?: boolean }

const siteBase = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const normaliseEmail = (value: string) => value.trim().toLowerCase()

type AccountDoc = {
  id: number
  email: string
  name: string
  origem?: string | null
  _verified?: boolean | null
  _verificationToken?: string | null
  createdAt: string
}

const newToken = () => crypto.randomBytes(20).toString('hex')

async function findByEmail(payload: Payload, email: string): Promise<AccountDoc | null> {
  const { docs } = await payload.find({
    collection: 'assinantes',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  return (docs[0] as unknown as AccountDoc | undefined) ?? null
}

/** Unconfirmed self sign-ups older than 7 days (I-5): at most CLEANUP_BATCH per call. */
export async function cleanupUnconfirmed(payload: Payload, now: Date): Promise<number> {
  const { docs } = await payload.find({
    collection: 'assinantes',
    where: {
      and: [
        { origem: { equals: 'cadastro' } },
        { _verified: { equals: false } },
        { createdAt: { less_than: new Date(now.getTime() - VERIFY_DAYS * DAY_MS).toISOString() } },
      ],
    },
    limit: CLEANUP_BATCH,
    pagination: false,
    depth: 0,
    overrideAccess: true,
    select: { createdAt: true },
  })
  for (const doc of docs) {
    await payload.delete({ collection: 'assinantes', id: doc.id, overrideAccess: true, context: { skipAudit: true } })
  }
  return docs.length
}

async function sendVerification(payload: Payload, account: { email: string; name: string }, token: string) {
  const mail = buildVerifyEmail({ name: account.name, url: verifyUrl(siteBase(), token) })
  await payload.sendEmail({ to: account.email, subject: mail.subject, text: mail.text, html: mail.html })
}

async function sendAlreadyHasAccount(payload: Payload, account: { email: string; name: string }) {
  const mail = buildAlreadyHasAccountEmail({
    name: account.name,
    loginUrl: `${siteBase()}/entrar`,
    resetUrl: `${siteBase()}/esqueci-senha`,
  })
  await payload.sendEmail({ to: account.email, subject: mail.subject, text: mail.text, html: mail.html })
}

function validate(input: SignUpInput): { ok: true; email: string; apelido: string } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const email = normaliseEmail(input.email)
  if (!EMAIL_RE.test(email) || email.length > 254) errors.email = SIGNUP_MESSAGES.email
  if (typeof input.password !== 'string' || input.password.length < MIN_PASSWORD_LENGTH) errors.senha = SIGNUP_MESSAGES.senha
  const apelido = input.apelido.replace(/\s+/g, ' ').trim()
  const aErr = recadoApelidoError(apelido)
  if (aErr) errors.apelido = aErr
  if (!input.maior18) errors.maior18 = SIGNUP_MESSAGES.maior18
  if (!input.termos) errors.termos = SIGNUP_MESSAGES.termos
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, email, apelido }
}

function inBackground(payload: Payload, background: boolean | undefined, work: () => Promise<unknown>): Promise<unknown> | undefined {
  const run = work().catch((err: unknown) => {
    // Never log the address, the token or SMTP settings
    payload.logger.error(`Falha no cadastro pelo site: ${err instanceof Error ? err.name : 'erro'}`)
  })
  if (background === false) return run
  void run
  return undefined
}

/**
 * Creates an account (or re-arms an unconfirmed one, or tells a confirmed one by e-mail).
 * 'fechado' when e-mail is not configured: nothing is created.
 */
export async function signUp(payload: Payload, input: SignUpInput, options: Options): Promise<SignUpResult> {
  if (!emailEnabled()) return 'fechado'
  if (input.website && input.website.trim() !== '') return 'enviado' // honeypot: neutral, nothing created
  const checked = validate(input)
  if (!checked.ok) return { errors: checked.errors }
  const now = options.now ?? Date.now()
  const okIp = allowAttempt(`cadastro-ip:${options.ip}`, now, SIGNUP_MAX_PER_IP)
  const okEmail = allowAttempt(`cadastro-email:${checked.email}`, now, SIGNUP_MAX_PER_EMAIL)
  if (!okIp || !okEmail) return 'limite'

  const { email, apelido } = checked
  await inBackground(payload, options.background, async () => {
    await cleanupUnconfirmed(payload, new Date(now))
    const existing = await findByEmail(payload, email)
    if (existing && !(existing._verified === false && existing.origem === 'cadastro')) {
      // Confirmed (or staff-made) account: nothing changes
      await sendAlreadyHasAccount(payload, existing)
      return
    }
    if (existing) {
      // I-5: the sign-up of an unconfirmed e-mail replaces password, apelido, consent dates and token
      const token = newToken()
      const stamp = new Date().toISOString()
      await payload.update({
        collection: 'assinantes',
        id: existing.id,
        data: {
          password: input.password,
          name: apelido,
          apelido,
          declaracao18Em: stamp,
          termosAceitosEm: stamp,
          _verificationToken: token,
        } as never,
        overrideAccess: true,
        context: { skipAudit: true },
      })
      await sendVerification(payload, { email, name: apelido }, token)
      return
    }
    const created = (await payload.create({
      collection: 'assinantes',
      data: { email, password: input.password, name: apelido, apelido } as never,
      overrideAccess: true,
      context: { selfSignup: true },
    })) as unknown as { id: number }
    try {
      const fresh = await payload.findByID({
        collection: 'assinantes',
        id: created.id,
        depth: 0,
        overrideAccess: true,
        showHiddenFields: true,
      })
      const token = (fresh as unknown as AccountDoc)._verificationToken
      if (token) await sendVerification(payload, { email, name: apelido }, token)
    } finally {
      // Staff notice: never throws (own try/catch), so it cannot fail or delay the sign-up answer
      await notifyNewSignup(payload, { id: created.id, email, name: apelido, apelido }, siteBase())
    }
  })
  return 'enviado'
}

/** "Reenviar link": same limits and neutral answer; only unconfirmed self sign-ups get a new link. */
export async function resendVerification(payload: Payload, input: { email: string }, options: Options): Promise<SimpleResult> {
  if (!emailEnabled()) return 'fechado'
  const email = normaliseEmail(input.email)
  const now = options.now ?? Date.now()
  const okIp = allowAttempt(`verificar-ip:${options.ip}`, now, SIGNUP_MAX_PER_IP)
  const okEmail = allowAttempt(`verificar-email:${email}`, now, SIGNUP_MAX_PER_EMAIL)
  if (!okIp || !okEmail) return 'limite'
  if (!EMAIL_RE.test(email)) return 'enviado'

  await inBackground(payload, options.background, async () => {
    const account = await findByEmail(payload, email)
    if (!account || account._verified !== false || account.origem !== 'cadastro') return
    if (new Date(account.createdAt).getTime() < Date.now() - VERIFY_DAYS * DAY_MS) return // expired: sign up again
    const token = newToken()
    await payload.update({
      collection: 'assinantes',
      id: account.id,
      data: { _verificationToken: token } as never,
      overrideAccess: true,
      context: { skipAudit: true },
    })
    await sendVerification(payload, account, token)
  })
  return 'enviado'
}

/** Confirms the e-mail behind a token (single use: Payload clears it). */
export async function confirmEmail(payload: Payload, token: string, now: number = Date.now()): Promise<'ok' | 'invalido'> {
  if (!/^[a-f0-9]{40}$/.test(token)) return 'invalido'
  const { docs } = await payload.find({
    collection: 'assinantes',
    where: { _verificationToken: { equals: token } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const account = docs[0] as unknown as AccountDoc | undefined
  if (!account) return 'invalido'
  if (account.origem === 'cadastro' && new Date(account.createdAt).getTime() < now - VERIFY_DAYS * DAY_MS) return 'invalido'
  try {
    await payload.verifyEmail({ collection: 'assinantes', token })
    return 'ok'
  } catch {
    return 'invalido'
  }
}

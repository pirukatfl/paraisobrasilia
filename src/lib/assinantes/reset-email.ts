import type { Payload } from 'payload'

import { emailEnabled } from '../email/config'
import { allowAttempt } from '../email/rate-limit'
import { buildResetEmail, resetUrl } from '../email/password-reset'

export const RESET_HOURS = 48
export const RESET_MAX_PER_HOUR = 5

const siteBase = () => (process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000').replace(/\/$/, '')

export type ResetRequestResult = 'enviado' | 'limite' | 'desligado'

/**
 * "Esqueci minha senha" (ASS-02). Always answers the same to the caller whether or not the
 * account exists: the only differences are `limite` (counted per IP and per e-mail regardless of
 * existence) and `desligado` (no e-mail configured; nothing is attempted). The lookup and the
 * send run in the background so response time does not reveal the account either.
 */
export async function requestPasswordEmail(
  payload: Payload,
  input: { email: string; ip: string; now?: number },
): Promise<ResetRequestResult> {
  if (!emailEnabled()) return 'desligado'
  const email = input.email.trim().toLowerCase()
  const now = input.now ?? Date.now()
  const okIp = allowAttempt(`reset-ip:${input.ip}`, now, RESET_MAX_PER_HOUR)
  const okEmail = allowAttempt(`reset-email:${email}`, now, RESET_MAX_PER_HOUR)
  if (!okIp || !okEmail) return 'limite'
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) return 'enviado'

  void deliver(payload, email).catch((err: unknown) => {
    // Never log the address, the token or SMTP settings
    payload.logger.error(`Falha ao enviar e-mail de nova senha: ${err instanceof Error ? err.name : 'erro'}`)
  })
  return 'enviado'
}

/** Mints the Payload token (replacing any older one) and mails the link; no-op for unknown e-mails. */
export async function deliver(payload: Payload, email: string): Promise<boolean> {
  const token = await payload.forgotPassword({
    collection: 'assinantes',
    data: { email },
    disableEmail: true,
    context: { emailedPasswordLink: true },
  })
  if (!token) return false
  const found = await payload.find({
    collection: 'assinantes',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const account = found.docs[0]
  if (!account) return false
  const message = buildResetEmail({
    name: account.name,
    url: resetUrl(siteBase(), token),
    hours: RESET_HOURS,
  })
  await payload.sendEmail({ to: account.email, subject: message.subject, text: message.text, html: message.html })
  return true
}

/**
 * Lazy verification of old WordPress passwords (M-03), used by the /entrar server action.
 * Legacy-first and only for accounts that still hold a `legacyPasswordHash`; everything else,
 * including every failure, goes through Payload's own login so lockout, sessions and neutral
 * errors stay exactly as for any account. Payload Local API only: no Next imports.
 */
// T-06-16: never logs the password, the hash or the reset token
import { AuthenticationError, createLocalReq, LockedAuth, UnverifiedEmail, ValidationError, type Payload } from 'payload'

import { MIN_PASSWORD_LENGTH } from '../../collections/Assinantes'
import { writeAudit } from './audit'
import { verifyWpPassword } from './wp-password'

export type LegacyOutcome =
  | { kind: 'nao-legado' }
  | { kind: 'bloqueada' }
  | { kind: 'nao-confere' }
  | { kind: 'migrada' }
  | { kind: 'senha-curta'; token: string }

export type LoginOutcome =
  | { ok: true; token: string }
  | { ok: false; error: 'credenciais' | 'bloqueado' | 'nao-confirmado' }
  | { ok: false; novaSenhaToken: string }

type Input = { email: string; password: string; now?: Date }

export const MIGRATED_SUMMARY =
  'Senha do site antigo confirmada no primeiro acesso e convertida para o formato do site novo'

export async function tryLegacyPassword(payload: Payload, input: Input): Promise<LegacyOutcome> {
  const email = input.email.trim().toLowerCase()
  const { docs } = await payload.find({
    collection: 'assinantes',
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
    showHiddenFields: true,
  })
  const doc = docs[0] as unknown as
    | { id: number; email: string; name: string; legacyPasswordHash?: string | null; lockUntil?: string | null }
    | undefined
  if (!doc?.legacyPasswordHash) return { kind: 'nao-legado' }

  // A locked account is not checked against the old hash (T-06-18)
  const now = (input.now ?? new Date()).getTime()
  if (doc.lockUntil && new Date(doc.lockUntil).getTime() > now) return { kind: 'bloqueada' }

  if (!(await verifyWpPassword(input.password, doc.legacyPasswordHash))) return { kind: 'nao-confere' }

  if (input.password.length < MIN_PASSWORD_LENGTH) {
    // The old password is right but too short for the new site: single-use link to create a new one.
    // The hash stays until the new password is saved (T-06-17: the flag exists only in server code).
    const token = await payload.forgotPassword({
      collection: 'assinantes',
      data: { email },
      disableEmail: true,
      context: { legacyPasswordUpgrade: true },
    })
    return { kind: 'senha-curta', token }
  }

  // guardOperations erases the old hash on any password write (T-06-12)
  await payload.update({
    collection: 'assinantes',
    id: doc.id,
    data: { password: input.password },
    overrideAccess: true,
    context: { skipAudit: true, legacyRehash: true },
  })
  const req = await createLocalReq({}, payload)
  await writeAudit(req, { action: 'senha-migrada', assinante: doc, summary: MIGRATED_SUMMARY })
  return { kind: 'migrada' }
}

export async function loginWithLegacy(payload: Payload, input: Input): Promise<LoginOutcome> {
  const email = input.email.trim().toLowerCase()
  const legacy = await tryLegacyPassword(payload, { ...input, email })
  if (legacy.kind === 'bloqueada') return { ok: false, error: 'bloqueado' }
  if (legacy.kind === 'senha-curta') return { ok: false, novaSenhaToken: legacy.token }
  try {
    const result = await payload.login({ collection: 'assinantes', data: { email, password: input.password } })
    if (!result.token) return { ok: false, error: 'credenciais' }
    return { ok: true, token: result.token }
  } catch (err) {
    if (err instanceof LockedAuth) return { ok: false, error: 'bloqueado' }
    // Payload checks the confirmation only after the password matched, so this does not reveal accounts
    if (err instanceof UnverifiedEmail) return { ok: false, error: 'nao-confirmado' }
    if (err instanceof AuthenticationError || err instanceof ValidationError) return { ok: false, error: 'credenciais' }
    throw err
  }
}

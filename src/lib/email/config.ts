import { mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import type { NodemailerAdapterArgs } from '@payloadcms/email-nodemailer'
import { nodemailerAdapter } from '@payloadcms/email-nodemailer'
import type { EmailAdapter } from 'payload'

type Env = Record<string, string | undefined>

export const DEFAULT_SMTP_HOST = 'smtp.hostinger.com'
export const DEFAULT_SMTP_PORT = 465
export const DEFAULT_FROM_ADDRESS = 'suporte@swingbrasilia.com.br'
export const DEFAULT_FROM_NAME = 'Paraíso Brasília'

const clean = (value: string | undefined) => (value ?? '').trim()

/** True when real SMTP credentials are present (dev, CI and build have none: no e-mail is sent). */
export function smtpConfigured(env: Env = process.env): boolean {
  return clean(env.SMTP_USER) !== '' && clean(env.SMTP_PASS) !== ''
}

/**
 * Test-only sink: when EMAIL_CAPTURE_DIR is set, messages are written there as JSON instead of
 * being sent. Only set by the Playwright config; never set on a server.
 */
export function captureDir(env: Env = process.env): string | null {
  return clean(env.EMAIL_CAPTURE_DIR) || null
}

/** Whether the site can send e-mail (gates the public "Esqueci minha senha"). */
export function emailEnabled(env: Env = process.env): boolean {
  return smtpConfigured(env) || captureDir(env) !== null
}

export function fromIdentity(env: Env = process.env) {
  return {
    address: clean(env.EMAIL_FROM_ADDRESS) || DEFAULT_FROM_ADDRESS,
    name: clean(env.EMAIL_FROM_NAME) || DEFAULT_FROM_NAME,
  }
}

/** Nodemailer SMTP options from env. Port 465 is implicit TLS; others upgrade with STARTTLS. */
export function smtpOptions(env: Env = process.env): NonNullable<NodemailerAdapterArgs['transportOptions']> {
  const port = Number.parseInt(clean(env.SMTP_PORT), 10) || DEFAULT_SMTP_PORT
  return {
    host: clean(env.SMTP_HOST) || DEFAULT_SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: clean(env.SMTP_USER), pass: env.SMTP_PASS ?? '' },
  }
}

/** Test transport: one JSON file per message, named by arrival order. */
function captureTransport(dir: string): NonNullable<NodemailerAdapterArgs['transport']> {
  let seq = 0
  return {
    sendMail: async (mail: Record<string, unknown>) => {
      mkdirSync(dir, { recursive: true })
      const id = `${Date.now()}-${String(seq++).padStart(4, '0')}`
      writeFileSync(path.join(dir, `${id}.json`), JSON.stringify(mail, null, 2))
      return { messageId: id }
    },
  } as unknown as NonNullable<NodemailerAdapterArgs['transport']>
}

/**
 * Payload e-mail adapter, or undefined (Payload then logs messages to the console instead of
 * sending) when SMTP is not configured. Credentials are never logged.
 */
export function buildEmailAdapter(env: Env = process.env): Promise<EmailAdapter> | undefined {
  const { address, name } = fromIdentity(env)
  const dir = captureDir(env)
  if (dir && !smtpConfigured(env)) {
    return nodemailerAdapter({
      defaultFromAddress: address,
      defaultFromName: name,
      skipVerify: true,
      transport: captureTransport(dir),
    })
  }
  if (!smtpConfigured(env)) return undefined
  return nodemailerAdapter({
    defaultFromAddress: address,
    defaultFromName: name,
    skipVerify: true,
    transportOptions: smtpOptions(env),
  })
}

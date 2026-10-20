import { mkdtempSync, readdirSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  buildEmailAdapter,
  emailEnabled,
  fromIdentity,
  smtpConfigured,
  smtpOptions,
} from '../../src/lib/email/config'
import { allowAttempt } from '../../src/lib/email/rate-limit'
import { buildResetEmail, resetUrl } from '../../src/lib/email/password-reset'

describe('email adapter factory (ASS-02)', () => {
  it('is off without SMTP_USER/SMTP_PASS (dev, CI, build)', () => {
    expect(smtpConfigured({})).toBe(false)
    expect(smtpConfigured({ SMTP_USER: 'a@b.c' })).toBe(false)
    expect(smtpConfigured({ SMTP_PASS: 'x' })).toBe(false)
    expect(emailEnabled({})).toBe(false)
    expect(buildEmailAdapter({})).toBeUndefined()
    expect(buildEmailAdapter({ SMTP_USER: '  ', SMTP_PASS: '' })).toBeUndefined()
  })

  it('is on with credentials, with Hostinger defaults', async () => {
    const env = { SMTP_USER: 'suporte@swingbrasilia.com.br', SMTP_PASS: 'segredo' }
    expect(emailEnabled(env)).toBe(true)
    expect(smtpOptions(env)).toEqual({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: { user: 'suporte@swingbrasilia.com.br', pass: 'segredo' },
    })
    expect(fromIdentity(env)).toEqual({ address: 'suporte@swingbrasilia.com.br', name: 'Paraíso Brasília' })
    const adapter = await buildEmailAdapter(env)
    expect(adapter).toBeDefined()
    const instance = adapter!({ payload: {} as never })
    expect(instance.defaultFromAddress).toBe('suporte@swingbrasilia.com.br')
    expect(instance.defaultFromName).toBe('Paraíso Brasília')
  })

  it('reads host, port and sender from env; only 465 is implicit TLS', () => {
    const env = {
      SMTP_USER: 'u',
      SMTP_PASS: 'p',
      SMTP_HOST: 'smtp.exemplo.com',
      SMTP_PORT: '587',
      EMAIL_FROM_ADDRESS: 'oi@exemplo.com',
      EMAIL_FROM_NAME: 'Casa',
    }
    expect(smtpOptions(env)).toMatchObject({ host: 'smtp.exemplo.com', port: 587, secure: false })
    expect(fromIdentity(env)).toEqual({ address: 'oi@exemplo.com', name: 'Casa' })
  })

  it('capture mode (tests only) writes messages to disk instead of sending', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'mail-'))
    const adapter = await buildEmailAdapter({ EMAIL_CAPTURE_DIR: dir })
    expect(adapter).toBeDefined()
    expect(emailEnabled({ EMAIL_CAPTURE_DIR: dir })).toBe(true)
    await adapter!({ payload: {} as never }).sendEmail({ to: 'a@b.c', subject: 'Oi', text: 'corpo' })
    const files = readdirSync(dir)
    expect(files).toHaveLength(1)
    expect(JSON.parse(readFileSync(path.join(dir, files[0]!), 'utf8'))).toMatchObject({ to: 'a@b.c', subject: 'Oi' })
  })
})

describe('reset e-mail and rate limit', () => {
  it('links to /nova-senha with the token, in plain text and HTML', () => {
    const url = resetUrl('https://novo.swingbrasilia.com.br/', 'abc123')
    expect(url).toBe('https://novo.swingbrasilia.com.br/nova-senha?token=abc123')
    const mail = buildResetEmail({ name: 'Ana <b>', url, hours: 48 })
    expect(mail.text).toContain(url)
    expect(mail.text).toContain('Olá, Ana <b>!')
    expect(mail.html).toContain(`href="${url}"`)
    expect(mail.html).toContain('Ana &lt;b&gt;')
    expect(mail.html).not.toContain('<b>')
  })

  it('allows 5 attempts per key per hour', () => {
    const t = Date.UTC(2026, 9, 20, 12)
    for (let i = 0; i < 5; i++) expect(allowAttempt('k-unit', t + i)).toBe(true)
    expect(allowAttempt('k-unit', t + 10)).toBe(false)
    expect(allowAttempt('other-unit', t + 10)).toBe(true)
    expect(allowAttempt('k-unit', t + 3_600_001)).toBe(true)
  })
})

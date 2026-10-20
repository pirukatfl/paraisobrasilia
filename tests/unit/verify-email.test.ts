import { describe, expect, it } from 'vitest'

import {
  ALREADY_SUBJECT,
  buildAlreadyHasAccountEmail,
  buildVerifyEmail,
  VERIFY_SUBJECT,
  verifyUrl,
} from '../../src/lib/email/verify-account'

describe('verification e-mail (G-01)', () => {
  it('links to /cadastro/confirmar with the encoded token, never to /admin', () => {
    const url = verifyUrl('https://novo.swingbrasilia.com.br/', 'abc123+/=')
    expect(url).toBe('https://novo.swingbrasilia.com.br/cadastro/confirmar?token=abc123%2B%2F%3D')
    const mail = buildVerifyEmail({ name: 'Ana', url })
    expect(mail.text).toContain(url)
    expect(mail.html).toContain('cadastro/confirmar?token=')
    expect(mail.text + mail.html).not.toContain('/admin')
  })

  it('keeps the token out of the subject and escapes the apelido', () => {
    const mail = buildVerifyEmail({ name: '<script>alert(1)</script> "x"', url: verifyUrl('http://x.test', 'tok') })
    expect(mail.subject).toBe(VERIFY_SUBJECT)
    expect(mail.subject).not.toContain('tok')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;script&gt;')
    expect(mail.html).toContain('&quot;x&quot;')
  })

  it('the "already has an account" e-mail links to entrar and esqueci-senha and carries no token', () => {
    const mail = buildAlreadyHasAccountEmail({ name: 'Bia', loginUrl: 'http://x.test/entrar', resetUrl: 'http://x.test/esqueci-senha' })
    expect(mail.subject).toBe(ALREADY_SUBJECT)
    expect(mail.text).toContain('http://x.test/entrar')
    expect(mail.text).toContain('http://x.test/esqueci-senha')
    expect(mail.text + mail.html).not.toContain('token')
  })
})

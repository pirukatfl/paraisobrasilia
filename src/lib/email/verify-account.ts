/**
 * Sign-up e-mails (conta gratuita G-01): confirmation link and "you already have an account".
 * Pure module (no Payload/Next imports): also used by the Payload collection config. The link
 * always points at /cadastro/confirmar (a button there confirms by POST), never at /admin.
 */
const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const VERIFY_SUBJECT = 'Confirme seu e-mail - Paraíso Brasília'
export const ALREADY_SUBJECT = 'Você já tem uma conta - Paraíso Brasília'
export const VERIFY_DAYS = 7

const base = (siteBase: string) => siteBase.replace(/\/$/, '')

export function verifyUrl(siteBase: string, token: string): string {
  return `${base(siteBase)}/cadastro/confirmar?token=${encodeURIComponent(token)}`
}

const shell = (parts: string[]) =>
  ['<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111">', ...parts, '</div>'].join('')

const button = (url: string, label: string) =>
  `<p><a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">${label}</a></p>`

/** Confirmation e-mail (plain text and HTML). The subject never carries the token. */
export function buildVerifyEmail(input: { name: string; url: string }) {
  const name = input.name.trim() || 'por aí'
  const text = [
    `Olá, ${name}!`,
    '',
    'Falta só confirmar o seu e-mail para ativar a conta gratuita no Paraíso Brasília.',
    `Abra o link abaixo (vale por ${VERIFY_DAYS} dias):`,
    '',
    input.url,
    '',
    'Se não foi você, ignore este e-mail: nenhuma conta será ativada.',
    '',
    'Paraíso Brasília',
  ].join('\n')
  const url = escapeHtml(input.url)
  const html = shell([
    `<p>Olá, ${escapeHtml(name)}!</p>`,
    '<p>Falta só confirmar o seu e-mail para ativar a conta gratuita no Paraíso Brasília.</p>',
    button(input.url, 'Confirmar meu e-mail'),
    `<p>Ou copie este endereço no navegador:<br><a href="${url}">${url}</a></p>`,
    `<p>O link vale por ${VERIFY_DAYS} dias.</p>`,
    '<p>Se não foi você, ignore este e-mail: nenhuma conta será ativada.</p>',
    '<p>Paraíso Brasília</p>',
  ])
  return { subject: VERIFY_SUBJECT, text, html }
}

/** Sent instead of the confirmation when the e-mail already has a confirmed account (nothing changes). */
export function buildAlreadyHasAccountEmail(input: { name: string; loginUrl: string; resetUrl: string }) {
  const name = input.name.trim() || 'por aí'
  const text = [
    `Olá, ${name}!`,
    '',
    'Alguém pediu para criar uma conta com este e-mail, mas você já tem uma conta no Paraíso Brasília.',
    '',
    `Para entrar: ${input.loginUrl}`,
    `Esqueceu a senha? ${input.resetUrl}`,
    '',
    'Se não foi você, ignore este e-mail: nada foi alterado na sua conta.',
    '',
    'Paraíso Brasília',
  ].join('\n')
  const html = shell([
    `<p>Olá, ${escapeHtml(name)}!</p>`,
    '<p>Alguém pediu para criar uma conta com este e-mail, mas você já tem uma conta no Paraíso Brasília.</p>',
    button(input.loginUrl, 'Entrar'),
    `<p>Esqueceu a senha? <a href="${escapeHtml(input.resetUrl)}">Criar uma nova senha</a></p>`,
    '<p>Se não foi você, ignore este e-mail: nada foi alterado na sua conta.</p>',
    '<p>Paraíso Brasília</p>',
  ])
  return { subject: ALREADY_SUBJECT, text, html }
}

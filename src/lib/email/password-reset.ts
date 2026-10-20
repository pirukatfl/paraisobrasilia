const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export const RESET_SUBJECT = 'Crie uma nova senha - Paraíso Brasília'

export function resetUrl(siteBase: string, token: string): string {
  return `${siteBase.replace(/\/$/, '')}/nova-senha?token=${encodeURIComponent(token)}`
}

/** Portuguese reset e-mail (plain text and HTML) linking to /nova-senha. */
export function buildResetEmail(input: { name: string; url: string; hours: number }) {
  const name = input.name.trim() || 'assinante'
  const text = [
    `Olá, ${name}!`,
    '',
    'Recebemos um pedido para criar uma nova senha na área do assinante do Paraíso Brasília.',
    `Use o link abaixo (vale por ${input.hours} horas e só pode ser usado uma vez):`,
    '',
    input.url,
    '',
    'Se você não pediu, ignore este e-mail: sua senha continua a mesma.',
    'Se pedir outro link, o anterior deixa de funcionar.',
    '',
    'Paraíso Brasília',
  ].join('\n')
  const url = escapeHtml(input.url)
  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111">',
    `<p>Olá, ${escapeHtml(name)}!</p>`,
    '<p>Recebemos um pedido para criar uma nova senha na área do assinante do Paraíso Brasília.</p>',
    `<p><a href="${url}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:6px">Criar nova senha</a></p>`,
    `<p>Ou copie este endereço no navegador:<br><a href="${url}">${url}</a></p>`,
    `<p>O link vale por ${input.hours} horas e só pode ser usado uma vez. Se pedir outro link, o anterior deixa de funcionar.</p>`,
    '<p>Se você não pediu, ignore este e-mail: sua senha continua a mesma.</p>',
    '<p>Paraíso Brasília</p>',
    '</div>',
  ].join('')
  return { subject: RESET_SUBJECT, text, html }
}

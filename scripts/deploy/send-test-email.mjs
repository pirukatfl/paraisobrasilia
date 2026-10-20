// Sends one test e-mail with the same SMTP settings the site uses (SMTP_* in .env.staging).
// Run on the VPS (the container already has the variables; nothing is printed except the result):
//   cd /opt/paraiso-site && docker compose --env-file .env.staging run --rm migrate \
//     node scripts/deploy/send-test-email.mjs seu-email@exemplo.com
// The password is never printed.
import { createRequire } from 'node:module'

const to = process.argv[2]
if (!to || !/^[^\s@]+@[^\s@]+$/.test(to)) {
  console.error('Uso: node scripts/deploy/send-test-email.mjs destinatario@exemplo.com')
  process.exit(2)
}
const user = (process.env.SMTP_USER ?? '').trim()
const pass = process.env.SMTP_PASS ?? ''
if (!user || !pass) {
  console.error('SMTP_USER e SMTP_PASS não estão preenchidos em .env.staging. Veja docs/deploy/STAGING.md (seção E-mail).')
  process.exit(1)
}

// nodemailer is a dependency of @payloadcms/email-nodemailer (pnpm does not hoist it)
const require = createRequire(import.meta.url)
const nodemailer = createRequire(require.resolve('@payloadcms/email-nodemailer'))('nodemailer')

const port = Number.parseInt(process.env.SMTP_PORT ?? '', 10) || 465
const host = (process.env.SMTP_HOST ?? '').trim() || 'smtp.hostinger.com'
const fromAddress = (process.env.EMAIL_FROM_ADDRESS ?? '').trim() || 'suporte@swingbrasilia.com.br'
const fromName = (process.env.EMAIL_FROM_NAME ?? '').trim() || 'Paraíso Brasília'

const transport = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
try {
  await transport.verify()
  console.log(`Conexão com ${host}:${port} e login de ${user}: ok`)
  const info = await transport.sendMail({
    from: { name: fromName, address: fromAddress },
    to,
    subject: 'Teste de e-mail - Paraíso Brasília',
    text: 'Se você recebeu esta mensagem, o envio de e-mails do site está funcionando.',
  })
  console.log(`Enviado para ${to} (id ${info.messageId}). Confira a caixa de entrada e o spam.`)
} catch (err) {
  // Only the error code/message: never the credentials
  console.error(`Falhou: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
  process.exit(1)
}

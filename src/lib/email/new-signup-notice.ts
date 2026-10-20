import type { Payload } from 'payload'

import { emailEnabled, fromIdentity } from './config'

type Account = { id: number; email: string; name?: string | null; apelido?: string | null }

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Date and time of the sign-up in Brasília time, e.g. "20/10/2026 18:30". */
export function formatSaoPaulo(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  })
    .format(date)
    .replace(',', '')
}

/** Staff notice for a new self sign-up. No password, token or confirmation link goes in it. */
export function buildNewSignupEmail(input: { account: Account; adminUrl: string; when: Date }) {
  const { account } = input
  const who = (account.apelido || account.name || '').trim()
  const when = formatSaoPaulo(input.when)
  const lines = [
    'Uma nova conta foi criada pelo site.',
    '',
    ...(who ? [`Apelido: ${who}`] : []),
    `E-mail: ${account.email}`,
    `Data e hora: ${when} (horário de Brasília)`,
    'Tipo de conta: gratuito',
    '',
    `Abrir a conta no painel: ${input.adminUrl}`,
  ]
  const html = [
    '<p>Uma nova conta foi criada pelo site.</p>',
    '<ul>',
    ...(who ? [`<li>Apelido: ${esc(who)}</li>`] : []),
    `<li>E-mail: ${esc(account.email)}</li>`,
    `<li>Data e hora: ${when} (horário de Brasília)</li>`,
    '<li>Tipo de conta: gratuito</li>',
    '</ul>',
    `<p><a href="${esc(input.adminUrl)}">Abrir a conta no painel</a></p>`,
  ].join('\n')
  return { subject: 'Novo cadastro no Paraíso Brasília', text: lines.join('\n'), html }
}

/**
 * Tells the team about a new self sign-up (staff-editable recipient in "Contato e endereço";
 * empty falls back to the site's from-address). Never throws: a mail failure must not touch the
 * sign-up. Logs only the account id.
 */
export async function notifyNewSignup(payload: Payload, account: Account, siteBase: string, now: Date = new Date()): Promise<void> {
  try {
    if (!emailEnabled()) return
    const contact = (await payload.findGlobal({ slug: 'contact', depth: 0, overrideAccess: true })) as unknown as {
      avisoNovoCadastroEmail?: string | null
    }
    const to = (contact.avisoNovoCadastroEmail ?? '').trim() || fromIdentity().address
    const mail = buildNewSignupEmail({
      account,
      adminUrl: `${siteBase}/admin/collections/assinantes/${account.id}`,
      when: now,
    })
    await payload.sendEmail({ to, subject: mail.subject, text: mail.text, html: mail.html })
  } catch (err) {
    payload.logger.error(`Falha ao avisar a equipe do cadastro ${account.id}: ${err instanceof Error ? err.name : 'erro'}`)
  }
}

import type { Payload } from 'payload'

import { emailEnabled } from './config'

export type VisitorAdNoticeKind = 'aprovar' | 'recusar' | 'despublicar'

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const HEADLINE: Record<VisitorAdNoticeKind, { subject: string; line: (apelido: string) => string }> = {
  aprovar: {
    subject: 'Seu anúncio foi publicado no ClassiSex',
    line: (a) => `Seu anúncio "${a}" foi aprovado e já aparece no ClassiSex.`,
  },
  recusar: {
    subject: 'Seu anúncio não foi aprovado no ClassiSex',
    line: (a) => `Seu anúncio "${a}" não foi aprovado e não aparece no ClassiSex.`,
  },
  despublicar: {
    subject: 'Seu anúncio saiu do ar no ClassiSex',
    line: (a) => `Seu anúncio "${a}" foi retirado do ClassiSex pela equipe.`,
  },
}

/**
 * Short notice to someone who sent an ad without an account. Carries only the apelido, the new situation
 * and the reason (when there is one): never the ad text or any contact.
 */
export function buildVisitorAdEmail(input: { kind: VisitorAdNoticeKind; apelido: string; motivo?: string | null; siteBase: string }) {
  const head = HEADLINE[input.kind]
  const apelido = input.apelido.replace(/\s+/g, ' ').trim()
  const motivo = (input.motivo ?? '').trim()
  const classisex = `${input.siteBase}/classisex`
  const cadastro = `${input.siteBase}/cadastro`
  const text = [
    head.line(apelido),
    ...(motivo ? ['', `Motivo: ${motivo}`] : []),
    '',
    `Ver o ClassiSex: ${classisex}`,
    `Crie uma conta gratuita para editar e apagar seus anúncios: ${cadastro}`,
    '',
    'Você recebeu este aviso porque este e-mail foi informado ao enviar um anúncio no site do Paraíso Brasília.',
  ].join('\n')
  const html = [
    `<p>${esc(head.line(apelido))}</p>`,
    ...(motivo ? [`<p>Motivo: ${esc(motivo)}</p>`] : []),
    `<p><a href="${esc(classisex)}">Ver o ClassiSex</a></p>`,
    `<p><a href="${esc(cadastro)}">Crie uma conta gratuita</a> para editar e apagar seus anúncios.</p>`,
    '<p>Você recebeu este aviso porque este e-mail foi informado ao enviar um anúncio no site do Paraíso Brasília.</p>',
  ].join('\n')
  return { subject: head.subject, text, html }
}

/**
 * Sends the notice after a staff decision on an ad sent without an account. Never throws: a mail failure
 * must not undo the moderation. Logs only the ad id (never the address).
 */
export async function notifyVisitorAd(
  payload: Payload,
  input: { adId: number; to: string; kind: VisitorAdNoticeKind; apelido: string; motivo?: string | null },
  siteBase: string,
): Promise<void> {
  try {
    if (!emailEnabled()) return
    const mail = buildVisitorAdEmail({ kind: input.kind, apelido: input.apelido, motivo: input.motivo, siteBase })
    await payload.sendEmail({ to: input.to, subject: mail.subject, text: mail.text, html: mail.html })
  } catch (err) {
    payload.logger.error(`Falha no aviso do anúncio sem conta #${input.adId}: ${err instanceof Error ? err.name : 'erro'}`)
  }
}

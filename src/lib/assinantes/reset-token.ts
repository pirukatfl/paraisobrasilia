import type { Payload } from 'payload'

/** Tempo de validade do link de nova senha gerado pela equipe (D-04). */
export const LINK_HOURS = 48
export const LINK_MS = LINK_HOURS * 3600_000

type TokenDoc = { id: number | string; resetPasswordToken?: string | null; resetPasswordExpiration?: string | null }

/**
 * Garante que o token recém-criado vale mesmo LINK_HOURS e devolve o prazo real gravado no banco.
 * O Payload grava o prazo (padrão: 1 h) e quem confere é o banco; se a configuração não chegar até a
 * operação, o link morreria cedo sem aviso. Aqui o prazo é lido de volta e corrigido se estiver curto.
 */
export async function ensureLinkExpiration(payload: Payload, token: string, now = Date.now()): Promise<string> {
  const doc = (await payload.db.findOne({
    collection: 'assinantes',
    where: { resetPasswordToken: { equals: token } },
  })) as TokenDoc | null
  if (!doc) throw new Error('token-nao-gravado')
  const wanted = now + LINK_MS
  const stored = doc.resetPasswordExpiration ? new Date(doc.resetPasswordExpiration).getTime() : 0
  if (stored >= wanted - 60_000) return new Date(stored).toISOString()
  const fixed = new Date(wanted).toISOString()
  await payload.db.updateOne({ collection: 'assinantes', id: doc.id, data: { resetPasswordExpiration: fixed } })
  return fixed
}

/**
 * Token ainda válido da conta, se houver. Os fluxos que criam token por conta própria (e-mail de
 * "esqueci a senha", senha curta do site antigo) reaproveitam este em vez de trocar por um novo, senão
 * o link que a equipe acabou de mandar pelo WhatsApp deixaria de valer sem ninguém perceber.
 */
export async function findActiveResetToken(payload: Payload, email: string, now = Date.now()): Promise<string | null> {
  const doc = (await payload.db.findOne({
    collection: 'assinantes',
    where: { email: { equals: email } },
  })) as TokenDoc | null
  if (!doc?.resetPasswordToken || !doc.resetPasswordExpiration) return null
  return new Date(doc.resetPasswordExpiration).getTime() > now + 60_000 ? doc.resetPasswordToken : null
}

/**
 * Private messages: pure rules (REC-02, D-02). No Payload/Next imports.
 */
export const MESSAGE_MAX = 2000
export const NEW_CONVERSATIONS_PER_DAY = 20
export const MESSAGES_PER_DAY = 200
export const THREAD_PAGE = 50
export const INBOX_PAGE = 30
/** countUnread stops at this value + 1 so the UI can show "99+". */
export const UNREAD_CAP = 99

/** One thread per pair of accounts, whoever starts it. */
export const pairKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`)

export type SendError =
  | 'vazio'
  | 'longa'
  | 'remetenteInativo'
  | 'destinatarioInativo'
  | 'propria'
  | 'limiteConversas'
  | 'limiteMensagens'
  | 'semApelido'
  | 'bloqueado'
  | 'voceBloqueou'
  | 'suspenso'

export const MENSAGEM_MESSAGES: Record<SendError, string> = {
  vazio: 'Escreva a mensagem.',
  longa: 'A mensagem pode ter até 2.000 caracteres.',
  remetenteInativo: 'Sua assinatura não está ativa. Renove para conversar.',
  destinatarioInativo: 'Esta pessoa está sem assinatura ativa e não pode receber mensagens agora.',
  propria: 'Este anúncio ou recado é seu.',
  limiteConversas: 'Você já começou 20 conversas hoje. Tente amanhã.',
  limiteMensagens: 'Você enviou muitas mensagens hoje. Tente amanhã.',
  semApelido: 'Escolha um apelido para conversar.',
  bloqueado: 'Não é possível enviar mensagens para esta pessoa.',
  voceBloqueou: 'Você bloqueou esta pessoa. Desbloqueie para voltar a conversar.',
  suspenso: 'Seu envio de mensagens foi suspenso pela equipe. Fale com a casa pelo WhatsApp.',
}

export const normaliseMessage = (texto: string): string => texto.replace(/\r\n/g, '\n').trim()

export function messageError(texto: string): 'vazio' | 'longa' | null {
  const clean = normaliseMessage(texto)
  if (clean.length === 0) return 'vazio'
  if (clean.length > MESSAGE_MAX) return 'longa'
  return null
}

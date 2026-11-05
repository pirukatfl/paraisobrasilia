/**
 * Comentários nos anúncios do ClassiSex (pedido do cliente 2026-11-03). Regras puras, as mesmas no
 * site e no painel. Pure module: no Payload/Next imports.
 */
import { recadoApelidoError } from '../../recados/rules'

/**
 * Quem pode comentar. 'todos' (padrão, pedido do cliente 2026-11-03): qualquer pessoa, com ou sem
 * conta; quem não está logado se identifica com o nome que quiser. 'conta': só conta logada
 * (gratuita ou assinante). 'assinante': só assinatura ativa. Trocar aqui muda o serviço, as ações e
 * as páginas (com 'assinante' a conversa some da área aberta).
 */
export const QUEM_COMENTA = 'todos' as 'todos' | 'conta' | 'assinante'

/** Com QUEM_COMENTA = 'assinante' a conversa não aparece na área aberta. */
export const CONVERSA_NA_AREA_ABERTA = (QUEM_COMENTA as string) !== 'assinante'

export const COMENTARIO_MAX = 1000
/** Comentários por conta por dia (fuso de Brasília), contando os ocultados. */
export const LIMITE_DIARIO = 30
/** Comentários sem conta por IP: por hora e por dia (memória do processo, nada vai para o banco). */
export const VISITANTE_LIMITE_HORA = 10
export const VISITANTE_LIMITE_DIA = 30
/** Janelas dos limites acima, em milissegundos. */
export const HORA_MS = 3_600_000
export const DIA_MS = 86_400_000
/** Segurança da leitura: no máximo isto por anúncio. */
export const COMENTARIOS_POR_ANUNCIO_MAX = 500

export const COMENTARIO_MESSAGES = {
  vazio: 'Escreva o comentário.',
  longo: `O comentário pode ter até ${COMENTARIO_MAX} caracteres.`,
  anuncio: 'Anúncio não encontrado.',
  resposta: 'Não foi possível responder: o comentário não está mais disponível.',
  bloqueada: 'Sua conta está sem permissão para comentar. Fale com a equipe.',
  assinatura: 'Só assinantes com acesso ativo podem comentar.',
  limite: 'Você enviou muitos comentários hoje. Tente amanhã.',
  limiteVisitante: 'Muitos comentários enviados daqui em pouco tempo. Tente de novo mais tarde.',
  entrar: 'Entre na sua conta para comentar.',
  naoEncontrado: 'Comentário não encontrado.',
  enviado: 'Comentário enviado. Ele aparece depois que a equipe aprovar.',
} as const

export const normaliseApelido = (value: string) => value.replace(/\s+/g, ' ').trim()

/** Trim, `\r\n` → `\n` and 3+ line breaks collapse to one blank line. The text is stored as written. */
export const normaliseComentario = (value: string) =>
  value.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()

export function comentarioTextoError(texto: string): string | null {
  if (!texto) return COMENTARIO_MESSAGES.vazio
  if (texto.length > COMENTARIO_MAX) return COMENTARIO_MESSAGES.longo
  return null
}

/** Same nickname rule as recados and messages (no phone, e-mail, @ or link). */
export const comentarioApelidoError = (apelido: string): string | null => recadoApelidoError(apelido)

/** Admin title: 'Apelido — first 60 characters…'. */
export function comentarioResumo(apelido: string, texto: string): string {
  const clean = texto.replace(/\s+/g, ' ').trim()
  const head = clean.length > 60 ? `${clean.slice(0, 60).trimEnd()}…` : clean
  return `${apelido} — ${head}`
}

/**
 * Comentários nos anúncios do ClassiSex (pedido do cliente 2026-11-03). Regras puras, as mesmas no
 * site e no painel. Pure module: no Payload/Next imports.
 */
import { recadoApelidoError } from '../../recados/rules'

/**
 * Quem pode comentar. 'conta': qualquer conta logada (gratuita ou assinante), padrão. 'assinante':
 * só assinatura ativa. Trocar aqui muda o serviço, as ações e as páginas (a conversa some da área
 * aberta e o formulário passa a exigir assinatura).
 */
export const QUEM_COMENTA = 'conta' as 'conta' | 'assinante'

/** Com QUEM_COMENTA = 'assinante' a conversa não aparece na área aberta. */
export const CONVERSA_NA_AREA_ABERTA = (QUEM_COMENTA as string) !== 'assinante'

export const COMENTARIO_MAX = 1000
/** Comentários por conta por dia (fuso de Brasília), contando os ocultados. */
export const LIMITE_DIARIO = 30
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
  naoEncontrado: 'Comentário não encontrado.',
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

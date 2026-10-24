import {
  MENSAGEM_ARQUIVO_GRANDE,
  MENSAGEM_BANCO,
  MENSAGEM_CAMPO_OBRIGATORIO,
  MENSAGEM_DUPLICADO,
  MENSAGEM_INESPERADA,
  MENSAGEM_MUITAS_TENTATIVAS,
  MENSAGEM_NAO_ENCONTRADO,
  MENSAGEM_PERMISSAO,
  MENSAGEM_REDE,
  MENSAGEM_SESSAO,
  MENSAGEM_TEXTO_LONGO,
  MENSAGEM_VINCULADO,
} from './mensagens'
import { traduzirMensagem } from './traduzir'

export * from './mensagens'
export { traduzirMensagem } from './traduzir'

/**
 * Pure helpers (no Next/Payload import) that turn any failure into a clear Portuguese sentence.
 * They never return a stack trace, SQL or table name (T-01-14): only the message of errors that
 * are meant for people (ServiceError, public APIError, ValidationError) or a fixed text.
 */

type Erro = {
  name?: unknown
  message?: unknown
  code?: unknown
  status?: unknown
  isPublic?: unknown
  cause?: unknown
}

const isObject = (v: unknown): v is Erro => typeof v === 'object' && v !== null

const ERROS_PUBLICOS = new Set(['ServiceError', 'ValidationError', 'APIError', 'Forbidden', 'AuthenticationError', 'NotFound', 'LockedAuth', 'UnauthorizedError'])

function codigoDe(err: unknown): string | undefined {
  let atual: unknown = err
  for (let i = 0; i < 4 && isObject(atual); i++) {
    if (typeof atual.code === 'string') return atual.code
    atual = atual.cause
  }
  return undefined
}

function textoTecnico(err: unknown): string {
  return isObject(err) && typeof err.message === 'string' ? err.message : ''
}

/** Looks like SQL, a table/column name, a path or a stack line: never show it. */
function pareceInterno(texto: string): boolean {
  return /\b(select|insert|update|delete)\b.*\b(from|into|set|where)\b|violates|relation "|column "|constraint|\bat \S+ \(|node_modules|\/home\/|\/app\/|ECONN|ETIMEDOUT/i.test(
    texto,
  )
}

/**
 * Message for an error caught on the server. `contexto` (optional) is a Portuguese prefix that
 * says what was being done, like "Não foi possível salvar o anúncio".
 */
export function mensagemAmigavel(err: unknown, contexto?: string): string {
  const base = mensagemBase(err)
  return contexto ? `${contexto}: ${base.charAt(0).toLowerCase()}${base.slice(1)}` : base
}

function mensagemBase(err: unknown): string {
  if (!isObject(err)) return MENSAGEM_INESPERADA

  const codigo = codigoDe(err)
  switch (codigo) {
    case '23505':
      return MENSAGEM_DUPLICADO
    case '23503':
      return MENSAGEM_VINCULADO
    case '23502':
      return MENSAGEM_CAMPO_OBRIGATORIO
    case '22001':
      return MENSAGEM_TEXTO_LONGO
    case '57P01':
    case '57P03':
    case '08006':
    case '08001':
    case '53300':
    case 'ECONNREFUSED':
    case 'ECONNRESET':
    case 'ETIMEDOUT':
      return MENSAGEM_BANCO
  }

  const texto = textoTecnico(err)
  if (/file size limit|LIMIT_FILE_SIZE|payload too large/i.test(texto) || err.status === 413) return MENSAGEM_ARQUIVO_GRANDE
  if (/timeout|timed out|Connection terminated/i.test(texto) && !ERROS_PUBLICOS.has(String(err.name))) return MENSAGEM_BANCO

  const publico =
    err.isPublic === true ||
    ERROS_PUBLICOS.has(String(err.name)) ||
    (typeof err.status === 'number' && err.status < 500 && err.isPublic !== false)
  if (publico && texto && !pareceInterno(texto)) return traduzirMensagem(texto)

  return MENSAGEM_INESPERADA
}

type CorpoErro = {
  message?: unknown
  errors?: unknown
}

function textoDe(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** First message found in the body, in the shapes our endpoints and Payload use. */
function primeiraMensagem(json: unknown): string | null {
  if (!isObject(json)) return null
  const corpo = json as CorpoErro
  const direta = textoDe(corpo.message)
  if (direta) return direta
  if (Array.isArray(corpo.errors)) {
    for (const e of corpo.errors) {
      if (!isObject(e)) continue
      const dados = (e as { data?: { errors?: unknown } }).data?.errors
      if (Array.isArray(dados)) {
        const partes = dados
          .map((d) => (isObject(d) ? textoDe(d.message) : null))
          .filter((m): m is string => m !== null)
        if (partes.length > 0) return partes.join(' ')
      }
      const msg = textoDe((e as { message?: unknown }).message)
      if (msg) return msg
    }
  }
  return null
}

/**
 * Client side: message for a failed fetch response. `json` is the parsed body (or null/{} when
 * it was not JSON, as with a 413 from the proxy or a 502).
 */
export function mensagemDaResposta(status: number, json?: unknown): string {
  const doServidor = primeiraMensagem(json)
  if (doServidor) {
    const traduzida = traduzirMensagem(doServidor)
    // Generic English leftovers fall through to the status text below
    if (traduzida !== MENSAGEM_INESPERADA || status >= 500) return traduzida
  }
  if (status === 401) return MENSAGEM_SESSAO
  if (status === 403) return MENSAGEM_PERMISSAO
  if (status === 404) return MENSAGEM_NAO_ENCONTRADO
  if (status === 413) return MENSAGEM_ARQUIVO_GRANDE
  if (status === 429) return MENSAGEM_MUITAS_TENTATIVAS
  if (status === 408 || status === 504) return 'O servidor demorou demais para responder. Tente de novo em instantes.'
  if (status === 502 || status === 503) return 'O servidor está indisponível no momento. Tente de novo em instantes.'
  if (status >= 400 && status < 500) return 'Os dados enviados não são válidos. Confira o formulário e tente de novo.'
  return MENSAGEM_INESPERADA
}

/** Client side: message for a fetch that never got an answer (offline, DNS, aborted). */
export function mensagemDeFalhaDeRede(err?: unknown): string {
  if (isObject(err) && err.name === 'AbortError') return 'O envio foi cancelado. Tente de novo.'
  return MENSAGEM_REDE
}

/**
 * Client side: message for anything caught around a fetch. Network failures (TypeError) get the
 * "sem conexão" text; Errors we threw ourselves (with a Portuguese message) keep it; anything that looks internal does not.
 */
export function mensagemDeExcecao(err: unknown): string {
  if (err instanceof TypeError) return MENSAGEM_REDE
  if (!(err instanceof Error) || !err.message || err instanceof SyntaxError) return MENSAGEM_INESPERADA
  const traduzida = traduzirMensagem(err.message)
  if (traduzida !== err.message) return traduzida
  return pareceInterno(err.message) ? MENSAGEM_INESPERADA : err.message
}

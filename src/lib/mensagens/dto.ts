/**
 * Shapes sent to the browser for private messages. Pure: no Payload/Next imports.
 * No assinante ids or e-mails (T-05-05): only snapshots of apelidos and text.
 */
export type InboxItemDTO = {
  id: number
  outroApelido: string
  assunto: string
  /** Last message, at most 60 characters */
  ultimo: string
  quando: string
  naoLida: boolean
}

export type ThreadDTO = {
  id: number
  outroApelido: string
  meuApelido: string
  assunto: string
  mensagens: { id: number; minha: boolean; texto: string; quando: string }[]
  temAnteriores: boolean
  antesDe: number | null
}

const stamp = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** "20/10/2026 15:04" in São Paulo time. */
export function formatMessageTime(iso: string): string {
  return stamp.format(new Date(iso)).replace(', ', ' ')
}

export const INBOX_SNIPPET_MAX = 60

export function snippetOf(texto: string): string {
  const flat = texto.replace(/\s+/g, ' ').trim()
  return flat.length <= INBOX_SNIPPET_MAX ? flat : `${flat.slice(0, INBOX_SNIPPET_MAX - 1).trimEnd()}…`
}

const short = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

/** "20/10 15:04", used in the report snapshot lines. */
export function formatSnapshotTime(iso: string): string {
  return short.format(new Date(iso)).replace(', ', ' ')
}

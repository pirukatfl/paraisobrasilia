/**
 * Data shapes of the ad conversation sent to the browser. Pure: no Payload/Next imports.
 * The author id and e-mail never appear here: the author is not even read for the lists.
 * Contacts written in a comment reach only an active subscriber (`verContatos`): everyone else
 * gets the text through redactContacts, on the server.
 */
import { redactContacts } from '../redact'

export type ComentarioDocLike = {
  id: number
  apelido?: string | null
  texto?: string | null
  createdAt: string
  doAnunciante?: boolean | null
  /** Written without an account (a flag only, never who). */
  semConta?: boolean | null
  /** Root comment id (or the populated doc); null for a root. */
  parent?: unknown
}

export type ComentarioDTO = {
  id: number
  apelido: string
  texto: string
  /** "Hoje, 14:32", "Ontem, 21:05" or "25/10/2026" (Brasília time). */
  quando: string
  doAnunciante: boolean
  /** Written by someone without an account: shows the "visitante" marker. */
  semConta: boolean
  /** The viewer wrote it (shows "Apagar"). Filled outside the shared cache. */
  meu: boolean
  respostas: ComentarioDTO[]
}

/** What the page knows about who is looking (decided on the server from the session). */
export type ComentariosViewer =
  | { tipo: 'visitante' }
  | { tipo: 'conta'; apelido: string; bloqueado: boolean; assinanteAtivo: boolean }

const TZ = 'America/Sao_Paulo'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const fullFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })

const dayOf = (d: Date) => dayFmt.format(d)

/** Short date that stays correct for the whole cache window (no "5 minutes ago"). */
export function quandoLabel(iso: string, now: Date): string {
  const when = new Date(iso)
  if (!Number.isFinite(when.getTime())) return ''
  const day = dayOf(when)
  if (day === dayOf(now)) return `Hoje, ${timeFmt.format(when)}`
  if (day === dayOf(new Date(now.getTime() - 86_400_000))) return `Ontem, ${timeFmt.format(when)}`
  return fullFmt.format(when)
}

const rootIdOf = (parent: unknown): number | null => {
  if (parent === null || parent === undefined || parent === '') return null
  if (typeof parent === 'object') {
    const id = (parent as { id?: number | string }).id
    return id === undefined ? null : Number(id)
  }
  return Number(parent)
}

/**
 * Builds the thread: roots and their replies, both in chronological order. A reply whose root is
 * not in `docs` (hidden or deleted) is dropped with it. One level only.
 */
export function toComentarioDTOs(
  docs: ComentarioDocLike[],
  { verContatos, meusIds, now }: { verContatos: boolean; meusIds?: ReadonlySet<number>; now: Date },
): ComentarioDTO[] {
  const sorted = [...docs].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
  const toDTO = (doc: ComentarioDocLike): ComentarioDTO => {
    const apelido = doc.apelido ?? ''
    const texto = doc.texto ?? ''
    return {
      id: doc.id,
      apelido: verContatos ? apelido : redactContacts(apelido).text,
      texto: verContatos ? texto : redactContacts(texto).text,
      quando: quandoLabel(doc.createdAt, now),
      // A visitor can never carry the advertiser badge, whatever is stored
      doAnunciante: Boolean(doc.doAnunciante) && !doc.semConta,
      semConta: Boolean(doc.semConta),
      meu: meusIds?.has(doc.id) ?? false,
      respostas: [],
    }
  }
  const roots = new Map<number, ComentarioDTO>()
  const out: ComentarioDTO[] = []
  for (const doc of sorted) {
    if (rootIdOf(doc.parent) === null) {
      const dto = toDTO(doc)
      roots.set(doc.id, dto)
      out.push(dto)
    }
  }
  for (const doc of sorted) {
    const rootId = rootIdOf(doc.parent)
    if (rootId === null) continue
    roots.get(rootId)?.respostas.push(toDTO(doc))
  }
  return out
}

/** The same thread with `meu` set for the viewer (the shared public copy has it false everywhere). */
export function marcarMeus(dtos: ComentarioDTO[], meusIds: ReadonlySet<number>): ComentarioDTO[] {
  return dtos.map((c) => ({
    ...c,
    meu: meusIds.has(c.id),
    respostas: c.respostas.map((r) => ({ ...r, meu: meusIds.has(r.id), respostas: [] })),
  }))
}

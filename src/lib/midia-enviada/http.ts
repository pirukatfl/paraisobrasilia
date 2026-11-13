/** Small helpers shared by the two POST route handlers of the open photo/video form. */
import { UPLOAD_ERROR_MESSAGES, uploadErrorMessage } from '../classisex/media-messages'
import { ServiceError, type UploadFile } from '../classisex/service'

export const noStore = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }

/** One request carries at most one 100 MB video (Caddy caps the body at 110 MB too). */
export const MAX_BODY_BYTES = 105 * 1024 * 1024

const EXTENSION_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

/** Some phones send an empty type (.mov especially): fall back to the extension. */
export function mimeOf(file: File): string {
  if (file.type) return file.type
  return EXTENSION_TYPES[file.name.split('.').pop()?.toLowerCase() ?? ''] ?? ''
}

export async function toUploadFile(file: File): Promise<UploadFile> {
  return { data: Buffer.from(await file.arrayBuffer()), mimetype: mimeOf(file), name: file.name || 'arquivo', size: file.size }
}

export const text = (form: FormData, name: string) => {
  const value = form.get(name)
  return typeof value === 'string' ? value : ''
}

export type Failure = { code: string; status: number; errors: Record<string, string> }

const FILE_CODES = new Set<string>(['grande', 'tipo', 'foto-ilegivel', 'video-ilegivel', 'longo', 'limite-fotos', 'limite-video', 'indisponivel'])

export function failureOf(err: unknown): Failure {
  if (err instanceof ServiceError) {
    if (err.code === 'invalido' && err.errors) return { code: 'invalido', status: 400, errors: err.errors }
    if (FILE_CODES.has(err.code)) return { code: err.code, status: err.status, errors: { arquivos: uploadErrorMessage(err.code) } }
    return { code: err.code, status: err.status, errors: { form: err.message } }
  }
  console.error(`[midia-enviada] envio falhou: ${describeError(err)}`)
  return { code: 'erro', status: 500, errors: { form: UPLOAD_ERROR_MESSAGES.erro } }
}

/**
 * What to log for an unexpected failure, so the cause can be found in the server log (the visitor only sees the
 * generic message). Never the body or the contact: only the error names/codes, the first line of the message
 * (cut short; database errors put query parameters after it) and the stack frames (file:line, no values).
 */
export function describeError(err: unknown): string {
  if (!(err instanceof Error)) return 'erro'
  const parts: string[] = []
  let current: unknown = err
  for (let depth = 0; current instanceof Error && depth < 3; depth++) {
    const code = (current as { code?: unknown }).code
    const firstLine = current.message.split('\n')[0]!.slice(0, 160)
    parts.push(`${current.name}${typeof code === 'string' ? ` [${code}]` : ''}: ${firstLine}`)
    current = current.cause
  }
  const frames = (err.stack ?? '')
    .split('\n')
    .filter((line) => line.trim().startsWith('at '))
    .slice(0, 6)
    .map((line) => line.trim())
  return [parts.join(' <- '), ...frames].join('\n  ')
}

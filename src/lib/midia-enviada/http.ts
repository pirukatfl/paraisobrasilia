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
  // Never log the body or the contact
  console.error(`[midia-enviada] envio falhou: ${err instanceof Error ? err.name : 'erro'}`)
  return { code: 'erro', status: 500, errors: { form: UPLOAD_ERROR_MESSAGES.erro } }
}

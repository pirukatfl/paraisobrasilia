/**
 * Checks and cleans one photo or video sent through the open form, before Payload stores it.
 * Same rules as the ClassiSex media (sizes, decodable photo re-encoded by Payload so EXIF/GPS goes away, video
 * up to 3 minutes with location boxes zero-filled). Pure of Payload; used by the arquivos collection hook.
 */
import sharp from 'sharp'

import { AD_MEDIA_MESSAGES, PHOTO_MIME_TYPES, VIDEO_MIME_TYPES } from '../classisex/media-messages'
import { MAX_VIDEO_SECONDS, isMp4Error, readMp4Info, scrubMp4Metadata } from '../classisex/mp4'
import { MAX_FOTO_BYTES, MAX_VIDEO_BYTES } from './regras'

export class ArquivoInvalido extends Error {
  /**
   * Marker checked by `isArquivoInvalido`: in the production bundle this module can be loaded twice (route chunk and
   * Payload config chunk), and then `instanceof` fails and a plain "o vídeo pode ter até 3 minutos" became a 500.
   */
  readonly arquivoInvalido = true as const
  constructor(message: string) {
    super(message)
    this.name = 'ArquivoInvalido'
  }
}

export const isArquivoInvalido = (err: unknown): err is ArquivoInvalido =>
  err instanceof ArquivoInvalido || (err instanceof Error && (err as { arquivoInvalido?: unknown }).arquivoInvalido === true)

export type Limpo = { kind: 'foto' | 'video'; data: Buffer; durationSeconds?: number }

export async function limparArquivo(buffer: Buffer, mimetype: string, size: number): Promise<Limpo> {
  const bytes = Math.max(size, buffer.length)
  if (PHOTO_MIME_TYPES.includes(mimetype)) {
    if (bytes > MAX_FOTO_BYTES) throw new ArquivoInvalido(AD_MEDIA_MESSAGES.fotoGrande)
    const meta = await sharp(buffer)
      .metadata()
      .catch(() => null)
    if (!meta || !['jpeg', 'png', 'webp'].includes(String(meta.format)) || !meta.width || !meta.height) {
      throw new ArquivoInvalido(AD_MEDIA_MESSAGES.fotoIlegivel)
    }
    return { kind: 'foto', data: buffer }
  }
  if (VIDEO_MIME_TYPES.includes(mimetype)) {
    if (bytes > MAX_VIDEO_BYTES) throw new ArquivoInvalido(AD_MEDIA_MESSAGES.videoGrande)
    try {
      const info = readMp4Info(buffer)
      if (info.durationSeconds > MAX_VIDEO_SECONDS + 0.5) throw new ArquivoInvalido(AD_MEDIA_MESSAGES.videoLongo)
      return { kind: 'video', data: scrubMp4Metadata(buffer).data, durationSeconds: Math.round(info.durationSeconds) }
    } catch (err) {
      if (isMp4Error(err)) throw new ArquivoInvalido(err.message)
      throw err
    }
  }
  throw new ArquivoInvalido(AD_MEDIA_MESSAGES.tipo)
}

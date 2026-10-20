/**
 * Messages for ClassiSex photo/video uploads (D-01). Shared by the ad-media collection hooks,
 * the owner service, the upload route and the edit page. Pure module.
 */
import { MAX_VIDEO_SECONDS } from './mp4'

export const MAX_AD_PHOTO_BYTES = 15_000_000
export const MAX_AD_VIDEO_BYTES = 100_000_000
export const MAX_AD_PHOTOS = 10
export const MAX_AD_VIDEOS = 2

export const PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime']

/** Raised by the collection hooks (APIError text). */
export const AD_MEDIA_MESSAGES = {
  indisponivel: 'Envio de fotos indisponível no momento.',
  tipo: 'Envie fotos JPG, PNG ou WebP, ou um vídeo MP4 ou MOV.',
  fotoGrande: 'A foto passa de 15 MB.',
  videoGrande: 'O vídeo passa de 100 MB.',
  fotoIlegivel: 'Não conseguimos ler esta foto. Envie JPG, PNG ou WebP.',
  videoIlegivel: 'Não conseguimos ler este vídeo. Envie um MP4 ou MOV gravado pelo celular.',
  videoLongo: `O vídeo pode ter até ${MAX_VIDEO_SECONDS} segundos.`,
  fotos: 'Cada anúncio pode ter até 10 fotos.',
  videos: 'Cada anúncio pode ter até 2 vídeos.',
  semAnuncio: 'Anúncio não encontrado.',
} as const

export type UploadErrorCode =
  | 'grande'
  | 'longo'
  | 'tipo'
  | 'limite-fotos'
  | 'limite-video'
  | 'inativo'
  | 'foto-ilegivel'
  | 'video-ilegivel'
  | 'indisponivel'
  | 'limite-anuncios'

/** Shown on the edit page from ?midia=erro&codigo=… (the URL carries only the code). */
export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  grande: 'O arquivo é grande demais (foto até 15 MB, vídeo até 100 MB).',
  longo: AD_MEDIA_MESSAGES.videoLongo,
  tipo: 'Envie fotos em JPG, PNG ou WebP e vídeos em MP4 ou MOV.',
  'limite-fotos': AD_MEDIA_MESSAGES.fotos,
  'limite-video': AD_MEDIA_MESSAGES.videos,
  inativo: 'Sua assinatura não está ativa.',
  'foto-ilegivel': AD_MEDIA_MESSAGES.fotoIlegivel,
  'video-ilegivel': AD_MEDIA_MESSAGES.videoIlegivel,
  indisponivel: 'Envio de fotos indisponível no momento. Tente mais tarde ou avise a equipe.',
  'limite-anuncios': 'Você já tem 3 anúncios ativos. Apague um para mandar este de volta para análise.',
}

export const MEDIA_OK_MESSAGES: Record<string, string> = {
  'foto-ok': 'Foto enviada. O anúncio volta para análise da equipe.',
  'video-ok': 'Vídeo enviado. O anúncio volta para análise da equipe.',
  capa: 'Capa alterada. O anúncio volta para análise da equipe.',
  removida: 'Mídia removida. O anúncio volta para análise da equipe.',
}

/** Hook message → code. Anything unknown from a video is a read error; from a photo, too. */
export function uploadCodeFor(message: string, kind: 'foto' | 'video'): UploadErrorCode {
  switch (message) {
    case AD_MEDIA_MESSAGES.fotoGrande:
    case AD_MEDIA_MESSAGES.videoGrande:
      return 'grande'
    case AD_MEDIA_MESSAGES.videoLongo:
      return 'longo'
    case AD_MEDIA_MESSAGES.tipo:
      return 'tipo'
    case AD_MEDIA_MESSAGES.fotos:
      return 'limite-fotos'
    case AD_MEDIA_MESSAGES.videos:
      return 'limite-video'
    case AD_MEDIA_MESSAGES.indisponivel:
      return 'indisponivel'
    default:
      return kind === 'video' ? 'video-ilegivel' : 'foto-ilegivel'
  }
}

export function uploadErrorMessage(code: string | undefined): string {
  return (code && UPLOAD_ERROR_MESSAGES[code as UploadErrorCode]) || 'Não foi possível enviar o arquivo. Tente de novo.'
}

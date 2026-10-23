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
  fotosGratis: 'Conta gratuita: 1 foto por anúncio. Assine para enviar até 10 fotos e 2 vídeos.',
  videoGratis: 'Conta gratuita não envia vídeos. Assine para enviar até 2 vídeos.',
  semAnuncio: 'Anúncio não encontrado.',
  fotosSemConta: 'Anúncio sem conta: 1 foto, sem vídeo. Assinantes enviam até 10 fotos e 2 vídeos.',
  videoSemConta: 'Anúncio sem conta: 1 foto, sem vídeo. Assinantes enviam até 10 fotos e 2 vídeos.',
} as const

export type UploadErrorCode =
  | 'grande'
  | 'longo'
  | 'tipo'
  | 'limite-fotos'
  | 'limite-video'
  | 'limite-fotos-gratis'
  | 'video-gratis'
  | 'inativo'
  | 'foto-ilegivel'
  | 'video-ilegivel'
  | 'indisponivel'
  | 'limite-anuncios'
  | 'fotos-sem-conta'
  | 'video-sem-conta'

/** Shown on the edit page from ?midia=erro&codigo=… (the URL carries only the code). */
export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  grande: 'O arquivo é grande demais (foto até 15 MB, vídeo até 100 MB).',
  longo: AD_MEDIA_MESSAGES.videoLongo,
  tipo: 'Envie fotos em JPG, PNG ou WebP e vídeos em MP4 ou MOV.',
  'limite-fotos': AD_MEDIA_MESSAGES.fotos,
  'limite-video': AD_MEDIA_MESSAGES.videos,
  'limite-fotos-gratis': `${AD_MEDIA_MESSAGES.fotosGratis} Veja os planos em Assine Já.`,
  'video-gratis': `${AD_MEDIA_MESSAGES.videoGratis} Veja os planos em Assine Já.`,
  inativo: 'Sua assinatura não está ativa.',
  'foto-ilegivel': AD_MEDIA_MESSAGES.fotoIlegivel,
  'video-ilegivel': AD_MEDIA_MESSAGES.videoIlegivel,
  indisponivel: 'Envio de fotos indisponível no momento. Tente mais tarde ou avise a equipe.',
  'limite-anuncios': 'Você já tem 3 anúncios ativos. Apague um para mandar este de volta para análise.',
  'fotos-sem-conta': AD_MEDIA_MESSAGES.fotosSemConta,
  'video-sem-conta': AD_MEDIA_MESSAGES.videoSemConta,
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
    case AD_MEDIA_MESSAGES.fotosGratis:
      return 'limite-fotos-gratis'
    case AD_MEDIA_MESSAGES.videoGratis:
      return 'video-gratis'
    case AD_MEDIA_MESSAGES.indisponivel:
      return 'indisponivel'
    default:
      return kind === 'video' ? 'video-ilegivel' : 'foto-ilegivel'
  }
}

export function uploadErrorMessage(code: string | undefined): string {
  return (code && UPLOAD_ERROR_MESSAGES[code as UploadErrorCode]) || 'Não foi possível enviar o arquivo. Tente de novo.'
}

/** Limits shown by the create form (client side); the server enforces the same ones. */
export const CLIENT_MESSAGES = {
  fotosMax: (max: number) =>
    max === 1
      ? 'Conta gratuita: 1 foto por anúncio. As outras não foram adicionadas.'
      : `Você pode escolher até ${max} fotos. As que passaram do limite não foram adicionadas.`,
  videosMax: (max: number) =>
    max === 0
      ? 'Conta gratuita não envia vídeos. Assine para enviar até 2 vídeos.'
      : `Você pode escolher até ${max} vídeos. Os que passaram do limite não foram adicionados.`,
  fotoTipo: (name: string) => `"${name}" não é uma foto JPG, PNG ou WebP.`,
  videoTipo: (name: string) => `"${name}" não é um vídeo MP4 ou MOV.`,
  fotoGrande: (name: string) => `A foto "${name}" passa de 15 MB.`,
  videoGrande: (name: string) => `O vídeo "${name}" passa de 100 MB.`,
  videoLongo: (name: string) => `O vídeo "${name}" passa de ${MAX_VIDEO_SECONDS} segundos.`,
} as const

/** Edit-page notice after the create-with-files flow: ?midia=lote&ok=N&falhas=M&codigo=… */
export function batchNotice(okRaw: string | undefined, failRaw: string | undefined, code: string | undefined): { text: string; error: boolean } {
  const n = (v: string | undefined) => (v && /^\d{1,2}$/.test(v) ? Number(v) : 0)
  const ok = n(okRaw)
  const fails = n(failRaw)
  const created = 'Anúncio criado e enviado para análise da equipe.'
  if (fails === 0) return { text: `${created} ${ok} ${ok === 1 ? 'arquivo enviado' : 'arquivos enviados'}.`, error: false }
  const plural = fails === 1 ? '1 arquivo não foi aceito' : `${fails} arquivos não foram aceitos`
  return {
    text: `${created} ${ok} enviado(s); ${plural}: ${uploadErrorMessage(code)} Você pode tentar de novo aqui, em Fotos e vídeos.`,
    error: true,
  }
}

/**
 * Report reasons and limits (CLAS-05, D-08). Pure: shared by the collection, the service, the
 * members form and the admin panel.
 */
export const REPORT_REASONS = [
  { value: 'contato-falso', label: 'Contato falso' },
  { value: 'golpe-ou-cobranca', label: 'Golpe ou cobrança' },
  { value: 'ofensivo', label: 'Conteúdo ofensivo' },
  { value: 'menor-de-idade', label: 'Pessoa menor de idade' },
  { value: 'sem-autorizacao-de-imagem', label: 'Foto ou vídeo sem autorização' },
  { value: 'outro', label: 'Outro' },
] as const

export type ReportReason = (typeof REPORT_REASONS)[number]['value']

export const URGENT_REASON: ReportReason = 'menor-de-idade'
export const DETAILS_MAX = 500
export const NOTE_MAX = 300
export const DAILY_LIMIT = 10

export const REPORT_MESSAGES = {
  enviada: 'Denúncia enviada. A equipe vai analisar.',
  duplicada: 'Você já denunciou este anúncio.',
  proprio: 'Você não pode denunciar o próprio anúncio.',
  limite: 'Você enviou muitas denúncias hoje. Tente amanhã ou fale com a equipe.',
  detalhes: `Escreva até ${DETAILS_MAX} caracteres.`,
  motivo: 'Escolha o motivo da denúncia.',
  nota: `Escreva até ${NOTE_MAX} caracteres.`,
} as const

export const isReportReason = (value: unknown): value is ReportReason =>
  REPORT_REASONS.some((r) => r.value === value)

export const reasonLabel = (value: string): string => REPORT_REASONS.find((r) => r.value === value)?.label ?? value

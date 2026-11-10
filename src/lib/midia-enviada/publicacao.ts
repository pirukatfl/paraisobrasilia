/**
 * Publication rule of the files sent by the public (client decision 2026-11-10). Pure module (no Payload, no
 * Next): the cached queries and both file routes use the same function, so the rule lives in one place.
 * A file is public when its submission is approved AND staff did not hide that file.
 */
export type KindArquivo = 'foto' | 'video'

export function estaPublicado(arquivo: {
  kind: string | null | undefined
  oculto: boolean | null | undefined
  envioStatus: string | null | undefined
}): boolean {
  return (arquivo.kind === 'foto' || arquivo.kind === 'video') && arquivo.oculto !== true && arquivo.envioStatus === 'aprovado'
}

/** Seconds → "0:42", "1:05", "12:00"; null for a missing or invalid duration. */
export function duracaoRotulo(segundos: number | null | undefined): string | null {
  if (typeof segundos !== 'number' || !Number.isFinite(segundos) || segundos < 0) return null
  const total = Math.round(segundos)
  const min = Math.floor(total / 60)
  const sec = String(total % 60).padStart(2, '0')
  return `${min}:${sec}`
}

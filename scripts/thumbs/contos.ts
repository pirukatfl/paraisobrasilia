/**
 * Creates the 4:3 thumbs (thumb 480x360, thumb2x 960x720) of the images already attached to contos.
 * Payload only makes sizes at upload, so images sent before the sizes existed need this once. Safe to repeat:
 * sizes already stored are skipped, originals are never touched. Prints counts only.
 *
 *   pnpm thumbs:contos
 */
import { contoMediaIds, generateMissingThumbs } from '../../src/lib/media/thumbs'

try {
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../../src/payload.config')])
  const payload = await getPayload({ config })
  try {
    const mediaDir = (payload.collections.media.config.upload as { staticDir?: string }).staticDir
    if (!mediaDir) throw new Error('Pasta de mídia não encontrada.')
    const r = await generateMissingThumbs(payload, mediaDir, await contoMediaIds(payload))
    console.log(
      `Imagens de contos: ${r.medias} · miniaturas geradas ${r.geradas} · já tinham ${r.jaTinham} · sem arquivo ${r.semArquivo} · original pequena ${r.pequenas} · falhas ${r.falhas}`,
    )
    if (r.falhas > 0 || r.semArquivo > 0) process.exitCode = 1
  } finally {
    await payload.destroy()
  }
} catch (err: unknown) {
  console.error(`Falha ao gerar miniaturas: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
}

import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadDicasBundleIfPresent } from '../lib/dicas/import'

/**
 * No schema change. Loads the reviewed WordPress dicas from seed/dicas-wp.json when that file
 * exists (quick dicas-hot, DH-06); without the file it does nothing. Idempotent by wpId, so a
 * re-deploy never creates duplicates or overwrites staff edits. Logs counts only (DH-10).
 */
const BUNDLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'seed/dicas-wp.json')

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const result = await loadDicasBundleIfPresent(payload, BUNDLE, { req })
  if ('skipped' in result) {
    payload.logger.info('dicas_wp_bundle: sem arquivo dicas-wp.json, nada a importar.')
    return
  }
  payload.logger.info(
    `dicas_wp_bundle: ${result.criados.length} criadas, ${result.existentes.length} já existiam.`,
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Never deletes content: imported dicas may have been edited by staff.
}

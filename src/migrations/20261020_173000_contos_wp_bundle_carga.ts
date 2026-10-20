import { MigrateUpArgs, MigrateDownArgs } from '@payloadcms/db-postgres'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadBundleIfPresent } from '../lib/contos/import'

/**
 * Re-runs the 05-04 load for databases that applied contos_wp_bundle before the file existed. Loads the reviewed WordPress contos from seed/contos-wp.json when that file
 * exists (05-04, decision A); without the file it does nothing. Idempotent by wpId, so a
 * re-deploy never creates duplicates or overwrites staff edits. Logs counts only (T-05-15).
 */
const BUNDLE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'seed/contos-wp.json')

export async function up({ payload, req }: MigrateUpArgs): Promise<void> {
  const result = await loadBundleIfPresent(payload, BUNDLE, { req })
  if ('skipped' in result) {
    payload.logger.info('contos_wp_bundle_carga: sem arquivo contos-wp.json, nada a importar.')
    return
  }
  payload.logger.info(
    `contos_wp_bundle_carga: ${result.criados.length} criados, ${result.existentes.length} já existiam.`,
  )
}

export async function down(_args: MigrateDownArgs): Promise<void> {
  // Never deletes content: imported contos may have been edited by staff.
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

const rico = (texto: string) =>
  JSON.stringify({
    root: {
      type: 'root',
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', version: 1, text: texto, format: 0, detail: 0, mode: 'normal', style: '' }],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  }).replace(/'/g, "''")

/**
 * The promotion form no longer asks "Festa / data que pretende ir": its two site texts go away.
 * `envios_midia.data_festa` stays so older submissions keep what people typed.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "data_festa_rotulo";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "data_festa_ajuda";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql.raw(`
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "data_festa_rotulo" jsonb DEFAULT '${rico('Festa / data que pretende ir (opcional)')}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "data_festa_ajuda" jsonb DEFAULT '${rico('Ex.: sábado, 14/11, ou o nome da festa.')}'::jsonb;`))
}

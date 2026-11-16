import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Festas: o campo slug deixa de ser obrigatório no painel (é gerado a partir do título).
 * Remove o NOT NULL da coluna para rascunhos ainda sem título.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "parties" ALTER COLUMN "slug" DROP NOT NULL;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "parties" ALTER COLUMN "slug" SET NOT NULL;`)
}

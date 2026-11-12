import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Descrição opcional escrita pela equipe em cada foto/vídeo amador aprovado (pedido do cliente, 2026-11-12),
 * exibida no card do site.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "envios_midia_arquivos" ADD COLUMN "descricao" varchar;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "envios_midia_arquivos" DROP COLUMN "descricao";`)
}

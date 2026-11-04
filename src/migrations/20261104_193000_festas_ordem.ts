import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "parties" ADD COLUMN "display_order" numeric;
  ALTER TABLE "_parties_v" ADD COLUMN "version_display_order" numeric;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "parties" DROP COLUMN "display_order";
  ALTER TABLE "_parties_v" DROP COLUMN "version_display_order";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "models" ADD COLUMN "contact" varchar;
  ALTER TABLE "_models_v" ADD COLUMN "version_contact" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "models" DROP COLUMN "contact";
  ALTER TABLE "_models_v" DROP COLUMN "version_contact";`)
}

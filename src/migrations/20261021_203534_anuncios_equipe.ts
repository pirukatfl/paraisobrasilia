import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ads_origem_legado" AS ENUM('equipe');
  ALTER TABLE "ads" ADD COLUMN "origem_legado" "enum_ads_origem_legado";
  CREATE INDEX "ads_origem_legado_idx" ON "ads" USING btree ("origem_legado");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "ads_origem_legado_idx";
  ALTER TABLE "ads" DROP COLUMN "origem_legado";
  DROP TYPE "public"."enum_ads_origem_legado";`)
}

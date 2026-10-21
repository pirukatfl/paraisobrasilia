import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_ads_status" ADD VALUE 'rascunho';
  ALTER TABLE "ads" ADD COLUMN "wp_comment_id" numeric;
  ALTER TABLE "ads" ADD COLUMN "importado_em" timestamp(3) with time zone;
  ALTER TABLE "ads" ADD COLUMN "criado_no_site_antigo_em" timestamp(3) with time zone;
  CREATE UNIQUE INDEX "ads_wp_comment_id_idx" ON "ads" USING btree ("wp_comment_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ads" ALTER COLUMN "status" SET DATA TYPE text;
  ALTER TABLE "ads" ALTER COLUMN "status" SET DEFAULT 'pendente'::text;
  DROP TYPE "public"."enum_ads_status";
  CREATE TYPE "public"."enum_ads_status" AS ENUM('pendente', 'aprovado', 'recusado', 'despublicado');
  ALTER TABLE "ads" ALTER COLUMN "status" SET DEFAULT 'pendente'::"public"."enum_ads_status";
  ALTER TABLE "ads" ALTER COLUMN "status" SET DATA TYPE "public"."enum_ads_status" USING "status"::"public"."enum_ads_status";
  DROP INDEX "ads_wp_comment_id_idx";
  ALTER TABLE "ads" DROP COLUMN "wp_comment_id";
  ALTER TABLE "ads" DROP COLUMN "importado_em";
  ALTER TABLE "ads" DROP COLUMN "criado_no_site_antigo_em";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Comentários passam por moderação: nova situação "Em análise" (pendente). Os já publicados continuam publicados. */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_ad_comments_status" ADD VALUE IF NOT EXISTS 'pendente' BEFORE 'publicado';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   UPDATE "ad_comments" SET "status" = 'oculto' WHERE "status"::text = 'pendente';
  ALTER TABLE "ad_comments" ALTER COLUMN "status" DROP DEFAULT;
  ALTER TABLE "ad_comments" ALTER COLUMN "status" SET DATA TYPE text;
  DROP TYPE "public"."enum_ad_comments_status";
  CREATE TYPE "public"."enum_ad_comments_status" AS ENUM('publicado', 'oculto');
  ALTER TABLE "ad_comments" ALTER COLUMN "status" SET DATA TYPE "public"."enum_ad_comments_status" USING "status"::"public"."enum_ad_comments_status";
  ALTER TABLE "ad_comments" ALTER COLUMN "status" SET DEFAULT 'publicado';`)
}

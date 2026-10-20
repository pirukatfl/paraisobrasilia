import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_assinantes_origem" AS ENUM('equipe', 'cadastro');
  ALTER TABLE "assinantes" ADD COLUMN "origem" "enum_assinantes_origem" DEFAULT 'equipe';
  ALTER TABLE "assinantes" ADD COLUMN "declaracao18_em" timestamp(3) with time zone;
  ALTER TABLE "assinantes" ADD COLUMN "termos_aceitos_em" timestamp(3) with time zone;
  ALTER TABLE "assinantes" ADD COLUMN "_verified" boolean;
  ALTER TABLE "assinantes" ADD COLUMN "_verificationtoken" varchar;`)
  // T-CG-07: with auth.verify on, Payload's JWT strategy accepts only accounts with _verified = true.
  // Every account that exists now was created by staff, a seed or an import: all are confirmed.
  await db.execute(sql`
   UPDATE "assinantes" SET "_verified" = true WHERE "_verified" IS NOT TRUE;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assinantes" DROP COLUMN "origem";
  ALTER TABLE "assinantes" DROP COLUMN "declaracao18_em";
  ALTER TABLE "assinantes" DROP COLUMN "termos_aceitos_em";
  ALTER TABLE "assinantes" DROP COLUMN "_verified";
  ALTER TABLE "assinantes" DROP COLUMN "_verificationtoken";
  DROP TYPE "public"."enum_assinantes_origem";`)
}

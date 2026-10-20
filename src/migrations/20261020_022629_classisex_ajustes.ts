import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * ClassiSex adjustments, client choices of 2026-10-20 (04-CONTEXT "Revisão 2026-10-20"):
 * - ads.apelido (required): existing ads get the placeholder 'Anônimo' until the owner edits them
 * - ads.contato_email dropped (WhatsApp and Telegram only)
 * - "Eu sou" options by type: Solteira → Mulher, Solteiro → Homem (ids kept, so ads keep their
 *   reference), plus Trans. Idempotent and never overwrites a staff-made option with the same name.
 */
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ads" ADD COLUMN "apelido" varchar;
  UPDATE "ads" SET "apelido" = 'Anônimo' WHERE "apelido" IS NULL;
  ALTER TABLE "ads" ALTER COLUMN "apelido" SET NOT NULL;
  ALTER TABLE "ads" DROP COLUMN "contato_email";

  UPDATE "ad_categories" SET "name" = 'Mulher', "order" = 1, "updated_at" = now()
   WHERE "name" = 'Solteira' AND NOT EXISTS (SELECT 1 FROM "ad_categories" WHERE "name" = 'Mulher');
  UPDATE "ad_categories" SET "name" = 'Homem', "order" = 2, "updated_at" = now()
   WHERE "name" = 'Solteiro' AND NOT EXISTS (SELECT 1 FROM "ad_categories" WHERE "name" = 'Homem');
  INSERT INTO "ad_categories" ("name", "order", "active")
   SELECT 'Trans', 3, true WHERE NOT EXISTS (SELECT 1 FROM "ad_categories" WHERE "name" = 'Trans');`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The renamed options and 'Trans' stay (ads may already point to them); only the schema is undone.
  await db.execute(sql`
   ALTER TABLE "ads" ADD COLUMN "contato_email" varchar;
  ALTER TABLE "ads" DROP COLUMN "apelido";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ads" ALTER COLUMN "author_id" DROP NOT NULL;
  ALTER TABLE "ad_media" ALTER COLUMN "owner_id" DROP NOT NULL;
  -- Ads sent without an account no longer belong to the technical "Visitantes" account (client decision 2026-10-24)
  UPDATE "ad_media" SET "owner_id" = NULL WHERE "ad_id" IN (SELECT "id" FROM "ads" WHERE "enviado_sem_conta" = true);
  UPDATE "ads" SET "author_id" = NULL WHERE "enviado_sem_conta" = true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // Author-less rows go back to the technical account when it exists; NOT NULL is restored only if none is left
  await db.execute(sql`
   UPDATE "ads" SET "author_id" = (SELECT "id" FROM "assinantes" WHERE "email" = 'visitantes@invalid.paraiso.local' LIMIT 1)
    WHERE "author_id" IS NULL;
  UPDATE "ad_media" SET "owner_id" = (SELECT "author_id" FROM "ads" WHERE "ads"."id" = "ad_media"."ad_id")
    WHERE "owner_id" IS NULL;
  ALTER TABLE "ads" ALTER COLUMN "author_id" SET NOT NULL;
  ALTER TABLE "ad_media" ALTER COLUMN "owner_id" SET NOT NULL;`)
}

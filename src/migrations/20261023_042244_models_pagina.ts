import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { backfillModelSlugs } from '../lib/gallery/model-slug'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "models" ADD COLUMN "slug" varchar;
  ALTER TABLE "models" ADD COLUMN "description" varchar;
  ALTER TABLE "_models_v" ADD COLUMN "version_slug" varchar;
  ALTER TABLE "_models_v" ADD COLUMN "version_description" varchar;
  CREATE UNIQUE INDEX "models_slug_idx" ON "models" USING btree ("slug");
  CREATE INDEX "_models_v_version_version_slug_idx" ON "_models_v" USING btree ("version_slug");`)
  // Models created before the page existed get their address from the name (no staff rework)
  await backfillModelSlugs(db)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "models_slug_idx";
  DROP INDEX "_models_v_version_version_slug_idx";
  ALTER TABLE "models" DROP COLUMN "slug";
  ALTER TABLE "models" DROP COLUMN "description";
  ALTER TABLE "_models_v" DROP COLUMN "version_slug";
  ALTER TABLE "_models_v" DROP COLUMN "version_description";`)
}

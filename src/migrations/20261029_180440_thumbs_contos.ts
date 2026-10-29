import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "sizes_thumb_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb_filename" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb2x_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb2x_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb2x_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb2x_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb2x_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_thumb2x_filename" varchar;
  CREATE INDEX "media_sizes_thumb_sizes_thumb_filename_idx" ON "media" USING btree ("sizes_thumb_filename");
  CREATE INDEX "media_sizes_thumb2x_sizes_thumb2x_filename_idx" ON "media" USING btree ("sizes_thumb2x_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "media_sizes_thumb_sizes_thumb_filename_idx";
  DROP INDEX "media_sizes_thumb2x_sizes_thumb2x_filename_idx";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb_filename";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb2x_url";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb2x_width";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb2x_height";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb2x_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb2x_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_thumb2x_filename";`)
}

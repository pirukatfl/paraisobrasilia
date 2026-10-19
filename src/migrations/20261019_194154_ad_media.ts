import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ad_media_kind" AS ENUM('foto', 'video');
  CREATE TABLE "ad_media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ad_id" integer NOT NULL,
  	"owner_id" integer NOT NULL,
  	"kind" "enum_ad_media_kind" NOT NULL,
  	"order" numeric DEFAULT 0,
  	"duration_seconds" numeric,
  	"previa" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ad_media_id" integer;
  ALTER TABLE "ad_media" ADD CONSTRAINT "ad_media_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_media" ADD CONSTRAINT "ad_media_owner_id_assinantes_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "ad_media_ad_idx" ON "ad_media" USING btree ("ad_id");
  CREATE INDEX "ad_media_owner_idx" ON "ad_media" USING btree ("owner_id");
  CREATE INDEX "ad_media_updated_at_idx" ON "ad_media" USING btree ("updated_at");
  CREATE INDEX "ad_media_created_at_idx" ON "ad_media" USING btree ("created_at");
  CREATE UNIQUE INDEX "ad_media_filename_idx" ON "ad_media" USING btree ("filename");
  CREATE INDEX "ad_media_sizes_card_sizes_card_filename_idx" ON "ad_media" USING btree ("sizes_card_filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ad_media_fk" FOREIGN KEY ("ad_media_id") REFERENCES "public"."ad_media"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ad_media_id_idx" ON "payload_locked_documents_rels" USING btree ("ad_media_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ad_media" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ad_media" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ad_media_fk";
  
  DROP INDEX "payload_locked_documents_rels_ad_media_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ad_media_id";
  DROP TYPE "public"."enum_ad_media_kind";`)
}

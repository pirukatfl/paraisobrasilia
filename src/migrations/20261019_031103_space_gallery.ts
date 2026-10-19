import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_space_items_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum_space_items_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__space_items_v_version_kind" AS ENUM('photo', 'video');
  CREATE TYPE "public"."enum__space_items_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"poster_id" integer NOT NULL,
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
  	"focal_y" numeric
  );
  
  CREATE TABLE "space_items" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum_space_items_kind" DEFAULT 'photo',
  	"image_id" integer,
  	"video_id" integer,
  	"caption" varchar,
  	"order" numeric DEFAULT 0,
  	"image_authorization_date" timestamp(3) with time zone,
  	"image_authorization_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_space_items_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_space_items_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_kind" "enum__space_items_v_version_kind" DEFAULT 'photo',
  	"version_image_id" integer,
  	"version_video_id" integer,
  	"version_caption" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_image_authorization_date" timestamp(3) with time zone,
  	"version_image_authorization_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__space_items_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_url" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_width" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_height" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_mime_type" varchar;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_filesize" numeric;
  ALTER TABLE "media" ADD COLUMN "sizes_gallery_filename" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "videos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "space_items_id" integer;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_poster_id_media_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "space_items" ADD CONSTRAINT "space_items_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "space_items" ADD CONSTRAINT "space_items_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_space_items_v" ADD CONSTRAINT "_space_items_v_parent_id_space_items_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."space_items"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_space_items_v" ADD CONSTRAINT "_space_items_v_version_image_id_media_id_fk" FOREIGN KEY ("version_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_space_items_v" ADD CONSTRAINT "_space_items_v_version_video_id_videos_id_fk" FOREIGN KEY ("version_video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "videos_poster_idx" ON "videos" USING btree ("poster_id");
  CREATE INDEX "videos_updated_at_idx" ON "videos" USING btree ("updated_at");
  CREATE INDEX "videos_created_at_idx" ON "videos" USING btree ("created_at");
  CREATE UNIQUE INDEX "videos_filename_idx" ON "videos" USING btree ("filename");
  CREATE INDEX "space_items_image_idx" ON "space_items" USING btree ("image_id");
  CREATE INDEX "space_items_video_idx" ON "space_items" USING btree ("video_id");
  CREATE INDEX "space_items_updated_at_idx" ON "space_items" USING btree ("updated_at");
  CREATE INDEX "space_items_created_at_idx" ON "space_items" USING btree ("created_at");
  CREATE INDEX "space_items__status_idx" ON "space_items" USING btree ("_status");
  CREATE INDEX "_space_items_v_parent_idx" ON "_space_items_v" USING btree ("parent_id");
  CREATE INDEX "_space_items_v_version_version_image_idx" ON "_space_items_v" USING btree ("version_image_id");
  CREATE INDEX "_space_items_v_version_version_video_idx" ON "_space_items_v" USING btree ("version_video_id");
  CREATE INDEX "_space_items_v_version_version_updated_at_idx" ON "_space_items_v" USING btree ("version_updated_at");
  CREATE INDEX "_space_items_v_version_version_created_at_idx" ON "_space_items_v" USING btree ("version_created_at");
  CREATE INDEX "_space_items_v_version_version__status_idx" ON "_space_items_v" USING btree ("version__status");
  CREATE INDEX "_space_items_v_created_at_idx" ON "_space_items_v" USING btree ("created_at");
  CREATE INDEX "_space_items_v_updated_at_idx" ON "_space_items_v" USING btree ("updated_at");
  CREATE INDEX "_space_items_v_latest_idx" ON "_space_items_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_videos_fk" FOREIGN KEY ("videos_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_space_items_fk" FOREIGN KEY ("space_items_id") REFERENCES "public"."space_items"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "media_sizes_gallery_sizes_gallery_filename_idx" ON "media" USING btree ("sizes_gallery_filename");
  CREATE INDEX "payload_locked_documents_rels_videos_id_idx" ON "payload_locked_documents_rels" USING btree ("videos_id");
  CREATE INDEX "payload_locked_documents_rels_space_items_id_idx" ON "payload_locked_documents_rels" USING btree ("space_items_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "videos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "space_items" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_space_items_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "videos" CASCADE;
  DROP TABLE "space_items" CASCADE;
  DROP TABLE "_space_items_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_videos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_space_items_fk";
  
  DROP INDEX "media_sizes_gallery_sizes_gallery_filename_idx";
  DROP INDEX "payload_locked_documents_rels_videos_id_idx";
  DROP INDEX "payload_locked_documents_rels_space_items_id_idx";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_url";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_width";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_height";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_mime_type";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_filesize";
  ALTER TABLE "media" DROP COLUMN "sizes_gallery_filename";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "videos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "space_items_id";
  DROP TYPE "public"."enum_space_items_kind";
  DROP TYPE "public"."enum_space_items_status";
  DROP TYPE "public"."enum__space_items_v_version_kind";
  DROP TYPE "public"."enum__space_items_v_version_status";`)
}

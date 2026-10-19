import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_models_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__models_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "models_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"image_id" integer
  );
  
  CREATE TABLE "models" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"order" numeric DEFAULT 0,
  	"image_authorization_date" timestamp(3) with time zone,
  	"image_authorization_note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_models_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_models_v_version_photos" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"image_id" integer,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_models_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_name" varchar,
  	"version_order" numeric DEFAULT 0,
  	"version_image_authorization_date" timestamp(3) with time zone,
  	"version_image_authorization_note" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__models_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "models_id" integer;
  ALTER TABLE "models_photos" ADD CONSTRAINT "models_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "models_photos" ADD CONSTRAINT "models_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_models_v_version_photos" ADD CONSTRAINT "_models_v_version_photos_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_models_v_version_photos" ADD CONSTRAINT "_models_v_version_photos_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_models_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_models_v" ADD CONSTRAINT "_models_v_parent_id_models_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "models_photos_order_idx" ON "models_photos" USING btree ("_order");
  CREATE INDEX "models_photos_parent_id_idx" ON "models_photos" USING btree ("_parent_id");
  CREATE INDEX "models_photos_image_idx" ON "models_photos" USING btree ("image_id");
  CREATE INDEX "models_updated_at_idx" ON "models" USING btree ("updated_at");
  CREATE INDEX "models_created_at_idx" ON "models" USING btree ("created_at");
  CREATE INDEX "models__status_idx" ON "models" USING btree ("_status");
  CREATE INDEX "_models_v_version_photos_order_idx" ON "_models_v_version_photos" USING btree ("_order");
  CREATE INDEX "_models_v_version_photos_parent_id_idx" ON "_models_v_version_photos" USING btree ("_parent_id");
  CREATE INDEX "_models_v_version_photos_image_idx" ON "_models_v_version_photos" USING btree ("image_id");
  CREATE INDEX "_models_v_parent_idx" ON "_models_v" USING btree ("parent_id");
  CREATE INDEX "_models_v_version_version_updated_at_idx" ON "_models_v" USING btree ("version_updated_at");
  CREATE INDEX "_models_v_version_version_created_at_idx" ON "_models_v" USING btree ("version_created_at");
  CREATE INDEX "_models_v_version_version__status_idx" ON "_models_v" USING btree ("version__status");
  CREATE INDEX "_models_v_created_at_idx" ON "_models_v" USING btree ("created_at");
  CREATE INDEX "_models_v_updated_at_idx" ON "_models_v" USING btree ("updated_at");
  CREATE INDEX "_models_v_latest_idx" ON "_models_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_models_fk" FOREIGN KEY ("models_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_models_id_idx" ON "payload_locked_documents_rels" USING btree ("models_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "models_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "models" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_models_v_version_photos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_models_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "models_photos" CASCADE;
  DROP TABLE "models" CASCADE;
  DROP TABLE "_models_v_version_photos" CASCADE;
  DROP TABLE "_models_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_models_fk";
  
  DROP INDEX "payload_locked_documents_rels_models_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "models_id";
  DROP TYPE "public"."enum_models_status";
  DROP TYPE "public"."enum__models_v_version_status";`)
}

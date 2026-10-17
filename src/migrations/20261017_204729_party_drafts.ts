import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_parties_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__parties_v_version_attractions_kind" AS ENUM('dj', 'show', 'modelo', 'outro');
  CREATE TYPE "public"."enum__parties_v_version_flyer_format" AS ENUM('square', 'portrait');
  CREATE TYPE "public"."enum__parties_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "_parties_v_version_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"value" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_parties_v_version_attractions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"kind" "enum__parties_v_version_attractions_kind",
  	"name" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_parties_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_starts_at" timestamp(3) with time zone,
  	"version_ends_at" timestamp(3) with time zone,
  	"version_flyer_id" integer,
  	"version_flyer_format" "enum__parties_v_version_flyer_format" DEFAULT 'portrait',
  	"version_summary" varchar,
  	"version_dress_code" varchar,
  	"version_details" jsonb,
  	"version_meta_title" varchar,
  	"version_meta_description" varchar,
  	"version_meta_image_id" integer,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__parties_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "parties_prices" ALTER COLUMN "label" DROP NOT NULL;
  ALTER TABLE "parties_attractions" ALTER COLUMN "kind" DROP NOT NULL;
  ALTER TABLE "parties_attractions" ALTER COLUMN "name" DROP NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "title" DROP NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "slug" DROP NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "starts_at" DROP NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "flyer_id" DROP NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "flyer_format" DROP NOT NULL;
  ALTER TABLE "parties" ADD COLUMN "_status" "enum_parties_status" DEFAULT 'draft';
  ALTER TABLE "_parties_v_version_prices" ADD CONSTRAINT "_parties_v_version_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_parties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_parties_v_version_attractions" ADD CONSTRAINT "_parties_v_version_attractions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_parties_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_parties_v" ADD CONSTRAINT "_parties_v_parent_id_parties_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."parties"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_parties_v" ADD CONSTRAINT "_parties_v_version_flyer_id_media_id_fk" FOREIGN KEY ("version_flyer_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_parties_v" ADD CONSTRAINT "_parties_v_version_meta_image_id_media_id_fk" FOREIGN KEY ("version_meta_image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "_parties_v_version_prices_order_idx" ON "_parties_v_version_prices" USING btree ("_order");
  CREATE INDEX "_parties_v_version_prices_parent_id_idx" ON "_parties_v_version_prices" USING btree ("_parent_id");
  CREATE INDEX "_parties_v_version_attractions_order_idx" ON "_parties_v_version_attractions" USING btree ("_order");
  CREATE INDEX "_parties_v_version_attractions_parent_id_idx" ON "_parties_v_version_attractions" USING btree ("_parent_id");
  CREATE INDEX "_parties_v_parent_idx" ON "_parties_v" USING btree ("parent_id");
  CREATE INDEX "_parties_v_version_version_slug_idx" ON "_parties_v" USING btree ("version_slug");
  CREATE INDEX "_parties_v_version_version_flyer_idx" ON "_parties_v" USING btree ("version_flyer_id");
  CREATE INDEX "_parties_v_version_meta_version_meta_image_idx" ON "_parties_v" USING btree ("version_meta_image_id");
  CREATE INDEX "_parties_v_version_version_updated_at_idx" ON "_parties_v" USING btree ("version_updated_at");
  CREATE INDEX "_parties_v_version_version_created_at_idx" ON "_parties_v" USING btree ("version_created_at");
  CREATE INDEX "_parties_v_version_version__status_idx" ON "_parties_v" USING btree ("version__status");
  CREATE INDEX "_parties_v_created_at_idx" ON "_parties_v" USING btree ("created_at");
  CREATE INDEX "_parties_v_updated_at_idx" ON "_parties_v" USING btree ("updated_at");
  CREATE INDEX "_parties_v_latest_idx" ON "_parties_v" USING btree ("latest");
  CREATE INDEX "parties__status_idx" ON "parties" USING btree ("_status");`)

  // Parties created before drafts existed were live on the site: keep them published.
  await db.execute(sql`UPDATE "parties" SET "_status" = 'published';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "_parties_v_version_prices" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_parties_v_version_attractions" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_parties_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "_parties_v_version_prices" CASCADE;
  DROP TABLE "_parties_v_version_attractions" CASCADE;
  DROP TABLE "_parties_v" CASCADE;
  DROP INDEX "parties__status_idx";
  ALTER TABLE "parties_prices" ALTER COLUMN "label" SET NOT NULL;
  ALTER TABLE "parties_attractions" ALTER COLUMN "kind" SET NOT NULL;
  ALTER TABLE "parties_attractions" ALTER COLUMN "name" SET NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "title" SET NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "slug" SET NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "starts_at" SET NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "flyer_id" SET NOT NULL;
  ALTER TABLE "parties" ALTER COLUMN "flyer_format" SET NOT NULL;
  ALTER TABLE "parties" DROP COLUMN "_status";
  DROP TYPE "public"."enum_parties_status";
  DROP TYPE "public"."enum__parties_v_version_attractions_kind";
  DROP TYPE "public"."enum__parties_v_version_flyer_format";
  DROP TYPE "public"."enum__parties_v_version_status";`)
}

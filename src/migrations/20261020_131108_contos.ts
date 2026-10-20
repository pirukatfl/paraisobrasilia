import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_contos_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__contos_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "contos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"texto" jsonb,
  	"paragrafos_abertos" numeric DEFAULT 3,
  	"wp_id" numeric,
  	"wp_slug" varchar,
  	"wp_restrito" boolean,
  	"importado_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_contos_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_contos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_texto" jsonb,
  	"version_paragrafos_abertos" numeric DEFAULT 3,
  	"version_wp_id" numeric,
  	"version_wp_slug" varchar,
  	"version_wp_restrito" boolean,
  	"version_importado_em" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__contos_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "contos_id" integer;
  ALTER TABLE "_contos_v" ADD CONSTRAINT "_contos_v_parent_id_contos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."contos"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "contos_slug_idx" ON "contos" USING btree ("slug");
  CREATE INDEX "contos_published_at_idx" ON "contos" USING btree ("published_at");
  CREATE UNIQUE INDEX "contos_wp_id_idx" ON "contos" USING btree ("wp_id");
  CREATE INDEX "contos_updated_at_idx" ON "contos" USING btree ("updated_at");
  CREATE INDEX "contos_created_at_idx" ON "contos" USING btree ("created_at");
  CREATE INDEX "contos__status_idx" ON "contos" USING btree ("_status");
  CREATE INDEX "_contos_v_parent_idx" ON "_contos_v" USING btree ("parent_id");
  CREATE INDEX "_contos_v_version_version_slug_idx" ON "_contos_v" USING btree ("version_slug");
  CREATE INDEX "_contos_v_version_version_published_at_idx" ON "_contos_v" USING btree ("version_published_at");
  CREATE INDEX "_contos_v_version_version_wp_id_idx" ON "_contos_v" USING btree ("version_wp_id");
  CREATE INDEX "_contos_v_version_version_updated_at_idx" ON "_contos_v" USING btree ("version_updated_at");
  CREATE INDEX "_contos_v_version_version_created_at_idx" ON "_contos_v" USING btree ("version_created_at");
  CREATE INDEX "_contos_v_version_version__status_idx" ON "_contos_v" USING btree ("version__status");
  CREATE INDEX "_contos_v_created_at_idx" ON "_contos_v" USING btree ("created_at");
  CREATE INDEX "_contos_v_updated_at_idx" ON "_contos_v" USING btree ("updated_at");
  CREATE INDEX "_contos_v_latest_idx" ON "_contos_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_contos_fk" FOREIGN KEY ("contos_id") REFERENCES "public"."contos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_contos_id_idx" ON "payload_locked_documents_rels" USING btree ("contos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_contos_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "contos" CASCADE;
  DROP TABLE "_contos_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_contos_fk";
  
  DROP INDEX "payload_locked_documents_rels_contos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "contos_id";
  DROP TYPE "public"."enum_contos_status";
  DROP TYPE "public"."enum__contos_v_version_status";`)
}

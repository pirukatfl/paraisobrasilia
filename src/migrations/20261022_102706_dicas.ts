import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_dicas_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__dicas_v_version_status" AS ENUM('draft', 'published');
  CREATE TABLE "dicas" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"published_at" timestamp(3) with time zone,
  	"resumo" varchar,
  	"capa_id" integer,
  	"capa_conferida" boolean DEFAULT true,
  	"texto" jsonb,
  	"revisar" boolean DEFAULT false,
  	"wp_id" numeric,
  	"wp_slug" varchar,
  	"importado_em" timestamp(3) with time zone,
  	"capa_importada_em" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_dicas_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_dicas_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_published_at" timestamp(3) with time zone,
  	"version_resumo" varchar,
  	"version_capa_id" integer,
  	"version_capa_conferida" boolean DEFAULT true,
  	"version_texto" jsonb,
  	"version_revisar" boolean DEFAULT false,
  	"version_wp_id" numeric,
  	"version_wp_slug" varchar,
  	"version_importado_em" timestamp(3) with time zone,
  	"version_capa_importada_em" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__dicas_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "dicas_id" integer;
  ALTER TABLE "dicas" ADD CONSTRAINT "dicas_capa_id_media_id_fk" FOREIGN KEY ("capa_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dicas_v" ADD CONSTRAINT "_dicas_v_parent_id_dicas_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."dicas"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_dicas_v" ADD CONSTRAINT "_dicas_v_version_capa_id_media_id_fk" FOREIGN KEY ("version_capa_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "dicas_slug_idx" ON "dicas" USING btree ("slug");
  CREATE INDEX "dicas_published_at_idx" ON "dicas" USING btree ("published_at");
  CREATE INDEX "dicas_capa_idx" ON "dicas" USING btree ("capa_id");
  CREATE UNIQUE INDEX "dicas_wp_id_idx" ON "dicas" USING btree ("wp_id");
  CREATE INDEX "dicas_updated_at_idx" ON "dicas" USING btree ("updated_at");
  CREATE INDEX "dicas_created_at_idx" ON "dicas" USING btree ("created_at");
  CREATE INDEX "dicas__status_idx" ON "dicas" USING btree ("_status");
  CREATE INDEX "_dicas_v_parent_idx" ON "_dicas_v" USING btree ("parent_id");
  CREATE INDEX "_dicas_v_version_version_slug_idx" ON "_dicas_v" USING btree ("version_slug");
  CREATE INDEX "_dicas_v_version_version_published_at_idx" ON "_dicas_v" USING btree ("version_published_at");
  CREATE INDEX "_dicas_v_version_version_capa_idx" ON "_dicas_v" USING btree ("version_capa_id");
  CREATE INDEX "_dicas_v_version_version_wp_id_idx" ON "_dicas_v" USING btree ("version_wp_id");
  CREATE INDEX "_dicas_v_version_version_updated_at_idx" ON "_dicas_v" USING btree ("version_updated_at");
  CREATE INDEX "_dicas_v_version_version_created_at_idx" ON "_dicas_v" USING btree ("version_created_at");
  CREATE INDEX "_dicas_v_version_version__status_idx" ON "_dicas_v" USING btree ("version__status");
  CREATE INDEX "_dicas_v_created_at_idx" ON "_dicas_v" USING btree ("created_at");
  CREATE INDEX "_dicas_v_updated_at_idx" ON "_dicas_v" USING btree ("updated_at");
  CREATE INDEX "_dicas_v_latest_idx" ON "_dicas_v" USING btree ("latest");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_dicas_fk" FOREIGN KEY ("dicas_id") REFERENCES "public"."dicas"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_dicas_id_idx" ON "payload_locked_documents_rels" USING btree ("dicas_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "dicas" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_dicas_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "dicas" CASCADE;
  DROP TABLE "_dicas_v" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_dicas_fk";
  
  DROP INDEX "payload_locked_documents_rels_dicas_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "dicas_id";
  DROP TYPE "public"."enum_dicas_status";
  DROP TYPE "public"."enum__dicas_v_version_status";`)
}

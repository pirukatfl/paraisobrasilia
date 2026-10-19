import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedAdCategoriesIfEmpty } from './seed/ad-categories-content'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ads_status" AS ENUM('pendente', 'aprovado', 'recusado', 'despublicado');
  CREATE TABLE "ad_categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"order" numeric DEFAULT 0,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ads" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"resumo" varchar,
  	"author_id" integer NOT NULL,
  	"eu_sou_id" integer NOT NULL,
  	"cidade" varchar,
  	"cidade_busca" varchar,
  	"texto" varchar NOT NULL,
  	"contato_whatsapp" varchar,
  	"contato_telegram" varchar,
  	"contato_email" varchar,
  	"status" "enum_ads_status" DEFAULT 'pendente' NOT NULL,
  	"motivo" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"published_at" timestamp(3) with time zone,
  	"moderated_at" timestamp(3) with time zone,
  	"moderated_by_id" integer,
  	"consent_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ad_categories_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ads_id" integer;
  ALTER TABLE "ads" ADD CONSTRAINT "ads_author_id_assinantes_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ads" ADD CONSTRAINT "ads_eu_sou_id_ad_categories_id_fk" FOREIGN KEY ("eu_sou_id") REFERENCES "public"."ad_categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ads" ADD CONSTRAINT "ads_moderated_by_id_users_id_fk" FOREIGN KEY ("moderated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "ad_categories_name_idx" ON "ad_categories" USING btree ("name");
  CREATE INDEX "ad_categories_updated_at_idx" ON "ad_categories" USING btree ("updated_at");
  CREATE INDEX "ad_categories_created_at_idx" ON "ad_categories" USING btree ("created_at");
  CREATE INDEX "ads_author_idx" ON "ads" USING btree ("author_id");
  CREATE INDEX "ads_eu_sou_idx" ON "ads" USING btree ("eu_sou_id");
  CREATE INDEX "ads_cidade_busca_idx" ON "ads" USING btree ("cidade_busca");
  CREATE INDEX "ads_status_idx" ON "ads" USING btree ("status");
  CREATE INDEX "ads_submitted_at_idx" ON "ads" USING btree ("submitted_at");
  CREATE INDEX "ads_published_at_idx" ON "ads" USING btree ("published_at");
  CREATE INDEX "ads_moderated_by_idx" ON "ads" USING btree ("moderated_by_id");
  CREATE INDEX "ads_updated_at_idx" ON "ads" USING btree ("updated_at");
  CREATE INDEX "ads_created_at_idx" ON "ads" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ad_categories_fk" FOREIGN KEY ("ad_categories_id") REFERENCES "public"."ad_categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ads_fk" FOREIGN KEY ("ads_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ad_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("ad_categories_id");
  CREATE INDEX "payload_locked_documents_rels_ads_id_idx" ON "payload_locked_documents_rels" USING btree ("ads_id");`)

  // D-01: Eu sou options (Casal, Solteiro, Solteira), only when the collection is empty.
  await seedAdCategoriesIfEmpty(payload, req)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ad_categories" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "ads" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ad_categories" CASCADE;
  DROP TABLE "ads" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ad_categories_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ads_fk";
  
  DROP INDEX "payload_locked_documents_rels_ad_categories_id_idx";
  DROP INDEX "payload_locked_documents_rels_ads_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ad_categories_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ads_id";
  DROP TYPE "public"."enum_ads_status";`)
}

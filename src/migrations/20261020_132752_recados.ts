import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_recados_status" AS ENUM('pendente', 'aprovado', 'recusado', 'despublicado');
  CREATE TABLE "recados" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"resumo" varchar,
  	"author_id" integer NOT NULL,
  	"apelido" varchar NOT NULL,
  	"texto" varchar NOT NULL,
  	"contatos_removidos" numeric DEFAULT 0,
  	"status" "enum_recados_status" DEFAULT 'pendente' NOT NULL,
  	"motivo" varchar,
  	"submitted_at" timestamp(3) with time zone,
  	"published_at" timestamp(3) with time zone,
  	"moderated_at" timestamp(3) with time zone,
  	"moderated_by_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "assinantes" ADD COLUMN "apelido" varchar;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "recados_id" integer;
  ALTER TABLE "recados" ADD CONSTRAINT "recados_author_id_assinantes_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "recados" ADD CONSTRAINT "recados_moderated_by_id_users_id_fk" FOREIGN KEY ("moderated_by_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "recados_author_idx" ON "recados" USING btree ("author_id");
  CREATE INDEX "recados_status_idx" ON "recados" USING btree ("status");
  CREATE INDEX "recados_submitted_at_idx" ON "recados" USING btree ("submitted_at");
  CREATE INDEX "recados_published_at_idx" ON "recados" USING btree ("published_at");
  CREATE INDEX "recados_moderated_by_idx" ON "recados" USING btree ("moderated_by_id");
  CREATE INDEX "recados_updated_at_idx" ON "recados" USING btree ("updated_at");
  CREATE INDEX "recados_created_at_idx" ON "recados" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_recados_fk" FOREIGN KEY ("recados_id") REFERENCES "public"."recados"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_recados_id_idx" ON "payload_locked_documents_rels" USING btree ("recados_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "recados" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "recados" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_recados_fk";
  
  DROP INDEX "payload_locked_documents_rels_recados_id_idx";
  ALTER TABLE "assinantes" DROP COLUMN "apelido";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "recados_id";
  DROP TYPE "public"."enum_recados_status";`)
}

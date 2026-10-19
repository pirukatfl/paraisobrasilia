import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante');
  CREATE TYPE "public"."enum_audit_log_actor_type" AS ENUM('equipe', 'assinante', 'sistema');
  CREATE TABLE "audit_log" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"action" "enum_audit_log_action" NOT NULL,
  	"actor_type" "enum_audit_log_actor_type" DEFAULT 'sistema' NOT NULL,
  	"actor_id" integer,
  	"actor_label" varchar,
  	"assinante_id" integer,
  	"assinante_label" varchar,
  	"summary" varchar,
  	"details" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "audit_log_id" integer;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_assinante_id_assinantes_id_fk" FOREIGN KEY ("assinante_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "audit_log_actor_idx" ON "audit_log" USING btree ("actor_id");
  CREATE INDEX "audit_log_assinante_idx" ON "audit_log" USING btree ("assinante_id");
  CREATE INDEX "audit_log_updated_at_idx" ON "audit_log" USING btree ("updated_at");
  CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_audit_log_fk" FOREIGN KEY ("audit_log_id") REFERENCES "public"."audit_log"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_audit_log_id_idx" ON "payload_locked_documents_rels" USING btree ("audit_log_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_log" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "audit_log" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_audit_log_fk";
  
  DROP INDEX "payload_locked_documents_rels_audit_log_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "audit_log_id";
  DROP TYPE "public"."enum_audit_log_action";
  DROP TYPE "public"."enum_audit_log_actor_type";`)
}

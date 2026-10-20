import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_message_reports_motivo" AS ENUM('assedio', 'golpe-ou-cobranca', 'ofensivo', 'menor-de-idade', 'spam', 'outro');
  CREATE TYPE "public"."enum_message_reports_status" AS ENUM('aberta', 'resolvida', 'descartada');
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'denuncia-mensagem-resolvida';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'mensagens-suspensas';
  CREATE TABLE "blocks" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"blocker_id" integer NOT NULL,
  	"blocked_id" integer NOT NULL,
  	"pair_key" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "message_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"conversation_id" numeric,
  	"reported_apelido" varchar,
  	"reported_id" integer,
  	"reporter_id" integer,
  	"motivo" "enum_message_reports_motivo" NOT NULL,
  	"detalhes" varchar,
  	"mensagens" varchar,
  	"urgente" boolean DEFAULT false,
  	"status" "enum_message_reports_status" DEFAULT 'aberta' NOT NULL,
  	"resolvida_por_id" integer,
  	"resolvida_em" timestamp(3) with time zone,
  	"nota" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "assinantes" ADD COLUMN "mensagens_suspensas" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "blocks_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "message_reports_id" integer;
  ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_id_assinantes_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_id_assinantes_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reported_id_assinantes_id_fk" FOREIGN KEY ("reported_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_reporter_id_assinantes_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "message_reports" ADD CONSTRAINT "message_reports_resolvida_por_id_users_id_fk" FOREIGN KEY ("resolvida_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "blocks_blocker_idx" ON "blocks" USING btree ("blocker_id");
  CREATE INDEX "blocks_blocked_idx" ON "blocks" USING btree ("blocked_id");
  CREATE UNIQUE INDEX "blocks_pair_key_idx" ON "blocks" USING btree ("pair_key");
  CREATE INDEX "blocks_updated_at_idx" ON "blocks" USING btree ("updated_at");
  CREATE INDEX "blocks_created_at_idx" ON "blocks" USING btree ("created_at");
  CREATE INDEX "message_reports_reported_idx" ON "message_reports" USING btree ("reported_id");
  CREATE INDEX "message_reports_reporter_idx" ON "message_reports" USING btree ("reporter_id");
  CREATE INDEX "message_reports_urgente_idx" ON "message_reports" USING btree ("urgente");
  CREATE INDEX "message_reports_status_idx" ON "message_reports" USING btree ("status");
  CREATE INDEX "message_reports_resolvida_por_idx" ON "message_reports" USING btree ("resolvida_por_id");
  CREATE INDEX "message_reports_updated_at_idx" ON "message_reports" USING btree ("updated_at");
  CREATE INDEX "message_reports_created_at_idx" ON "message_reports" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_blocks_fk" FOREIGN KEY ("blocks_id") REFERENCES "public"."blocks"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_message_reports_fk" FOREIGN KEY ("message_reports_id") REFERENCES "public"."message_reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_blocks_id_idx" ON "payload_locked_documents_rels" USING btree ("blocks_id");
  CREATE INDEX "payload_locked_documents_rels_message_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("message_reports_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "blocks" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "message_reports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "blocks" CASCADE;
  DROP TABLE "message_reports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_blocks_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_message_reports_fk";
  
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante', 'anuncio-aprovado', 'anuncio-recusado', 'anuncio-despublicado', 'denuncia-resolvida', 'recado-aprovado', 'recado-recusado', 'recado-despublicado');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  DROP INDEX "payload_locked_documents_rels_blocks_id_idx";
  DROP INDEX "payload_locked_documents_rels_message_reports_id_idx";
  ALTER TABLE "assinantes" DROP COLUMN "mensagens_suspensas";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "blocks_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "message_reports_id";
  DROP TYPE "public"."enum_message_reports_motivo";
  DROP TYPE "public"."enum_message_reports_status";`)
}

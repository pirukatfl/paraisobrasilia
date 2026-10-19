import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ad_reports_motivo" AS ENUM('contato-falso', 'golpe-ou-cobranca', 'ofensivo', 'menor-de-idade', 'sem-autorizacao-de-imagem', 'outro');
  CREATE TYPE "public"."enum_ad_reports_status" AS ENUM('aberta', 'resolvida', 'descartada');
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'denuncia-resolvida';
  CREATE TABLE "ad_reports" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ad_id" integer,
  	"ad_snapshot" varchar,
  	"reporter_id" integer,
  	"motivo" "enum_ad_reports_motivo" NOT NULL,
  	"detalhes" varchar,
  	"urgente" boolean DEFAULT false,
  	"status" "enum_ad_reports_status" DEFAULT 'aberta' NOT NULL,
  	"resolvida_por_id" integer,
  	"resolvida_em" timestamp(3) with time zone,
  	"nota" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ad_reports_id" integer;
  ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_reporter_id_assinantes_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_reports" ADD CONSTRAINT "ad_reports_resolvida_por_id_users_id_fk" FOREIGN KEY ("resolvida_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "ad_reports_ad_idx" ON "ad_reports" USING btree ("ad_id");
  CREATE INDEX "ad_reports_reporter_idx" ON "ad_reports" USING btree ("reporter_id");
  CREATE INDEX "ad_reports_urgente_idx" ON "ad_reports" USING btree ("urgente");
  CREATE INDEX "ad_reports_status_idx" ON "ad_reports" USING btree ("status");
  CREATE INDEX "ad_reports_resolvida_por_idx" ON "ad_reports" USING btree ("resolvida_por_id");
  CREATE INDEX "ad_reports_updated_at_idx" ON "ad_reports" USING btree ("updated_at");
  CREATE INDEX "ad_reports_created_at_idx" ON "ad_reports" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ad_reports_fk" FOREIGN KEY ("ad_reports_id") REFERENCES "public"."ad_reports"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ad_reports_id_idx" ON "payload_locked_documents_rels" USING btree ("ad_reports_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ad_reports" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ad_reports" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_ad_reports_fk";
  
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante', 'anuncio-aprovado', 'anuncio-recusado', 'anuncio-despublicado');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  DROP INDEX "payload_locked_documents_rels_ad_reports_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ad_reports_id";
  DROP TYPE "public"."enum_ad_reports_motivo";
  DROP TYPE "public"."enum_ad_reports_status";`)
}

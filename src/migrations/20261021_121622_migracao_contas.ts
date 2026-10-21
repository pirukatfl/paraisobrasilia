import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_assinantes_origem" ADD VALUE 'site-antigo';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'conta-importada' BEFORE 'anuncio-aprovado';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'senha-migrada' BEFORE 'anuncio-aprovado';
  ALTER TABLE "assinantes" ADD COLUMN "wp_user_id" numeric;
  ALTER TABLE "assinantes" ADD COLUMN "importado_em" timestamp(3) with time zone;
  ALTER TABLE "assinantes" ADD COLUMN "legacy_password_hash" varchar;
  ALTER TABLE "assinantes" ADD COLUMN "revisar_assinatura_antiga" boolean DEFAULT false;
  CREATE UNIQUE INDEX "assinantes_wp_user_id_idx" ON "assinantes" USING btree ("wp_user_id");
  CREATE INDEX "assinantes_revisar_assinatura_antiga_idx" ON "assinantes" USING btree ("revisar_assinatura_antiga");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "assinantes" ALTER COLUMN "origem" SET DATA TYPE text;
  ALTER TABLE "assinantes" ALTER COLUMN "origem" SET DEFAULT 'equipe'::text;
  DROP TYPE "public"."enum_assinantes_origem";
  CREATE TYPE "public"."enum_assinantes_origem" AS ENUM('equipe', 'cadastro');
  ALTER TABLE "assinantes" ALTER COLUMN "origem" SET DEFAULT 'equipe'::"public"."enum_assinantes_origem";
  ALTER TABLE "assinantes" ALTER COLUMN "origem" SET DATA TYPE "public"."enum_assinantes_origem" USING "origem"::"public"."enum_assinantes_origem";
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante', 'anuncio-aprovado', 'anuncio-recusado', 'anuncio-despublicado', 'denuncia-resolvida', 'recado-aprovado', 'recado-recusado', 'recado-despublicado', 'denuncia-mensagem-resolvida', 'mensagens-suspensas');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  DROP INDEX "assinantes_wp_user_id_idx";
  DROP INDEX "assinantes_revisar_assinatura_antiga_idx";
  ALTER TABLE "assinantes" DROP COLUMN "wp_user_id";
  ALTER TABLE "assinantes" DROP COLUMN "importado_em";
  ALTER TABLE "assinantes" DROP COLUMN "legacy_password_hash";
  ALTER TABLE "assinantes" DROP COLUMN "revisar_assinatura_antiga";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ads_fonte_legado" AS ENUM('classisex', 'mural');
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'anuncio-legado-apagado' BEFORE 'denuncia-resolvida';
  ALTER TABLE "ads" ADD COLUMN "fonte_legado" "enum_ads_fonte_legado";
  CREATE INDEX "ads_fonte_legado_idx" ON "ads" USING btree ("fonte_legado");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante', 'conta-importada', 'senha-migrada', 'anuncio-aprovado', 'anuncio-recusado', 'anuncio-despublicado', 'denuncia-resolvida', 'recado-aprovado', 'recado-recusado', 'recado-despublicado', 'denuncia-mensagem-resolvida', 'mensagens-suspensas');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  DROP INDEX "ads_fonte_legado_idx";
  ALTER TABLE "ads" DROP COLUMN "fonte_legado";
  DROP TYPE "public"."enum_ads_fonte_legado";`)
}

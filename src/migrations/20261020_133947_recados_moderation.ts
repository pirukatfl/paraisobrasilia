import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'recado-aprovado';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'recado-recusado';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'recado-despublicado';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante', 'anuncio-aprovado', 'anuncio-recusado', 'anuncio-despublicado', 'denuncia-resolvida');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";`)
}

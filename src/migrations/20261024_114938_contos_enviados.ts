import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "media" ADD COLUMN "pendente" boolean DEFAULT false;
  ALTER TABLE "contos" ADD COLUMN "imagem_id" integer;
  ALTER TABLE "contos" ADD COLUMN "enviado_por_visitante" boolean DEFAULT false;
  ALTER TABLE "contos" ADD COLUMN "assinado_como" varchar;
  ALTER TABLE "contos" ADD COLUMN "email_visitante" varchar;
  ALTER TABLE "contos" ADD COLUMN "enviado_em" timestamp(3) with time zone;
  ALTER TABLE "_contos_v" ADD COLUMN "version_imagem_id" integer;
  ALTER TABLE "_contos_v" ADD COLUMN "version_enviado_por_visitante" boolean DEFAULT false;
  ALTER TABLE "_contos_v" ADD COLUMN "version_assinado_como" varchar;
  ALTER TABLE "_contos_v" ADD COLUMN "version_email_visitante" varchar;
  ALTER TABLE "_contos_v" ADD COLUMN "version_enviado_em" timestamp(3) with time zone;
  ALTER TABLE "contos" ADD CONSTRAINT "contos_imagem_id_media_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_contos_v" ADD CONSTRAINT "_contos_v_version_imagem_id_media_id_fk" FOREIGN KEY ("version_imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "media_pendente_idx" ON "media" USING btree ("pendente");
  CREATE INDEX "contos_imagem_idx" ON "contos" USING btree ("imagem_id");
  CREATE INDEX "_contos_v_version_version_imagem_idx" ON "_contos_v" USING btree ("version_imagem_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "contos" DROP CONSTRAINT "contos_imagem_id_media_id_fk";
  
  ALTER TABLE "_contos_v" DROP CONSTRAINT "_contos_v_version_imagem_id_media_id_fk";
  
  DROP INDEX "media_pendente_idx";
  DROP INDEX "contos_imagem_idx";
  DROP INDEX "_contos_v_version_version_imagem_idx";
  ALTER TABLE "media" DROP COLUMN "pendente";
  ALTER TABLE "contos" DROP COLUMN "imagem_id";
  ALTER TABLE "contos" DROP COLUMN "enviado_por_visitante";
  ALTER TABLE "contos" DROP COLUMN "assinado_como";
  ALTER TABLE "contos" DROP COLUMN "email_visitante";
  ALTER TABLE "contos" DROP COLUMN "enviado_em";
  ALTER TABLE "_contos_v" DROP COLUMN "version_imagem_id";
  ALTER TABLE "_contos_v" DROP COLUMN "version_enviado_por_visitante";
  ALTER TABLE "_contos_v" DROP COLUMN "version_assinado_como";
  ALTER TABLE "_contos_v" DROP COLUMN "version_email_visitante";
  ALTER TABLE "_contos_v" DROP COLUMN "version_enviado_em";`)
}

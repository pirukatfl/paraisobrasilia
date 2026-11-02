import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "promocao" ADD COLUMN "participar_ativo" boolean DEFAULT true;
  ALTER TABLE "promocao" ADD COLUMN "botao_participar" varchar DEFAULT 'Participar';
  ALTER TABLE "textos_inicio" ADD COLUMN "promocao_botao_fechar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Fechar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" DROP COLUMN "promocao_botao_contos";
  ALTER TABLE "textos_inicio" DROP COLUMN "promocao_botao_midia";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_inicio" ADD COLUMN "promocao_botao_contos" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviar contos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" ADD COLUMN "promocao_botao_midia" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviar fotos e vídeos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "promocao" DROP COLUMN "participar_ativo";
  ALTER TABLE "promocao" DROP COLUMN "botao_participar";
  ALTER TABLE "textos_inicio" DROP COLUMN "promocao_botao_fechar";`)
}

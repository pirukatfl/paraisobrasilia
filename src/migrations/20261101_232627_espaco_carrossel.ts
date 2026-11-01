import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_inicio" ADD COLUMN "espaco_carrossel" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Fotos do espaço","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" ADD COLUMN "espaco_anterior" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Foto anterior","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" ADD COLUMN "espaco_proxima" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Próxima foto","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" ADD COLUMN "espaco_ir_para" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Ir para a foto {n} de {total}","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" ADD COLUMN "espaco_pausar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Pausar a troca automática das fotos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_inicio" ADD COLUMN "espaco_retomar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Retomar a troca automática das fotos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_inicio" DROP COLUMN "espaco_carrossel";
  ALTER TABLE "textos_inicio" DROP COLUMN "espaco_anterior";
  ALTER TABLE "textos_inicio" DROP COLUMN "espaco_proxima";
  ALTER TABLE "textos_inicio" DROP COLUMN "espaco_ir_para";
  ALTER TABLE "textos_inicio" DROP COLUMN "espaco_pausar";
  ALTER TABLE "textos_inicio" DROP COLUMN "espaco_retomar";`)
}

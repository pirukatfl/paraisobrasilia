import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "envios_midia" ADD COLUMN "promocao" varchar;
  ALTER TABLE "envios_midia" ADD COLUMN "data_festa" varchar;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_quadro" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Participando da promoção: {titulo}","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_intro" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Preencha os dados, escolha as suas fotos e vídeos e envie. A equipe confere tudo e entra em contato. Nada vai para o site sem a sua autorização.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Participar da promoção","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "data_festa_rotulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Festa / data que pretende ir (opcional)","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "data_festa_ajuda" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Ex.: sábado, 14/11, ou o nome da festa.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_enviado_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Recebemos a sua participação","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_enviado_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Obrigado por participar! A equipe vai olhar os seus dados, fotos e vídeos e falar com você. Nada vai para o site sem a sua autorização.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  CREATE INDEX "envios_midia_promocao_idx" ON "envios_midia" USING btree ("promocao");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "envios_midia_promocao_idx";
  ALTER TABLE "envios_midia" DROP COLUMN "promocao";
  ALTER TABLE "envios_midia" DROP COLUMN "data_festa";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_quadro";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_intro";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_botao";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "data_festa_rotulo";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "data_festa_ajuda";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_enviado_titulo";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_enviado_texto";`)
}

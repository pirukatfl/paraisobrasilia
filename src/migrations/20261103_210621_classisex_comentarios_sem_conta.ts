import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ad_comments" ALTER COLUMN "author_id" DROP NOT NULL;
  ALTER TABLE "ad_comments" ADD COLUMN "sem_conta" boolean DEFAULT false;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_rotulo_nome" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Seu nome ou apelido","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_aviso_visitante" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Não escreva telefone, e-mail ou links: só assinantes veriam.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_marcador_visitante" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"visitante","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_tem_conta" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Tem conta?","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_tem_conta_link" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Entre para comentar com seu apelido","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  CREATE INDEX "ad_comments_sem_conta_idx" ON "ad_comments" USING btree ("sem_conta");
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_entrar_texto";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_entrar_botao";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_cadastro_botao";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "ad_comments_sem_conta_idx";
  ALTER TABLE "ad_comments" ALTER COLUMN "author_id" SET NOT NULL;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_entrar_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Entre ou crie sua conta grátis para comentar.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_entrar_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Entrar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_cadastro_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Criar conta grátis","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "ad_comments" DROP COLUMN "sem_conta";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_rotulo_nome";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_aviso_visitante";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_marcador_visitante";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_tem_conta";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_tem_conta_link";`)
}

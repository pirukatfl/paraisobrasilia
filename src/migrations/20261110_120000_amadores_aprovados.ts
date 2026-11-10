import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Fotos e vídeos aprovados dos envios do público vão para o site (pedido do cliente, 2026-11-10): arquivo
 * enviado ganha "Não mostrar no site", o menu ganha Galeria → Vídeos amadores e os textos novos nascem com o
 * texto original.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "envios_midia_arquivos" ADD COLUMN "oculto" boolean DEFAULT false;
  ALTER TYPE "public"."enum_menu_do_site_itens_ocultos" ADD VALUE 'galeria-videos-amadores' AFTER 'galeria-amadoras';
  ALTER TABLE "textos_geral" ADD COLUMN "menu_galeria_videos_amadores" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Vídeos amadores","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "fotos_frequentadores_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Fotos dos frequentadores","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "fotos_frequentadores_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Fotos enviadas por quem frequenta a casa, com autorização de uso de imagem.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "fotos_frequentadores_enviar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Envie as suas fotos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Vídeos amadores","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_intro" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Vídeos enviados por quem frequenta a casa, aprovados pela equipe. Só assinantes dão o play.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_convite_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Só assinantes dão o play","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_convite_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Assine para assistir aos vídeos amadores. Já é assinante? Entre na sua conta.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_convite_texto_logado" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"A sua conta não tem assinatura ativa. Assine ou renove para assistir aos vídeos amadores.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_convite_assine" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Assine já","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_convite_entrar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Entrar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_vazio_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Ainda não há vídeos por aqui.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_vazio_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Os vídeos enviados pelo público aparecem aqui depois que a equipe aprova. Quer mandar o seu?","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "videos_vazio_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviar o meu vídeo","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_vazio_botao";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_vazio_texto";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_vazio_titulo";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_convite_entrar";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_convite_assine";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_convite_texto_logado";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_convite_texto";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_convite_titulo";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_intro";
  ALTER TABLE "textos_modelos" DROP COLUMN "videos_titulo";
  ALTER TABLE "textos_modelos" DROP COLUMN "fotos_frequentadores_enviar";
  ALTER TABLE "textos_modelos" DROP COLUMN "fotos_frequentadores_texto";
  ALTER TABLE "textos_modelos" DROP COLUMN "fotos_frequentadores_titulo";
  ALTER TABLE "textos_geral" DROP COLUMN "menu_galeria_videos_amadores";
  DELETE FROM "menu_do_site_itens_ocultos" WHERE "value" = 'galeria-videos-amadores';
  ALTER TABLE "menu_do_site_itens_ocultos" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_menu_do_site_itens_ocultos";
  CREATE TYPE "public"."enum_menu_do_site_itens_ocultos" AS ENUM('festas', 'quem-somos', 'normas', 'regras', 'dicas', 'espaco', 'galeria', 'galeria-profissionais', 'galeria-amadoras', 'classisex', 'contos', 'dicas-hot', 'contato', 'promocao', 'assine-ja', 'area-do-assinante', 'meus-anuncios', 'minha-assinatura', 'trocar-senha', 'link-externo');
  ALTER TABLE "menu_do_site_itens_ocultos" ALTER COLUMN "value" SET DATA TYPE "public"."enum_menu_do_site_itens_ocultos" USING "value"::"public"."enum_menu_do_site_itens_ocultos";
  ALTER TABLE "envios_midia_arquivos" DROP COLUMN "oculto";`)
}

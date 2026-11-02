import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TYPE "public"."enum_menu_do_site_itens_ocultos" ADD VALUE 'promocao' BEFORE 'assine-ja';
  ALTER TABLE "textos_geral" ADD COLUMN "menu_promocao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Promoção","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "menu_do_site_itens_ocultos" ALTER COLUMN "value" SET DATA TYPE text;
  DROP TYPE "public"."enum_menu_do_site_itens_ocultos";
  CREATE TYPE "public"."enum_menu_do_site_itens_ocultos" AS ENUM('festas', 'quem-somos', 'normas', 'regras', 'dicas', 'espaco', 'galeria', 'galeria-profissionais', 'galeria-amadoras', 'classisex', 'contos', 'dicas-hot', 'contato', 'assine-ja', 'area-do-assinante', 'meus-anuncios', 'minha-assinatura', 'trocar-senha', 'link-externo');
  ALTER TABLE "menu_do_site_itens_ocultos" ALTER COLUMN "value" SET DATA TYPE "public"."enum_menu_do_site_itens_ocultos" USING "value"::"public"."enum_menu_do_site_itens_ocultos";
  ALTER TABLE "textos_geral" DROP COLUMN "menu_promocao";`)
}

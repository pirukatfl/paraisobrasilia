import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_menu_do_site_itens_ocultos" AS ENUM('festas', 'quem-somos', 'normas', 'regras', 'dicas', 'espaco', 'galeria', 'galeria-profissionais', 'galeria-amadoras', 'classisex', 'contos', 'dicas-hot', 'contato', 'assine-ja', 'area-do-assinante', 'meus-anuncios', 'minha-assinatura', 'trocar-senha', 'link-externo');
  CREATE TABLE "menu_do_site_itens_ocultos" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum_menu_do_site_itens_ocultos",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "menu_do_site" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"link_externo_ativo" boolean DEFAULT true,
  	"link_externo_rotulo" varchar DEFAULT 'Vídeos pornô grátis',
  	"link_externo_url" varchar DEFAULT 'https://www.redtube.com.br/',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "menu_do_site_itens_ocultos" ADD CONSTRAINT "menu_do_site_itens_ocultos_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."menu_do_site"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "menu_do_site_itens_ocultos_order_idx" ON "menu_do_site_itens_ocultos" USING btree ("order");
  CREATE INDEX "menu_do_site_itens_ocultos_parent_idx" ON "menu_do_site_itens_ocultos" USING btree ("parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "menu_do_site_itens_ocultos" CASCADE;
  DROP TABLE "menu_do_site" CASCADE;
  DROP TYPE "public"."enum_menu_do_site_itens_ocultos";`)
}

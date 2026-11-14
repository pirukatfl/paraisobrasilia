import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Menu "Vídeos" (pedido do cliente, 2026-11-14): o link externo passa a ser o item "Pornô grátis" dentro do submenu.
 * Troca o rótulo padrão e atualiza só quem ainda usa o rótulo antigo (um texto escrito pela equipe fica como está).
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TYPE "public"."enum_menu_do_site_itens_ocultos" ADD VALUE IF NOT EXISTS 'videos' AFTER 'dicas-hot';
  ALTER TABLE "menu_do_site" ALTER COLUMN "link_externo_rotulo" SET DEFAULT 'Pornô grátis';
  UPDATE "menu_do_site" SET "link_externo_rotulo" = 'Pornô grátis' WHERE "link_externo_rotulo" = 'Vídeos pornô grátis';`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  // O valor 'videos' do enum fica (o Postgres não remove valores de enum).
  await db.execute(sql`
  ALTER TABLE "menu_do_site" ALTER COLUMN "link_externo_rotulo" SET DEFAULT 'Vídeos pornô grátis';
  UPDATE "menu_do_site" SET "link_externo_rotulo" = 'Vídeos pornô grátis' WHERE "link_externo_rotulo" = 'Pornô grátis';`)
}

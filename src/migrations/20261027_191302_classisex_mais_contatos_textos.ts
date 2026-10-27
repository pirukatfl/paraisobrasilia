import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_classisex" ALTER COLUMN "anunciar_intro" SET DEFAULT 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp, Telegram, e-mail e links) só os assinantes veem.';
  ALTER TABLE "textos_meus_anuncios" ALTER COLUMN "contato_legenda" SET DEFAULT 'Contato (opcional; só assinantes veem)';
  ALTER TABLE "textos_classisex" ADD COLUMN "contato_email" varchar DEFAULT 'E-mail';
  ALTER TABLE "textos_classisex" ADD COLUMN "contato_links_titulo" varchar DEFAULT 'Outras plataformas';
  ALTER TABLE "textos_classisex" ADD COLUMN "contato_observacao" varchar DEFAULT 'Como prefere o contato';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "dono_email" varchar DEFAULT 'E-mail';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "dono_links" varchar DEFAULT 'Links';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "dono_observacao" varchar DEFAULT 'Como prefere o contato';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "email_contato_rotulo" varchar DEFAULT 'E-mail';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "links_rotulo" varchar DEFAULT 'Links de outras plataformas';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "links_ajuda" varchar DEFAULT 'Instagram, X, OnlyFans, Privacy, Linktree… Até 5 links. Só assinantes veem.';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "links_mais" varchar DEFAULT 'Adicionar mais links';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "observacao_rotulo" varchar DEFAULT 'Como prefere o contato';
  ALTER TABLE "textos_meus_anuncios" ADD COLUMN "observacao_ajuda" varchar DEFAULT 'Ex.: só mensagem, depois das 18h.';
  -- Rows still holding the old default text follow the new one (texts edited by the staff stay as they are)
  UPDATE "textos_classisex" SET "anunciar_intro" = 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp, Telegram, e-mail e links) só os assinantes veem.' WHERE "anunciar_intro" = 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp ou Telegram) só os assinantes veem.';
  UPDATE "textos_meus_anuncios" SET "contato_legenda" = 'Contato (opcional; só assinantes veem)' WHERE "contato_legenda" = 'Contato (WhatsApp ou Telegram, opcional; só assinantes veem)';`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_classisex" ALTER COLUMN "anunciar_intro" SET DEFAULT 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp ou Telegram) só os assinantes veem.';
  ALTER TABLE "textos_meus_anuncios" ALTER COLUMN "contato_legenda" SET DEFAULT 'Contato (WhatsApp ou Telegram, opcional; só assinantes veem)';
  ALTER TABLE "textos_classisex" DROP COLUMN "contato_email";
  ALTER TABLE "textos_classisex" DROP COLUMN "contato_links_titulo";
  ALTER TABLE "textos_classisex" DROP COLUMN "contato_observacao";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "dono_email";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "dono_links";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "dono_observacao";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "email_contato_rotulo";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "links_rotulo";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "links_ajuda";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "links_mais";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "observacao_rotulo";
  ALTER TABLE "textos_meus_anuncios" DROP COLUMN "observacao_ajuda";
  UPDATE "textos_classisex" SET "anunciar_intro" = 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp ou Telegram) só os assinantes veem.' WHERE "anunciar_intro" = 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp, Telegram, e-mail e links) só os assinantes veem.';
  UPDATE "textos_meus_anuncios" SET "contato_legenda" = 'Contato (WhatsApp ou Telegram, opcional; só assinantes veem)' WHERE "contato_legenda" = 'Contato (opcional; só assinantes veem)';`)
}

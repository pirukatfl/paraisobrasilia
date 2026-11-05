import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/** Lexical default of a one-line text (same shape the other textos columns use). */
const rico = (texto: string) =>
  JSON.stringify({
    root: {
      type: 'root',
      version: 1,
      children: [
        {
          type: 'paragraph',
          version: 1,
          children: [{ type: 'text', version: 1, text: texto, format: 0, detail: 0, mode: 'normal', style: '' }],
          direction: 'ltr',
          format: '',
          indent: 0,
          textFormat: 0,
          textStyle: '',
        },
      ],
      direction: 'ltr',
      format: '',
      indent: 0,
    },
  }).replace(/'/g, "''")

const EMAIL_PROMOCAO = 'Seu e-mail'
const EMAIL_PROMOCAO_AJUDA =
  'Obrigatório na promoção: é por ele que a equipe fala com você e libera o acesso à plataforma se você ganhar. Só a equipe vê.'

/**
 * Promoção: two buttons on the home (conto and photo/video) instead of "Participar". The conto submission also
 * records the promotion (`contos.promocao`, staff only), and the forms get the texts for the required e-mail.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql.raw(`
  ALTER TABLE "promocao" ADD COLUMN "botao_conto" varchar DEFAULT 'Envie seu conto';
  ALTER TABLE "promocao" ADD COLUMN "botao_midia" varchar DEFAULT 'Mande sua foto/vídeo';
  UPDATE "promocao" SET "botao_conto" = 'Envie seu conto', "botao_midia" = 'Mande sua foto/vídeo';
  ALTER TABLE "promocao" DROP COLUMN "botao_participar";
  ALTER TABLE "contos" ADD COLUMN "promocao" varchar;
  ALTER TABLE "_contos_v" ADD COLUMN "version_promocao" varchar;
  CREATE INDEX "contos_promocao_idx" ON "contos" USING btree ("promocao");
  CREATE INDEX "_contos_v_version_version_promocao_idx" ON "_contos_v" USING btree ("version_promocao");
  ALTER TABLE "textos_enviar_conto" ADD COLUMN "promocao_quadro" jsonb DEFAULT '${rico('Participando da promoção: {titulo}')}'::jsonb;
  ALTER TABLE "textos_enviar_conto" ADD COLUMN "promocao_email_rotulo" jsonb DEFAULT '${rico(EMAIL_PROMOCAO)}'::jsonb;
  ALTER TABLE "textos_enviar_conto" ADD COLUMN "promocao_email_ajuda" jsonb DEFAULT '${rico(EMAIL_PROMOCAO_AJUDA)}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_contato_rotulo" jsonb DEFAULT '${rico(EMAIL_PROMOCAO)}'::jsonb;
  ALTER TABLE "textos_enviar_midia" ADD COLUMN "promocao_contato_ajuda" jsonb DEFAULT '${rico(EMAIL_PROMOCAO_AJUDA)}'::jsonb;`))
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_contato_ajuda";
  ALTER TABLE "textos_enviar_midia" DROP COLUMN "promocao_contato_rotulo";
  ALTER TABLE "textos_enviar_conto" DROP COLUMN "promocao_email_ajuda";
  ALTER TABLE "textos_enviar_conto" DROP COLUMN "promocao_email_rotulo";
  ALTER TABLE "textos_enviar_conto" DROP COLUMN "promocao_quadro";
  DROP INDEX "_contos_v_version_version_promocao_idx";
  DROP INDEX "contos_promocao_idx";
  ALTER TABLE "_contos_v" DROP COLUMN "version_promocao";
  ALTER TABLE "contos" DROP COLUMN "promocao";
  ALTER TABLE "promocao" ADD COLUMN "botao_participar" varchar DEFAULT 'Participar';
  ALTER TABLE "promocao" DROP COLUMN "botao_conto";
  ALTER TABLE "promocao" DROP COLUMN "botao_midia";`)
}

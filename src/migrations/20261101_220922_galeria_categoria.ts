import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_models_categoria" AS ENUM('profissional', 'amadora');
  CREATE TYPE "public"."enum__models_v_version_categoria" AS ENUM('profissional', 'amadora');
  ALTER TABLE "models" ADD COLUMN "categoria" "enum_models_categoria" DEFAULT 'profissional';
  ALTER TABLE "_models_v" ADD COLUMN "version_categoria" "enum__models_v_version_categoria" DEFAULT 'profissional';
  ALTER TABLE "textos_geral" ADD COLUMN "menu_galeria" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Galeria","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_geral" ADD COLUMN "menu_galeria_profissionais" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Profissionais","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_geral" ADD COLUMN "menu_galeria_amadoras" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Amadoras","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "titulo_profissionais" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Profissionais","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "intro_profissionais" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"As modelos profissionais que animam as noites do Paraíso.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "titulo_amadoras" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Amadoras","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_modelos" ADD COLUMN "intro_amadoras" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"As amadoras que frequentam e encantam as noites do Paraíso.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  CREATE INDEX "models_categoria_idx" ON "models" USING btree ("categoria");
  CREATE INDEX "_models_v_version_version_categoria_idx" ON "_models_v" USING btree ("version_categoria");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "models_categoria_idx";
  DROP INDEX "_models_v_version_version_categoria_idx";
  ALTER TABLE "models" DROP COLUMN "categoria";
  ALTER TABLE "_models_v" DROP COLUMN "version_categoria";
  ALTER TABLE "textos_geral" DROP COLUMN "menu_galeria";
  ALTER TABLE "textos_geral" DROP COLUMN "menu_galeria_profissionais";
  ALTER TABLE "textos_geral" DROP COLUMN "menu_galeria_amadoras";
  ALTER TABLE "textos_modelos" DROP COLUMN "titulo_profissionais";
  ALTER TABLE "textos_modelos" DROP COLUMN "intro_profissionais";
  ALTER TABLE "textos_modelos" DROP COLUMN "titulo_amadoras";
  ALTER TABLE "textos_modelos" DROP COLUMN "intro_amadoras";
  DROP TYPE "public"."enum_models_categoria";
  DROP TYPE "public"."enum__models_v_version_categoria";`)
}

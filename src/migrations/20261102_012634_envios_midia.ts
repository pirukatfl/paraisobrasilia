import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_envios_midia_status" AS ENUM('novo', 'aprovado', 'recusado');
  CREATE TYPE "public"."enum_envios_midia_arquivos_kind" AS ENUM('foto', 'video');
  CREATE TABLE "envios_midia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"status" "enum_envios_midia_status" DEFAULT 'novo' NOT NULL,
  	"apelido" varchar NOT NULL,
  	"contato" varchar NOT NULL,
  	"mensagem" varchar,
  	"consent_at" timestamp(3) with time zone,
  	"observacao" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "envios_midia_arquivos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"envio_id" integer NOT NULL,
  	"kind" "enum_envios_midia_arquivos_kind" NOT NULL,
  	"duration_seconds" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric,
  	"sizes_card_url" varchar,
  	"sizes_card_width" numeric,
  	"sizes_card_height" numeric,
  	"sizes_card_mime_type" varchar,
  	"sizes_card_filesize" numeric,
  	"sizes_card_filename" varchar
  );
  
  CREATE TABLE "textos_enviar_midia" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"google_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviar fotos e vídeos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"google_descricao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Envie suas fotos e vídeos do Paraíso Brasília para a equipe. Sem cadastro; só para maiores de 18 anos, com autorização de uso de imagem.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"topo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Participe","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviar fotos e vídeos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"intro" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Qualquer pessoa pode enviar, sem cadastro. Só a equipe vê o que você mandar; nada vai para o site sozinho. A equipe pode usar as imagens na galeria depois de conferir, e só com a sua autorização.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"obrigatorio" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"(obrigatório)","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"apelido_rotulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Apelido","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"apelido_ajuda" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Como a equipe deve chamar você.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"contato_rotulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Seu e-mail ou WhatsApp","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"contato_ajuda" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Para a equipe falar com você se precisar. Só a equipe vê.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"mensagem_rotulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Mensagem (opcional)","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"mensagem_ajuda" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Conte de que festa são as imagens, ou qualquer recado para a equipe.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"arquivos_rotulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Fotos e vídeos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"arquivos_ajuda" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Até {fotos} fotos (JPG, PNG ou WebP, até 15 MB cada) e até {videos} vídeos (MP4 ou MOV, até 100 MB e 60 segundos cada).","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"arquivos_escolher" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Escolher fotos e vídeos","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"arquivos_tirar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Tirar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"maior18" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Tenho 18 anos ou mais.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"autorizacao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Autorizo o Paraíso Brasília a usar estas fotos e vídeos na divulgação da casa. As imagens são minhas ou foram feitas com autorização de todas as pessoas que aparecem.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"aviso" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Depois de enviar, não dá para editar nem apagar pelo site. Para retirar uma imagem, fale com a equipe pela página Contato.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviar para a equipe","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"botao_enviando" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviando…","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"progresso" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviando arquivo {n} de {total}…","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"enviado_google_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Envio recebido","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"enviado_topo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Participe","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"enviado_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Recebemos seu envio","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"enviado_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Obrigado! A equipe vai olhar as suas fotos e vídeos. Nada vai para o site sem a sua autorização.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"enviado_falhas" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"{n} arquivo(s) não foram aceitos (tipo, tamanho ou duração fora do limite). Você pode enviar de novo.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"enviado_botao_inicio" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Voltar à página inicial","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "envios_midia_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "envios_midia_arquivos_id" integer;
  ALTER TABLE "envios_midia_arquivos" ADD CONSTRAINT "envios_midia_arquivos_envio_id_envios_midia_id_fk" FOREIGN KEY ("envio_id") REFERENCES "public"."envios_midia"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "envios_midia_status_idx" ON "envios_midia" USING btree ("status");
  CREATE INDEX "envios_midia_updated_at_idx" ON "envios_midia" USING btree ("updated_at");
  CREATE INDEX "envios_midia_created_at_idx" ON "envios_midia" USING btree ("created_at");
  CREATE INDEX "envios_midia_arquivos_envio_idx" ON "envios_midia_arquivos" USING btree ("envio_id");
  CREATE INDEX "envios_midia_arquivos_updated_at_idx" ON "envios_midia_arquivos" USING btree ("updated_at");
  CREATE INDEX "envios_midia_arquivos_created_at_idx" ON "envios_midia_arquivos" USING btree ("created_at");
  CREATE UNIQUE INDEX "envios_midia_arquivos_filename_idx" ON "envios_midia_arquivos" USING btree ("filename");
  CREATE INDEX "envios_midia_arquivos_sizes_card_sizes_card_filename_idx" ON "envios_midia_arquivos" USING btree ("sizes_card_filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_envios_midia_fk" FOREIGN KEY ("envios_midia_id") REFERENCES "public"."envios_midia"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_envios_midia_arquivos_fk" FOREIGN KEY ("envios_midia_arquivos_id") REFERENCES "public"."envios_midia_arquivos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_envios_midia_id_idx" ON "payload_locked_documents_rels" USING btree ("envios_midia_id");
  CREATE INDEX "payload_locked_documents_rels_envios_midia_arquivos_id_idx" ON "payload_locked_documents_rels" USING btree ("envios_midia_arquivos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "envios_midia" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "envios_midia_arquivos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "textos_enviar_midia" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "envios_midia" CASCADE;
  DROP TABLE "envios_midia_arquivos" CASCADE;
  DROP TABLE "textos_enviar_midia" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_envios_midia_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_envios_midia_arquivos_fk";
  
  DROP INDEX "payload_locked_documents_rels_envios_midia_id_idx";
  DROP INDEX "payload_locked_documents_rels_envios_midia_arquivos_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "envios_midia_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "envios_midia_arquivos_id";
  DROP TYPE "public"."enum_envios_midia_status";
  DROP TYPE "public"."enum_envios_midia_arquivos_kind";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_ad_comments_status" AS ENUM('publicado', 'oculto');
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'comentario-ocultado';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'comentario-reexibido';
  ALTER TYPE "public"."enum_audit_log_action" ADD VALUE 'comentario-apagado';
  CREATE TABLE "ad_comments" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"resumo" varchar,
  	"ad_id" integer NOT NULL,
  	"author_id" integer NOT NULL,
  	"parent_id" integer,
  	"apelido" varchar NOT NULL,
  	"texto" varchar NOT NULL,
  	"do_anunciante" boolean DEFAULT false,
  	"status" "enum_ad_comments_status" DEFAULT 'publicado' NOT NULL,
  	"ocultado_em" timestamp(3) with time zone,
  	"ocultado_por_id" integer,
  	"motivo" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "assinantes" ADD COLUMN "comentarios_bloqueados" boolean DEFAULT false;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "ad_comments_id" integer;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentarios_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Comentários","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentarios_vazio" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Ainda não há comentários. Comece a conversa.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentarios_aviso_contato" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Contatos escritos nos comentários aparecem só para assinantes.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentarios_assine_link" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Assine para ver","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_rotulo_apelido" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Seu apelido","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_apelido_ajuda" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Sem telefone, e-mail, @ ou link.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_rotulo_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Seu comentário","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Comentar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_botao_responder" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Responder","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_botao_enviando" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Enviando…","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_botao_cancelar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Cancelar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_responder" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Responder","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_apagar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Apagar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_apagar_pergunta" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Apagar este comentário? As respostas dele também somem.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_apagar_confirmar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Sim, apagar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_selo_anunciante" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Anunciante","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_entrar_texto" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Entre ou crie sua conta grátis para comentar.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_entrar_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Entrar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_cadastro_botao" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Criar conta grátis","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_bloqueado" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Sua conta está sem permissão para comentar. Fale com a equipe.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_so_assinantes" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Só assinantes com acesso ativo podem comentar.","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_card_ver" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Comentários ({n})","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_card_comentar" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Comentar","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_pagina_google_titulo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Anúncio do ClassiSex","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "textos_classisex" ADD COLUMN "comentario_ver_completo" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Ver anúncio completo","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;
  ALTER TABLE "ad_comments" ADD CONSTRAINT "ad_comments_ad_id_ads_id_fk" FOREIGN KEY ("ad_id") REFERENCES "public"."ads"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_comments" ADD CONSTRAINT "ad_comments_author_id_assinantes_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_comments" ADD CONSTRAINT "ad_comments_parent_id_ad_comments_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."ad_comments"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "ad_comments" ADD CONSTRAINT "ad_comments_ocultado_por_id_users_id_fk" FOREIGN KEY ("ocultado_por_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "ad_comments_ad_idx" ON "ad_comments" USING btree ("ad_id");
  CREATE INDEX "ad_comments_author_idx" ON "ad_comments" USING btree ("author_id");
  CREATE INDEX "ad_comments_parent_idx" ON "ad_comments" USING btree ("parent_id");
  CREATE INDEX "ad_comments_status_idx" ON "ad_comments" USING btree ("status");
  CREATE INDEX "ad_comments_ocultado_por_idx" ON "ad_comments" USING btree ("ocultado_por_id");
  CREATE INDEX "ad_comments_updated_at_idx" ON "ad_comments" USING btree ("updated_at");
  CREATE INDEX "ad_comments_created_at_idx" ON "ad_comments" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_ad_comments_fk" FOREIGN KEY ("ad_comments_id") REFERENCES "public"."ad_comments"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_ad_comments_id_idx" ON "payload_locked_documents_rels" USING btree ("ad_comments_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ad_comments" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "ad_comments" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT IF EXISTS "payload_locked_documents_rels_ad_comments_fk";
  
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE text;
  DROP TYPE "public"."enum_audit_log_action";
  CREATE TYPE "public"."enum_audit_log_action" AS ENUM('conta-criada', 'conta-editada', 'conta-excluida', 'acesso-liberado', 'acesso-renovado', 'acesso-encerrado', 'periodo-corrigido', 'senha-definida-pela-equipe', 'link-de-senha-gerado', 'senha-trocada-pelo-assinante', 'conta-importada', 'senha-migrada', 'anuncio-aprovado', 'anuncio-recusado', 'anuncio-despublicado', 'anuncio-legado-apagado', 'denuncia-resolvida', 'recado-aprovado', 'recado-recusado', 'recado-despublicado', 'denuncia-mensagem-resolvida', 'mensagens-suspensas');
  ALTER TABLE "audit_log" ALTER COLUMN "action" SET DATA TYPE "public"."enum_audit_log_action" USING "action"::"public"."enum_audit_log_action";
  DROP INDEX "payload_locked_documents_rels_ad_comments_id_idx";
  ALTER TABLE "assinantes" DROP COLUMN "comentarios_bloqueados";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "ad_comments_id";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentarios_titulo";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentarios_vazio";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentarios_aviso_contato";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentarios_assine_link";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_rotulo_apelido";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_apelido_ajuda";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_rotulo_texto";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_botao";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_botao_responder";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_botao_enviando";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_botao_cancelar";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_responder";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_apagar";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_apagar_pergunta";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_apagar_confirmar";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_selo_anunciante";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_entrar_texto";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_entrar_botao";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_cadastro_botao";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_bloqueado";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_so_assinantes";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_card_ver";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_card_comentar";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_pagina_google_titulo";
  ALTER TABLE "textos_classisex" DROP COLUMN "comentario_ver_completo";
  DROP TYPE "public"."enum_ad_comments_status";`)
}

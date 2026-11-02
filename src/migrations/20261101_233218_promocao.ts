import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "promocao" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ativa" boolean DEFAULT false,
  	"titulo" varchar,
  	"texto" jsonb,
  	"inicio" timestamp(3) with time zone,
  	"fim" timestamp(3) with time zone,
  	"imagem_id" integer,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "promocao" ADD CONSTRAINT "promocao_imagem_id_media_id_fk" FOREIGN KEY ("imagem_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "promocao_imagem_idx" ON "promocao" USING btree ("imagem_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "promocao" CASCADE;`)
}

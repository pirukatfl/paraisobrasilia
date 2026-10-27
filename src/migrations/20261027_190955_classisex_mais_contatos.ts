import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "ads_contato_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"url" varchar NOT NULL
  );
  
  ALTER TABLE "ads" ADD COLUMN "contato_email" varchar;
  ALTER TABLE "ads" ADD COLUMN "contato_observacao" varchar;
  ALTER TABLE "ads_contato_links" ADD CONSTRAINT "ads_contato_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."ads"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "ads_contato_links_order_idx" ON "ads_contato_links" USING btree ("_order");
  CREATE INDEX "ads_contato_links_parent_id_idx" ON "ads_contato_links" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "ads_contato_links" CASCADE;
  ALTER TABLE "ads" DROP COLUMN "contato_email";
  ALTER TABLE "ads" DROP COLUMN "contato_observacao";`)
}

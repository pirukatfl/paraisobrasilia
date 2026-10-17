import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_parties_attractions_kind" AS ENUM('dj', 'show', 'modelo', 'outro');
  CREATE TABLE "parties_prices" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"value" varchar
  );
  
  CREATE TABLE "parties_attractions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"kind" "enum_parties_attractions_kind" NOT NULL,
  	"name" varchar NOT NULL
  );
  
  ALTER TABLE "parties" ADD COLUMN "summary" varchar;
  ALTER TABLE "parties" ADD COLUMN "dress_code" varchar;
  ALTER TABLE "parties" ADD COLUMN "details" jsonb;
  ALTER TABLE "parties_prices" ADD CONSTRAINT "parties_prices_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "parties_attractions" ADD CONSTRAINT "parties_attractions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."parties"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "parties_prices_order_idx" ON "parties_prices" USING btree ("_order");
  CREATE INDEX "parties_prices_parent_id_idx" ON "parties_prices" USING btree ("_parent_id");
  CREATE INDEX "parties_attractions_order_idx" ON "parties_attractions" USING btree ("_order");
  CREATE INDEX "parties_attractions_parent_id_idx" ON "parties_attractions" USING btree ("_parent_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "parties_prices" CASCADE;
  DROP TABLE "parties_attractions" CASCADE;
  ALTER TABLE "parties" DROP COLUMN "summary";
  ALTER TABLE "parties" DROP COLUMN "dress_code";
  ALTER TABLE "parties" DROP COLUMN "details";
  DROP TYPE "public"."enum_parties_attractions_kind";`)
}

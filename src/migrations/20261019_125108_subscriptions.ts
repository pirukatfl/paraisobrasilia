import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_subscriptions_status" AS ENUM('ativa', 'encerrada');
  CREATE TYPE "public"."enum_subscriptions_payment_method" AS ENUM('pix', 'pagbank', 'dinheiro', 'transferencia', 'cortesia', 'outro');
  CREATE TABLE "subscriptions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"assinante_id" integer NOT NULL,
  	"plan_id" integer,
  	"starts_at" timestamp(3) with time zone NOT NULL,
  	"ends_at" timestamp(3) with time zone,
  	"status" "enum_subscriptions_status" DEFAULT 'ativa' NOT NULL,
  	"closed_at" timestamp(3) with time zone,
  	"payment_amount" numeric,
  	"payment_method" "enum_subscriptions_payment_method" NOT NULL,
  	"payment_paid_at" timestamp(3) with time zone,
  	"payment_note" varchar,
  	"summary" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "assinantes" ADD COLUMN "access_until" timestamp(3) with time zone;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "subscriptions_id" integer;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_assinante_id_assinantes_id_fk" FOREIGN KEY ("assinante_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "subscriptions_assinante_idx" ON "subscriptions" USING btree ("assinante_id");
  CREATE INDEX "subscriptions_plan_idx" ON "subscriptions" USING btree ("plan_id");
  CREATE INDEX "subscriptions_ends_at_idx" ON "subscriptions" USING btree ("ends_at");
  CREATE INDEX "subscriptions_updated_at_idx" ON "subscriptions" USING btree ("updated_at");
  CREATE INDEX "subscriptions_created_at_idx" ON "subscriptions" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_subscriptions_fk" FOREIGN KEY ("subscriptions_id") REFERENCES "public"."subscriptions"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_subscriptions_id_idx" ON "payload_locked_documents_rels" USING btree ("subscriptions_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "subscriptions" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "subscriptions" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_subscriptions_fk";
  
  DROP INDEX "payload_locked_documents_rels_subscriptions_id_idx";
  ALTER TABLE "assinantes" DROP COLUMN "access_until";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "subscriptions_id";
  DROP TYPE "public"."enum_subscriptions_status";
  DROP TYPE "public"."enum_subscriptions_payment_method";`)
}

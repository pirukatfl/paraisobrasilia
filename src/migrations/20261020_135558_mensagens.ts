import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "conversations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"participant_a_id" integer NOT NULL,
  	"participant_b_id" integer NOT NULL,
  	"pair_key" varchar NOT NULL,
  	"apelido_a" varchar,
  	"apelido_b" varchar,
  	"assunto" varchar,
  	"last_message_at" timestamp(3) with time zone,
  	"last_sender_id" integer,
  	"started_by_id" integer,
  	"last_read_a" timestamp(3) with time zone,
  	"last_read_b" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "messages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"conversation_id" integer NOT NULL,
  	"sender_id" integer NOT NULL,
  	"texto" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "conversations_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "messages_id" integer;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_a_id_assinantes_id_fk" FOREIGN KEY ("participant_a_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_b_id_assinantes_id_fk" FOREIGN KEY ("participant_b_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_last_sender_id_assinantes_id_fk" FOREIGN KEY ("last_sender_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "conversations" ADD CONSTRAINT "conversations_started_by_id_assinantes_id_fk" FOREIGN KEY ("started_by_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_assinantes_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."assinantes"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "conversations_participant_a_idx" ON "conversations" USING btree ("participant_a_id");
  CREATE INDEX "conversations_participant_b_idx" ON "conversations" USING btree ("participant_b_id");
  CREATE UNIQUE INDEX "conversations_pair_key_idx" ON "conversations" USING btree ("pair_key");
  CREATE INDEX "conversations_last_message_at_idx" ON "conversations" USING btree ("last_message_at");
  CREATE INDEX "conversations_last_sender_idx" ON "conversations" USING btree ("last_sender_id");
  CREATE INDEX "conversations_started_by_idx" ON "conversations" USING btree ("started_by_id");
  CREATE INDEX "conversations_updated_at_idx" ON "conversations" USING btree ("updated_at");
  CREATE INDEX "conversations_created_at_idx" ON "conversations" USING btree ("created_at");
  CREATE INDEX "messages_conversation_idx" ON "messages" USING btree ("conversation_id");
  CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id");
  CREATE INDEX "messages_updated_at_idx" ON "messages" USING btree ("updated_at");
  CREATE INDEX "messages_created_at_idx" ON "messages" USING btree ("created_at");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_conversations_fk" FOREIGN KEY ("conversations_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_messages_fk" FOREIGN KEY ("messages_id") REFERENCES "public"."messages"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_conversations_id_idx" ON "payload_locked_documents_rels" USING btree ("conversations_id");
  CREATE INDEX "payload_locked_documents_rels_messages_id_idx" ON "payload_locked_documents_rels" USING btree ("messages_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "conversations" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "messages" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "conversations" CASCADE;
  DROP TABLE "messages" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_conversations_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_messages_fk";
  
  DROP INDEX "payload_locked_documents_rels_conversations_id_idx";
  DROP INDEX "payload_locked_documents_rels_messages_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "conversations_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "messages_id";`)
}

import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

import { seedContactIfEmpty } from './seed/contact-content'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "contact" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"address_line" varchar NOT NULL,
  	"address_detail" varchar NOT NULL,
  	"postal_code" varchar,
  	"lat" numeric,
  	"lng" numeric,
  	"whatsapp" varchar NOT NULL,
  	"phone" varchar,
  	"email" varchar NOT NULL,
  	"instagram" varchar,
  	"hours" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  `)

  // Seed D-01..D-03 (address, WhatsApp 5561999889772, coordinates -15.5936421/-47.9771526)
  // only when empty: re-running never overwrites staff edits.
  await seedContactIfEmpty(payload, req)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "contact" CASCADE;`)
}

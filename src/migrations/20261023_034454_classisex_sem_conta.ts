import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "ads" ADD COLUMN "enviado_sem_conta" boolean DEFAULT false;
  ALTER TABLE "ads" ADD COLUMN "email_visitante" varchar;
  CREATE INDEX "ads_enviado_sem_conta_idx" ON "ads" USING btree ("enviado_sem_conta");
  CREATE INDEX "ads_email_visitante_idx" ON "ads" USING btree ("email_visitante");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "ads_enviado_sem_conta_idx";
  DROP INDEX "ads_email_visitante_idx";
  ALTER TABLE "ads" DROP COLUMN "enviado_sem_conta";
  ALTER TABLE "ads" DROP COLUMN "email_visitante";`)
}

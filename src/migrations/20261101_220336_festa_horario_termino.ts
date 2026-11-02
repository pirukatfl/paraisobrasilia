import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_festas" ADD COLUMN "horario_com_termino" jsonb DEFAULT '{"root":{"type":"root","version":1,"children":[{"type":"paragraph","version":1,"children":[{"type":"text","version":1,"text":"Das {inicio} às {fim}","format":0,"detail":0,"mode":"normal","style":""}],"direction":"ltr","format":"","indent":0,"textFormat":0,"textStyle":""}],"direction":"ltr","format":"","indent":0}}'::jsonb;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "textos_festas" DROP COLUMN "horario_com_termino";`)
}

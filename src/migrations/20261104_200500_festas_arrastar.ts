import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Troca o campo numérico "Posição na lista" pela ordenação por arrastar e soltar (orderable).
// A ordem já definida é preservada: vira chave `_order` (a0, a1, ...) na mesma sequência.
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "parties" ADD COLUMN "_order" varchar;
  ALTER TABLE "_parties_v" ADD COLUMN "version__order" varchar;
  CREATE INDEX "parties__order_idx" ON "parties" USING btree ("_order");
  CREATE INDEX "_parties_v_version_version__order_idx" ON "_parties_v" USING btree ("version__order");

  UPDATE "parties" p SET "_order" = 'a' || substr('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz', r.rn::int, 1)
  FROM (
    SELECT id, row_number() OVER (ORDER BY "display_order" ASC NULLS LAST, "starts_at" ASC) AS rn FROM "parties"
  ) r
  WHERE p.id = r.id AND r.rn <= 62;

  UPDATE "_parties_v" v SET "version__order" = p."_order"
  FROM "parties" p WHERE v."parent_id" = p.id;

  ALTER TABLE "parties" DROP COLUMN "display_order";
  ALTER TABLE "_parties_v" DROP COLUMN "version_display_order";`)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "parties" ADD COLUMN "display_order" numeric;
  ALTER TABLE "_parties_v" ADD COLUMN "version_display_order" numeric;
  DROP INDEX "parties__order_idx";
  DROP INDEX "_parties_v_version_version__order_idx";
  ALTER TABLE "parties" DROP COLUMN "_order";
  ALTER TABLE "_parties_v" DROP COLUMN "version__order";`)
}

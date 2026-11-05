import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// "Enviar recado" vira "Comente". Os textos do painel guardam o valor no banco (editor rico, jsonb),
// então trocar só o texto padrão no código não muda o que o site mostra. Aqui o texto é trocado nos
// valores já salvos e nos padrões das colunas. Quem escreveu outro texto à mão não é tocado:
// só entram os valores que contêm exatamente "Enviar recado" (ou "Comente" na volta).
const COLUNAS: ReadonlyArray<readonly [string, string]> = [
  ['textos_classisex', 'card_enviar_recado'],
  ['textos_mensagens', 'enviar_recado_link'],
  ['textos_mensagens', 'vazio_texto'],
]

async function trocar({ db }: MigrateUpArgs | MigrateDownArgs, de: string, para: string): Promise<void> {
  for (const [tabela, coluna] of COLUNAS) {
    const t = sql.identifier(tabela)
    const c = sql.identifier(coluna)
    await db.execute(
      sql`UPDATE ${t} SET ${c} = replace(${c}::text, ${de}, ${para})::jsonb WHERE ${c}::text LIKE ${'%' + de + '%'}`,
    )
    const padrao = await db.execute(
      sql`SELECT pg_get_expr(d.adbin, d.adrelid) AS expr FROM pg_attrdef d JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum WHERE d.adrelid = ${tabela}::regclass AND a.attname = ${coluna}`,
    )
    const expr = (padrao.rows[0] as { expr?: string } | undefined)?.expr
    if (expr && expr.includes(de)) {
      await db.execute(sql`ALTER TABLE ${t} ALTER COLUMN ${c} SET DEFAULT ${sql.raw(expr.split(de).join(para))}`)
    }
  }
}

export async function up(args: MigrateUpArgs): Promise<void> {
  await trocar(args, 'Enviar recado', 'Comente')
}

export async function down(args: MigrateDownArgs): Promise<void> {
  await trocar(args, 'Comente', 'Enviar recado')
}

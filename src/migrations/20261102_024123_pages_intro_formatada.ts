import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * `pages.intro` (Quem somos, Normas, Regras, Dicas, Termos, Privacidade) becomes a Lexical editor (jsonb), like the
 * site texts did in 20261028_224917_todos_textos_formatados. Intros the staff already wrote are converted, not lost:
 * the value goes through the plain-text -> editor-state conversion (paragraphs at blank lines, single newlines as line
 * breaks; empty or blank -> NULL). Postgres cannot cast varchar to jsonb on its own, so each column is rebuilt through
 * a temporary column. The version table (`_pages_v.version_intro`) gets the same treatment, so drafts and history keep
 * their intro. Frozen copy of the converters: a migration must not change when src/lib/textos/rico.ts does.
 * Down: jsonb back to plain text (formatting is lost, the words stay).
 */

/** [table, column] */
const COLUNAS: ReadonlyArray<readonly [string, string]> = [
  ['pages', 'intro'],
  ['_pages_v', 'version_intro'],
]

type No = Record<string, unknown>

const ehObjeto = (valor: unknown): valor is No => typeof valor === 'object' && valor !== null

function paragrafo(linhas: string[]): No {
  const children: No[] = []
  linhas.forEach((linha, i) => {
    if (i > 0) children.push({ type: 'linebreak', version: 1 })
    if (linha !== '') children.push({ type: 'text', version: 1, text: linha, format: 0, detail: 0, mode: 'normal', style: '' })
  })
  return { type: 'paragraph', version: 1, children, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '' }
}

function textoParaRico(texto: string): No {
  const children = texto
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((p) => p.replace(/^\n+|\n+$/g, ''))
    .filter((p) => p.trim() !== '')
    .map((p) => paragrafo(p.split('\n')))
  return { root: { type: 'root', version: 1, children, direction: 'ltr', format: '', indent: 0 } }
}

function filhos(no: unknown): No[] {
  return ehObjeto(no) && Array.isArray(no.children) ? no.children.filter(ehObjeto) : []
}

function textoDoNo(no: No): string {
  if (no.type === 'text') return typeof no.text === 'string' ? no.text : ''
  if (no.type === 'linebreak') return '\n'
  return filhos(no).map(textoDoNo).join('')
}

function ricoParaTexto(valor: unknown): string {
  if (!ehObjeto(valor)) return ''
  return filhos(valor.root)
    .map((bloco) => (bloco.type === 'list' ? filhos(bloco).map(textoDoNo).join('\n') : textoDoNo(bloco)))
    .filter((bloco) => bloco.trim() !== '')
    .join('\n\n')
}

type Linha = { id: number; valor: unknown }

/** Rebuilds `coluna` with `tipo`, converting every non-empty value; empty values become NULL. */
async function reconstruir(
  { db }: MigrateUpArgs | MigrateDownArgs,
  tabela: string,
  coluna: string,
  tipo: 'jsonb' | 'varchar',
  converter: (valor: unknown) => unknown,
): Promise<void> {
  const tabelaSql = sql.identifier(tabela)
  const colunaSql = sql.identifier(coluna)
  const novaSql = sql.identifier(`${coluna}_novo`)
  await db.execute(sql`ALTER TABLE ${tabelaSql} ADD COLUMN ${novaSql} ${sql.raw(tipo)}`)
  const resultado = await db.execute(sql`SELECT "id", ${colunaSql} AS "valor" FROM ${tabelaSql} WHERE ${colunaSql} IS NOT NULL`)
  for (const linha of resultado.rows as unknown as Linha[]) {
    const convertido = converter(linha.valor)
    if (convertido === null) continue
    const valor = tipo === 'jsonb' ? sql`${JSON.stringify(convertido)}::jsonb` : sql`${String(convertido)}`
    await db.execute(sql`UPDATE ${tabelaSql} SET ${novaSql} = ${valor} WHERE "id" = ${linha.id}`)
  }
  await db.execute(sql`ALTER TABLE ${tabelaSql} DROP COLUMN ${colunaSql}`)
  await db.execute(sql`ALTER TABLE ${tabelaSql} RENAME COLUMN ${novaSql} TO ${colunaSql}`)
}

export async function up(args: MigrateUpArgs): Promise<void> {
  for (const [tabela, coluna] of COLUNAS) {
    await reconstruir(args, tabela, coluna, 'jsonb', (valor) =>
      typeof valor === 'string' && valor.trim() !== '' ? textoParaRico(valor) : null,
    )
  }
}

export async function down(args: MigrateDownArgs): Promise<void> {
  for (const [tabela, coluna] of COLUNAS) {
    await reconstruir(args, tabela, coluna, 'varchar', (valor) => {
      const texto = ricoParaTexto(valor)
      return texto.trim() !== '' ? texto : null
    })
  }
}

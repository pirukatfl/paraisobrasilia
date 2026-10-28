import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * Long site texts become Lexical JSON (jsonb). Texts the staff already edited are converted, not lost:
 * each value goes through the same plain-text -> editor-state conversion the site uses for the original
 * text (paragraphs at blank lines, single newlines as line breaks). Columns are rebuilt through a
 * temporary column because Postgres cannot cast varchar to jsonb on its own. Frozen copy of the
 * converters: a migration must not change when src/lib/textos/rico.ts does.
 * Down: jsonb back to plain text (formatting and link addresses are lost, the words stay).
 */

/** [table, column, original text] of every field that became formatted (the original is the default). */
const COLUNAS: ReadonlyArray<readonly [string, string, string]> = [
  ['textos_geral', 'idade_texto', 'O Paraíso Brasília é uma casa de festas liberais para adultos. Para continuar, confirme que você tem 18 anos ou mais.'],
  ['textos_geral', 'erro_texto', 'Pode ser uma instabilidade momentânea. Tente de novo em alguns instantes. Se continuar, avise a equipe informando o código abaixo.'],
  ['textos_espaco', 'intro', 'Conheça os ambientes do Paraíso: pista, bar, jardim e piscina numa chácara reservada no Lago Oeste.'],
  ['textos_espaco', 'vazio_texto', 'Estamos preparando novas fotos e vídeos dos ambientes. Enquanto isso, venha conhecer pessoalmente.'],
  ['textos_modelos', 'vazio_texto', 'Estamos preparando esta galeria. Enquanto isso, veja as próximas festas ou conheça o espaço.'],
  ['textos_contato', 'intro', 'Estamos no Núcleo Rural Lago Oeste, em Sobradinho. Fale com a gente pelo WhatsApp para reservas e dúvidas.'],
  ['textos_assine', 'topo_texto', 'A assinatura libera a área de assinantes do Paraíso: perfis completos do ClassiSex com fotos, vídeos e contatos, e recados privados entre assinantes.'],
  ['textos_conta', 'entrar_esqueci_sem_email', 'Esqueceu a senha? Fale com a equipe pelo WhatsApp: ela envia um link para você criar uma nova.'],
  ['textos_conta', 'cadastro_enviado', 'Enviamos um link para o seu e-mail. Abra o link para ativar a conta (vale por 7 dias). Olhe também a caixa de spam.'],
  ['textos_conta', 'cadastro_intro', 'Com a conta gratuita você publica seus anúncios no ClassiSex (até 3, com 1 foto cada). Assinantes veem todos os anúncios, com contatos, e mandam recados privados entre si.'],
  ['textos_conta', 'esqueci_enviado', 'Se o e-mail existir, enviamos um link para criar uma nova senha. Olhe também a caixa de spam.'],
  ['textos_area_assinante', 'conta_texto', 'Você pode publicar até 3 anúncios com 1 foto cada. Também lê os anúncios dos outros, sem os contatos e só com a foto de capa. Para ver o contato, todas as fotos e os vídeos e para trocar recados, assine.'],
  ['textos_area_assinante', 'inativo_texto', 'Com a conta gratuita você publica seus anúncios em Meus anúncios e lê os anúncios dos outros (sem os contatos e só com a foto de capa). Assine para ver o contato, todas as fotos e os vídeos e para mandar e receber recados.'],
  ['textos_classisex', 'publico_intro', 'Anúncios do Paraíso: qualquer pessoa pode anunciar, com ou sem conta. Leia os recados na íntegra; os contatos (WhatsApp, Telegram, telefone, e-mail e links), as demais fotos e os vídeos ficam para assinantes.'],
  ['textos_classisex', 'publico_assine_texto', 'Assinantes veem os contatos, as fotos e os vídeos, mandam recados privados e anunciam também.'],
  ['textos_classisex', 'membros_gratis_texto', 'Você lê os recados na íntegra. Os contatos, as demais fotos e os vídeos aparecem para assinantes.'],
  ['textos_classisex', 'anunciar_intro', 'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp, Telegram, e-mail e links) só os assinantes veem.'],
  ['textos_classisex', 'foto_ajuda', '1 foto JPG, PNG ou WebP, até 15 MB, sem vídeo. No iPhone, a foto em HEIC é convertida para JPG ao escolher. Assinantes enviam até 10 fotos e 2 vídeos.'],
  ['textos_meus_anuncios', 'lista_intro', 'Você pode ter até 3 anúncios ativos (em análise ou publicados). Todo anúncio novo ou editado passa pela equipe antes de aparecer no ClassiSex.'],
  ['textos_meus_anuncios', 'lista_aviso_antigo', 'Seus anúncios do site antigo já estão publicados. Você pode editar ou apagar cada um aqui em Meus anúncios.'],
  ['textos_meus_anuncios', 'novo_intro', 'O anúncio aparece no ClassiSex depois que a equipe aprovar. Na área aberta, aparecem só o apelido, o tipo, o texto sem contatos e a foto de capa.'],
  ['textos_meus_anuncios', 'editar_aviso_antigo', 'Este anúncio veio do site antigo. Não há limite de texto nem é preciso preencher WhatsApp ou Telegram. Quem não é assinante vê o texto sem telefones, links e @.'],
  ['textos_meus_anuncios', 'editar_aviso_rascunho', 'Este anúncio veio do site antigo. Os contatos que estavam no texto não aparecem para ninguém enquanto for rascunho; coloque WhatsApp ou Telegram nos campos e tire-os do texto.'],
  ['textos_meus_anuncios', 'texto_ajuda_antigo', 'Anúncio do site antigo: sem limite de 600 caracteres. Se quiser, coloque o contato nos campos abaixo: só assinantes veem.'],
  ['textos_meus_anuncios', 'midia_ajuda_com_video', 'Até {fotos} fotos JPG, PNG ou WebP (15 MB cada) e até {videos} vídeos MP4 ou MOV (100 MB e {segundos} segundos cada). A primeira foto é a capa. Na área aberta, só a foto de capa aparece. Você também pode adicionar depois, editando o anúncio.'],
  ['textos_meus_anuncios', 'midia_ajuda_so_foto', '{fotos} foto JPG, PNG ou WebP (15 MB). Ela é a capa. Na área aberta, só a foto de capa aparece. Você também pode trocar depois, editando o anúncio.'],
  ['textos_meus_anuncios', 'ger_dica_assinante', 'Fotos JPG, PNG ou WebP até 15 MB (até 10). Até 2 vídeos MP4 ou MOV, cada um com até 100 MB e 60 segundos.'],
  ['textos_enviar_conto', 'intro', 'Qualquer pessoa pode enviar, sem cadastro. O conto aparece depois da análise da equipe: todo mundo lê o começo; o conto completo é só para assinantes. Telefone, e-mail, @ e links não são aceitos.'],
  ['textos_enviar_conto', 'conto_ajuda', 'De {min} a {max} caracteres. Deixe uma linha em branco entre os parágrafos. Telefone, e-mail, @ e links são recusados.'],
  ['textos_enviar_conto', 'imagem_ajuda', '1 imagem JPG, PNG ou WebP, até 15 MB. Aparece na lista e no conto, para todo mundo: sem nudez explícita e sem contatos. Só é mostrada depois da aprovação.'],
  ['textos_enviar_conto', 'aviso', 'Depois de enviar, não dá para editar nem apagar o conto. Ele só aparece no site depois que a equipe aprovar.'],
  ['textos_contos', 'lista_intro', 'Leia o começo de cada conto. O restante é só para assinantes. Qualquer pessoa pode enviar o seu: ele aparece depois que a equipe aprovar.'],
  ['textos_contos', 'lista_vazio_texto', 'Em breve novos contos. Assinantes leem tudo na área do assinante.'],
  ['textos_contos', 'lista_cta_texto', 'Assine para ler cada conto do começo ao fim, ver o ClassiSex e trocar mensagens.'],
  ['textos_contos', 'conto_cta_texto', 'Continue lendo: o restante deste conto é só para assinantes.'],
  ['textos_contos', 'membros_vazio_texto', 'Volte em breve: a equipe publica contos novos.'],
  ['textos_dicas_hot', 'lista_intro', 'Textos sobre swing, casais liberais, fetiches e prazer a dois, com respeito e sem tabu.'],
  ['textos_dicas_hot', 'lista_vazio_texto', 'Em breve novas dicas por aqui.'],
  ['textos_dicas_hot', 'lista_cta_texto', 'Assine para ler cada dica do começo ao fim, ver o ClassiSex e trocar mensagens.'],
  ['textos_dicas_hot', 'dica_cta_texto', 'Continue lendo: o restante desta dica é só para assinantes.'],
  ['textos_dicas_hot', 'membros_vazio_texto', 'Volte em breve: a equipe publica dicas novas.'],
  ['textos_mensagens', 'vazio_texto', 'Para mandar um recado, abra um anúncio do ClassiSex e toque em Enviar recado. Aqui aparecem só os recados que você mandou ou recebeu.'],
  ['textos_mensagens', 'form_apelido_ajuda', 'É o nome que a outra pessoa vê. Até 40 caracteres, sem telefone, e-mail, @ ou link.'],
  ['textos_mensagens', 'bloquear_aviso', 'A pessoa não poderá mais mandar recados para você. Você pode desbloquear quando quiser.'],,
  ['textos_meus_anuncios', 'texto_ajuda', 'Até 600 caracteres. Coloque o contato nos campos abaixo: só assinantes veem.'],
  ['textos_meus_anuncios', 'ger_dica_gratis', 'Conta gratuita: 1 foto JPG, PNG ou WebP até 15 MB e nenhum vídeo.']
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

/** DDL takes no bind parameters: the default goes in as an escaped literal (values come from COLUNAS, never from users). */
const literal = (texto: string) => sql.raw(`'${texto.replace(/'/g, "''")}'`)

type Linha = { id: number; valor: unknown }

/** Rebuilds `coluna` with `tipo`, converting every non-empty value; empty values become NULL (= original text). */
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
  await db.execute(sql`ALTER TABLE ${tabelaSql} ALTER COLUMN ${colunaSql} DROP DEFAULT`)
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
  const { db } = args
  for (const [tabela, coluna, original] of COLUNAS) {
    await reconstruir(args, tabela, coluna, 'jsonb', (valor) =>
      typeof valor === 'string' && valor.trim() !== '' ? textoParaRico(valor) : null,
    )
    await db.execute(
      sql`ALTER TABLE ${sql.identifier(tabela)} ALTER COLUMN ${sql.identifier(coluna)} SET DEFAULT ${literal(JSON.stringify(textoParaRico(original)))}::jsonb`,
    )
  }
}

export async function down(args: MigrateDownArgs): Promise<void> {
  const { db } = args
  for (const [tabela, coluna, original] of COLUNAS) {
    await reconstruir(args, tabela, coluna, 'varchar', (valor) => {
      const texto = ricoParaTexto(valor)
      return texto.trim() !== '' ? texto : null
    })
    await db.execute(
      sql`ALTER TABLE ${sql.identifier(tabela)} ALTER COLUMN ${sql.identifier(coluna)} SET DEFAULT ${literal(original)}`,
    )
  }
}

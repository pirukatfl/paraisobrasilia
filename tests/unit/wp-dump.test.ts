import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  extractContos,
  parseCreateTableColumns,
  parseInsertValues,
  readWpTables,
  WP_META_KEYS,
} from '@/lib/contos/wp-dump'

import { chunkedStream, fixturePath, fixtureText, gzipFixtureToTemp } from '../helpers/wp-dump-fixture'

const ALL = ['posts', 'terms', 'term_taxonomy', 'term_relationships', 'postmeta']
const keepMeta = (table: string, row: Record<string, unknown>) =>
  table !== 'postmeta' || (WP_META_KEYS as readonly string[]).includes(String(row.meta_key))

describe('parseInsertValues', () => {
  it('handles escapes, NULL, numbers, hex, _binary and structural characters inside strings', () => {
    const sql = String.raw`(1,'a\'b','c\\d',NULL,-2.5,'x\ny'),(2,'),(;','',0x41,_binary 'z');`
    expect(parseInsertValues(sql)).toEqual([
      [1, "a'b", 'c\\d', null, -2.5, 'x\ny'],
      [2, '),(;', '', 'A', 'z'],
    ])
  })

  it('decodes doubled quotes and the remaining MySQL escapes', () => {
    expect(parseInsertValues(String.raw`('it''s','\"q\"','\0\b\r\t\Z','100\%','a\_b')`)).toEqual([
      ["it's", '"q"', '\0\b\r\t\x1a', '100\\%', 'a\\_b'],
    ])
  })

  it('rejects truncated input with a clear error', () => {
    expect(() => parseInsertValues("(1,'abc")).toThrow(/Dump inválido/)
  })
})

describe('parseCreateTableColumns', () => {
  it('returns the posts columns in order and ignores key lines', () => {
    const create = fixtureText().match(/CREATE TABLE `wp26_posts` \([\s\S]*?\) ENGINE[^;]*;/)![0]
    expect(parseCreateTableColumns(create)).toEqual([
      'ID',
      'post_author',
      'post_date',
      'post_date_gmt',
      'post_content',
      'post_title',
      'post_excerpt',
      'post_status',
      'post_name',
      'post_modified_gmt',
      'post_type',
    ])
  })

  it('does not split on commas inside parentheses or strings', () => {
    const sql = "CREATE TABLE `t` (`a` decimal(10,2) NOT NULL, `b` enum('x,y','z') DEFAULT 'x,y', PRIMARY KEY (`a`,`b`))"
    expect(parseCreateTableColumns(sql)).toEqual(['a', 'b'])
  })
})

describe('readWpTables', () => {
  it('returns identical results for gzip, plain and tiny-chunk streams', async () => {
    const gz = await gzipFixtureToTemp()
    const fromGzip = await readWpTables(gz, { tables: ALL, rowFilter: keepMeta })
    const fromPlain = await readWpTables(fixturePath(), { tables: ALL, rowFilter: keepMeta })
    const fromChunks = await readWpTables(chunkedStream(fixtureText(), 7), { tables: ALL, rowFilter: keepMeta })
    expect(fromPlain).toEqual(fromGzip)
    expect(fromChunks).toEqual(fromGzip)
    expect(fromGzip.posts).toHaveLength(10)
    fs.rmSync(gz, { force: true })
  })

  it('parses tricky post content byte for byte', async () => {
    const { posts } = await readWpTables(fixturePath(), { tables: ['posts'] })
    const p101 = posts!.find((p) => p.ID === 101)!
    expect(p101.post_content).toBe(
      'Primeiro parágrafo com aspas "duplas" e it\'s aqui.\r\n\r\nSegundo parágrafo com barra \\ invertida,\r\ncom linha dois; e um ),( estranho 😀.\r\n\r\nTerceiro parágrafo com 100\\% de sentido -- sem comentário.',
    )
    expect(p101.post_name).toBe('conto-da-ma%c3%a7a')
    expect(posts!.find((p) => p.ID === 110)!.post_content).toBe(
      "Conto sem data GMT.\n\nOutro parágrafo, com 'aspas' e 'duplicadas'.",
    )
  })

  it('returns only the requested tables and never the dead prefix', async () => {
    const only = await readWpTables(fixturePath(), { tables: ['posts'] })
    expect(Object.keys(only)).toEqual(['posts'])
    expect(JSON.stringify(only)).not.toContain('Conto do prefixo errado')
    const wrong = await readWpTables(fixturePath(), { tables: ['posts'], prefix: 'wp_' })
    expect(wrong.posts).toEqual([{ ID: 1, post_title: 'Conto do prefixo errado' }])
  })

  it('applies rowFilter while parsing', async () => {
    const { postmeta } = await readWpTables(fixturePath(), { tables: ['postmeta'], rowFilter: keepMeta })
    expect(postmeta!.map((m) => m.meta_key).sort()).toEqual([
      '_elementor_edit_mode',
      '_elementor_edit_mode',
      '_members_access_role',
      '_members_access_role',
    ])
  })

  it('supports INSERT with an explicit column list and per-row inserts', async () => {
    const sql = [
      '-- comentário com ; dentro',
      "INSERT INTO `wp26_terms` (`slug`,`term_id`) VALUES ('a;b',1);",
      "INSERT INTO `wp26_terms` (`slug`,`term_id`) VALUES ('c',2);",
      "INSERT INTO `wp26_other` VALUES ('ignorado');",
    ].join('\n')
    const { terms } = await readWpTables(chunkedStream(sql, 5), { tables: ['terms'] })
    expect(terms).toEqual([
      { slug: 'a;b', term_id: 1 },
      { slug: 'c', term_id: 2 },
    ])
  })
})

describe('extractContos', () => {
  async function contos() {
    const tables = await readWpTables(fixturePath(), { tables: ALL, rowFilter: keepMeta })
    return extractContos(tables)
  }

  it('returns exactly the published posts of the contos category, oldest first', async () => {
    const list = await contos()
    expect(list.map((c) => c.wpId)).toEqual([101, 102, 103, 104, 110])
    expect(list.map((c) => c.restricted)).toEqual([false, false, true, false, false])
    expect(list.map((c) => c.builder)).toEqual([false, true, false, false, false])
  })

  it('keeps the slug byte for byte, decodes the title and converts dates', async () => {
    const list = await contos()
    expect(list[0]!.wpSlug).toBe('conto-da-ma%c3%a7a')
    expect(list[1]!.title).toBe('Conto & Elementor')
    expect(list[0]!.publishedAt).toBe('2025-01-10T13:00:00.000Z')
    // post_date_gmt zero: post_date read as America/Sao_Paulo (UTC-3)
    expect(list[4]!.publishedAt).toBe('2025-03-02T01:00:00.000Z')
  })

  it('never outputs author or user data', async () => {
    const json = JSON.stringify(await contos())
    expect(json).not.toContain('Fulano Sentinela')
    expect(json).not.toContain('fulano.sentinela@exemplo.test')
    expect(json).not.toContain('post_author')
  })

  it('throws when the Contos category is missing', () => {
    expect(() => extractContos({ terms: [], term_taxonomy: [], term_relationships: [], posts: [], postmeta: [] })).toThrow(
      'Categoria "contos" não encontrada no dump.',
    )
  })
})

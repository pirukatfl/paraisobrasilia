import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { REDACTED_LABEL } from '@/lib/classisex/redact'
import { plainTextOf } from '@/lib/contos/excerpt'
import { readWpTables, type WpTables } from '@/lib/contos/wp-dump'
import { buildDicaRecords, formatDicasReport, pickResumo, type DicaRecord } from '@/lib/dicas/import'
import { DICAS_META_KEYS, DICAS_TABLES, dicasRowFilter, extractDicas, type WpDica } from '@/lib/dicas/wp-dump'

import { fixturePath } from '../helpers/wp-dicas-fixture'

const words = (n: number, prefix = 'palavra') => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(' ')
const paragraphs = (...texts: string[]) => texts.join('\n\n')

let n = 5000
function mk(html: string, extra: Partial<WpDica> = {}): WpDica {
  n++
  return {
    wpId: n,
    wpSlug: `dica-${n}`,
    title: `Dica ${n}`,
    html,
    publishedAt: '2025-01-01T12:00:00.000Z',
    restricted: false,
    builder: false,
    excerpt: '',
    seoDescription: null,
    capaWp: null,
    ...extra,
  }
}

const SENTINEL_TITLES = ['Dica sentinela alfa', 'Titulo real da terceira dica', 'Dica com descricao SEO']
const SENTINEL_TEXTS = ['Primeiro bloco sentinela alfa.', 'Terceira dica sentinela.', 'Chame no (61) 99999-0000']

describe('extractDicas / dicasRowFilter (synthetic fixture)', () => {
  let tables: WpTables
  let dicas: WpDica[]
  beforeAll(async () => {
    tables = await readWpTables(fixturePath(), { tables: DICAS_TABLES, rowFilter: dicasRowFilter })
    dicas = extractDicas(tables)
  })

  it('keeps only published posts of dicas-hot (also those in postdev), oldest first', () => {
    expect(dicas).toHaveLength(11)
    const ids = dicas.map((d) => d.wpId)
    for (const gone of [209, 210, 290, 291, 292]) expect(ids).not.toContain(gone) // draft, contos only, attachments, revision
    expect(ids).toContain(211) // dicas-hot + postdev
    const dates = dicas.map((d) => d.publishedAt)
    expect([...dates].sort()).toEqual(dates)
  })

  it('reads excerpt, SEO description (Yoast wins over Rank Math), builder, restricted and cover', () => {
    const by = (id: number) => dicas.find((d) => d.wpId === id)!
    expect(by(201).excerpt).toBe('Resumo sentinela da dica alfa.')
    expect(by(201).capaWp).toBe('2024/05/capa-dica.jpg')
    expect(by(208).seoDescription).toBe('Descricao SEO sentinela da dica oito.')
    expect(by(213).seoDescription).toBe('Descricao Rank Math sentinela da dica 213.')
    expect(by(202).builder).toBe(true)
    expect(by(211).restricted).toBe(true)
    expect(by(203).capaWp).toBeNull()
  })

  it('rejects an unsafe cover path (relative traversal)', () => {
    expect(dicas.find((d) => d.wpId === 212)!.capaWp).toBeNull()
  })

  it('the row filter keeps only the known meta keys and real posts; _elementor_data and users never come through', () => {
    const keys = new Set((tables.postmeta ?? []).map((m) => String(m.meta_key)))
    for (const k of keys) expect((DICAS_META_KEYS as readonly string[]).includes(k)).toBe(true)
    expect(keys.has('_elementor_data')).toBe(false)
    expect(keys.has('_edit_lock')).toBe(false)
    expect((tables.posts ?? []).every((p) => p.post_type === 'post')).toBe(true)
    expect(tables.users).toBeUndefined()
    expect(DICAS_TABLES).not.toContain('users')
    expect(DICAS_TABLES).not.toContain('comments')
    // post_author never reaches the extracted shape
    expect(JSON.stringify(dicas)).not.toContain('post_author')
  })

  it('rejects absolute, backslash and ".." cover paths', () => {
    const base = { terms: [{ term_id: 3, slug: 'dicas-hot' }], term_taxonomy: [{ term_taxonomy_id: 13, term_id: 3, taxonomy: 'category' }] }
    for (const [attached, expected] of [
      ['/etc/passwd', null],
      ['C:\\fotos\\a.jpg', null],
      ['2024\\05\\a.jpg', null],
      ['2024/../../a.jpg', null],
      ['2024/05/ok.jpg', '2024/05/ok.jpg'],
    ] as const) {
      const t: WpTables = {
        ...base,
        term_relationships: [{ object_id: 1, term_taxonomy_id: 13 }],
        posts: [{ ID: 1, post_type: 'post', post_status: 'publish', post_name: 'x', post_title: 'X', post_content: 'a', post_excerpt: '', post_date_gmt: '2025-01-01 00:00:00' }],
        postmeta: [
          { post_id: 1, meta_key: '_thumbnail_id', meta_value: '9' },
          { post_id: 9, meta_key: '_wp_attached_file', meta_value: attached },
        ],
      }
      expect(extractDicas(t)[0]!.capaWp).toBe(expected)
    }
  })
})

describe('buildDicaRecords (synthetic fixture)', () => {
  let result: ReturnType<typeof buildDicaRecords>
  beforeAll(async () => {
    const tables = await readWpTables(fixturePath(), { tables: DICAS_TABLES, rowFilter: dicasRowFilter })
    result = buildDicaRecords(extractDicas(tables))
  })
  const rec = (slug: string) => result.records.find((r) => r.slug === slug) as DicaRecord
  const row = (slug: string) => result.report.rows.find((r) => r.slug === slug)!

  it('imports 9 records, ignores the empty one and drops the duplicate', () => {
    expect(result.records).toHaveLength(9)
    expect(result.report).toMatchObject({ encontradas: 11, ignoradas: 1, duplicadas: 1, builder: 1, comCapa: 1, restritas: 1, rascunhos: 1 })
    expect(row('dica-vazia')).toMatchObject({ status: 'ignorada', flags: ['vazio'] })
    expect(result.records.map((r) => r.wpId)).not.toContain(205)
    expect(result.records.map((r) => r.wpId)).not.toContain(204)
    expect(row('dica-sentinela-alfa-copia').flags).toContain('duplicado-de:dica-sentinela-alfa')
  })

  it('legado has exactly one entry per extracted post; null for empty/short, keeper for the duplicate', () => {
    expect(result.legado).toHaveLength(11)
    const by = (wpSlug: string) => result.legado.find((l) => l.wpSlug === wpSlug)
    expect(by('dica-vazia')).toEqual({ wpSlug: 'dica-vazia', slug: null })
    expect(by('dica-curta')).toEqual({ wpSlug: 'dica-curta', slug: null })
    expect(by('dica-sentinela-alfa-copia')).toEqual({ wpSlug: 'dica-sentinela-alfa-copia', slug: 'dica-sentinela-alfa' })
    expect(by('7013-2')).toEqual({ wpSlug: '7013-2', slug: 'titulo-real-da-terceira-dica' })
    // every non-null legado slug is a published record
    for (const l of result.legado) {
      if (l.slug) expect(result.records.find((r) => r.slug === l.slug)?.publicar, l.slug).toBe(true)
    }
  })

  it('publishes at 60 words or more, otherwise a draft flagged curto and revisar', () => {
    expect(rec('dica-sentinela-alfa').publicar).toBe(true)
    const curta = rec('dica-curta')
    expect(curta).toMatchObject({ publicar: false, revisar: true })
    expect(row('dica-curta')).toMatchObject({ status: 'rascunho' })
    expect(row('dica-curta').flags).toContain('curto')
  })

  it('numeric slug with a real title uses the title; numeric title is derived from the text', () => {
    expect(rec('titulo-real-da-terceira-dica').title).toBe('Titulo real da terceira dica')
    const untitled = result.records.find((r) => r.wpId === 213)!
    expect(row(untitled.slug).flags).toContain('sem-titulo')
    expect(untitled.title.startsWith('Texto sem titulo')).toBe(true)
    expect(untitled.revisar).toBe(true)
  })

  it('Elementor post is flagged builder + imagens-removidas and marked revisar', () => {
    expect(row('dica-montada').flags).toEqual(expect.arrayContaining(['builder', 'imagens-removidas']))
    expect(rec('dica-montada').revisar).toBe(true)
    expect(plainTextOf(rec('dica-montada').texto)).not.toContain('elementor-template')
  })

  it('contacts are removed AND the label is gone from the text (I-7); revisar is set', () => {
    const r = rec('dica-com-contatos')
    const plain = plainTextOf(r.texto)
    expect(plain).not.toContain(REDACTED_LABEL)
    expect(plain).not.toContain('99999')
    expect(plain).not.toContain('@')
    expect(plain).toContain('Chame no')
    expect(r.revisar).toBe(true)
    expect(row('dica-com-contatos').flags).toContain('contatos-removidos')
  })

  it('resumo: SEO description, then excerpt, then null with the resumo-do-texto flag', () => {
    expect(rec('dica-com-seo').resumo).toBe('Descricao SEO sentinela da dica oito.')
    expect(rec('dica-sentinela-alfa').resumo).toBe('Resumo sentinela da dica alfa.')
    expect(rec('dica-postdev').resumo).toBeNull()
    expect(row('dica-postdev').flags).toContain('resumo-do-texto')
    expect(row('dica-com-seo').flags).not.toContain('resumo-do-texto')
  })

  it('keeps the cover path only for the dica that has a safe one', () => {
    expect(rec('dica-sentinela-alfa').capaWp).toBe('2024/05/capa-dica.jpg')
    expect(result.records.filter((r) => r.capaWp !== null)).toHaveLength(1)
  })

  it('the report prints counts and slugs only, never a title or a sentence of text', () => {
    const out = formatDicasReport(result.report)
    expect(out.split('\n')[0]).toBe(
      'Dicas encontradas: 11 · montadas no Elementor: 1 · com capa: 1 · restritas no site antigo: 1 · rascunhos: 1 · ignoradas: 1 · duplicadas: 1 · para conferir: 4',
    )
    expect(out).toContain('dica-sentinela-alfa · 88 palavras · publicada · capa')
    for (const sentinel of [...SENTINEL_TITLES, ...SENTINEL_TEXTS, 'Resumo sentinela', 'Descricao SEO', 'fulano', 'Fulano']) {
      expect(out).not.toContain(sentinel)
    }
  })
})

describe('buildDicaRecords (unit cases)', () => {
  it('does NOT remove a trailing "Por isso..." paragraph (I-4)', () => {
    const { records } = buildDicaRecords([mk(paragraphs(words(70), 'Por isso, aproveite cada momento.'))])
    expect(plainTextOf(records[0]!.texto)).toContain('Por isso, aproveite cada momento.')
  })

  it('strips leftover shortcodes and flags shortcode-restante', () => {
    const d = mk(`<p>${words(70)} [x_widget a="b"] fim.</p>`)
    const { records, report } = buildDicaRecords([d])
    expect(plainTextOf(records[0]!.texto)).not.toContain('x_widget')
    // htmlToLexical may already drop it; either way the record is clean
    expect(report.rows[0]!.words).toBeGreaterThan(60)
  })

  it('flags mojibake and marks revisar', () => {
    const { records, report } = buildDicaRecords([mk(`Isso nÃ£o saiu bem. ${words(70)}`)])
    expect(report.rows[0]!.flags).toContain('mojibake')
    expect(records[0]!.revisar).toBe(true)
  })

  it('a duplicate whose keeper is a draft points nowhere in legado', () => {
    const text = words(20, 'curta')
    const a = mk(text, { publishedAt: '2025-01-01T00:00:00.000Z', wpSlug: 'curta-a' })
    const b = mk(text, { publishedAt: '2025-02-01T00:00:00.000Z', wpSlug: 'curta-b' })
    const { legado } = buildDicaRecords([a, b])
    expect(legado).toEqual([
      { wpSlug: 'curta-a', slug: null },
      { wpSlug: 'curta-b', slug: null },
    ])
  })

  it('pickResumo decodes entities, strips tags, removes contacts and cuts at 300 characters', () => {
    expect(pickResumo({ seoDescription: '<b>Olá</b> &amp; tchau', excerpt: '' }).resumo).toBe('Olá & tchau')
    const withContact = pickResumo({ seoDescription: null, excerpt: 'Fale comigo: fulano@exemplo.test agora' })
    expect(withContact.resumo).not.toContain('@')
    expect(withContact.resumo).not.toContain(REDACTED_LABEL)
    expect(withContact.contacts).toBe(true)
    const long = pickResumo({ seoDescription: words(200), excerpt: '' }).resumo!
    expect(long.length).toBeLessThanOrEqual(300)
    expect(long.endsWith('…')).toBe(true)
    expect(pickResumo({ seoDescription: '   ', excerpt: '' }).resumo).toBeNull()
  })
})

describe('fixture path', () => {
  it('lives under tests/fixtures', () => {
    expect(path.basename(fixturePath())).toBe('wp-dicas-mini.sql')
  })
})

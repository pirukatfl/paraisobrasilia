import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

import { plainTextOf } from '@/lib/contos/excerpt'
import {
  buildImportRecords,
  formatReport,
  readBundle,
  writeBundle,
  type ContoRecord,
} from '@/lib/contos/import'
import { extractContos, readWpTables, WP_META_KEYS, type WpConto } from '@/lib/contos/wp-dump'

import { fixturePath } from '../helpers/wp-dump-fixture'

const TABLES = ['posts', 'terms', 'term_taxonomy', 'term_relationships', 'postmeta']
const words = (n: number, prefix = 'palavra') => Array.from({ length: n }, (_, i) => `${prefix}${i}`).join(' ')

let n = 1000
function mk(html: string, extra: Partial<WpConto> = {}): WpConto {
  n++
  return {
    wpId: n,
    wpSlug: `conto-${n}`,
    title: `Conto ${n}`,
    html,
    publishedAt: '2025-01-01T12:00:00.000Z',
    restricted: false,
    builder: false,
    ...extra,
  }
}
const paragraphs = (...texts: string[]) => texts.join('\n\n')

describe('buildImportRecords from the synthetic fixture', () => {
  let fixtureContos: WpConto[]
  beforeAll(async () => {
    const tables = await readWpTables(fixturePath(), {
      tables: TABLES,
      rowFilter: (t, row) => t !== 'postmeta' || (WP_META_KEYS as readonly string[]).includes(String(row.meta_key)),
    })
    fixtureContos = extractContos(tables)
  })

  it('builds the five records with decoded titles, normalised slugs and 3 open paragraphs', () => {
    const { records, report } = buildImportRecords(fixtureContos)
    expect(records).toHaveLength(5)
    expect(records.every((r) => r.paragrafosAbertos === 3)).toBe(true)
    const classico = records.find((r) => r.wpId === 101)!
    expect(classico.slug).toBe('conto-da-maca')
    expect(classico.wpSlug).toBe('conto-da-ma%c3%a7a')
    expect(report.rows.find((r) => r.slug === 'conto-da-maca')!.flags).toContain('slug-alterado')
    expect(records.find((r) => r.wpId === 102)!.title).toBe('Conto & Elementor')
    expect(records.find((r) => r.wpId === 103)!.wpRestrito).toBe(true)
    expect(report.rows.find((r) => r.slug === 'conto-elementor')!.flags).toContain('builder')
    expect(report).toMatchObject({ contos: 5, restritos: 1, builder: 1, ignorados: 0 })
  })

  it('keeps the story sentences and drops no author data', () => {
    const { records } = buildImportRecords(fixtureContos)
    const text = plainTextOf(records.find((r) => r.wpId === 101)!.texto)
    expect(text).toContain('Primeiro parágrafo com aspas "duplas"')
    expect(JSON.stringify(records)).not.toMatch(/Fulano Sentinela|fulano\.sentinela|post_author/)
  })

  it('formatReport has the counts line and one line per slug, never titles or text', () => {
    const { records, report } = buildImportRecords(fixtureContos)
    const out = formatReport(report)
    expect(out).toContain('Contos encontrados: 5 · restritos no site antigo: 1 · montados no Elementor: 1 · ignorados: 0')
    expect(out.split('\n')).toHaveLength(1 + 5)
    for (const sentence of ['Primeiro parágrafo', 'Segundo bloco', 'Conto clássico', 'Conto sem data', 'Conto restrito']) {
      expect(out).not.toContain(sentence)
    }
    for (const r of records) expect(out).toContain(r.slug)
  })
})

describe('buildImportRecords rules', () => {
  it('removes a short trailing byline but keeps a long last paragraph starting with "Por"', () => {
    const body = paragraphs(words(30), words(30), words(30), 'Por Fulana de Tal')
    const a = buildImportRecords([mk(body)])
    expect(plainTextOf(a.records[0]!.texto)).not.toContain('Fulana')
    expect(a.report.rows[0]!.flags).toContain('assinatura-removida')

    const long = `Por isso mesmo ${words(20)}`
    const b = buildImportRecords([mk(paragraphs(words(30), words(30), words(30), long))])
    expect(plainTextOf(b.records[0]!.texto)).toContain('Por isso mesmo')
    expect(b.report.rows[0]!.flags).not.toContain('assinatura-removida')
  })

  it('replaces phones and e-mails with the redaction label', () => {
    const { records, report } = buildImportRecords([
      mk(paragraphs('Chame no (61) 98877-6655 ou fulana@exemplo.test hoje', words(30), words(30), words(30))),
    ])
    const text = plainTextOf(records[0]!.texto)
    expect(text).toContain('[contato só para assinantes]')
    expect(text).not.toContain('98877')
    expect(text).not.toContain('fulana@exemplo.test')
    expect(report.rows[0]!.flags).toContain('contatos-removidos')
  })

  it('flags short, too-open, single-paragraph, mojibake and leftover shortcodes', () => {
    const six = paragraphs(words(5), words(5), words(5), words(5), words(5), words(5))
    expect(buildImportRecords([mk(six)]).report.rows[0]!.flags).toContain('curto')

    // the open cap (max(150 words, 15%)) only leaves room for 'aberto-demais' on short stories
    const open = paragraphs(words(40, 'a'), words(40, 'b'), words(40, 'c'), words(10, 'd'))
    expect(buildImportRecords([mk(open)]).report.rows[0]!.flags).toContain('aberto-demais')

    const single = buildImportRecords([mk(words(120))]).report.rows[0]!
    expect(single.flags).toContain('sem-paragrafos')

    expect(buildImportRecords([mk(six, { title: 'Conto de manhÃ£' })]).report.rows[0]!.flags).toContain('mojibake')

    // &nbsp; keeps the shortcode out of the converter's pre-clean; it decodes into a space afterwards
    const left = buildImportRecords([mk(`<p>Texto [algo&nbsp;id=1] mais ${words(40)}</p><p>${words(40)}</p>`)])
    expect(left.report.rows[0]!.flags).toContain('shortcode-restante')
  })

  it('skips contos that are empty after conversion', () => {
    const { records, report } = buildImportRecords([mk('<p>&nbsp;</p>'), mk(words(80))])
    expect(records).toHaveLength(1)
    expect(report.ignorados).toBe(1)
    expect(report.rows[0]!.flags).toContain('vazio')
  })

  it('gives colliding slugs a numeric suffix', () => {
    const { records, report } = buildImportRecords([
      mk(words(80, 'um'), { wpSlug: 'Mesmo-Nome' }),
      mk(words(80, 'dois'), { wpSlug: 'mesmo-nome' }),
    ])
    expect(records.map((r) => r.slug)).toEqual(['mesmo-nome', 'mesmo-nome-2'])
    expect(report.rows[1]!.flags).toContain('slug-alterado')
  })
})

describe('buildImportRecords quality rules', () => {
  const sent = (n: number, prefix: string) =>
    Array.from({ length: n }, (_, i) => `${prefix}${i} um dois tres quatro cinco.`).join(' ')

  it('splits a one-giant-paragraph story into real paragraphs and keeps the open part small', () => {
    const { records, report } = buildImportRecords([mk(`<p>${sent(150, 'g')}</p>`)])
    expect(records[0]!.texto.root.children.length).toBeGreaterThan(3)
    const row = report.rows[0]!
    expect(row.flags).not.toContain('sem-paragrafos')
    expect(row.flags).not.toContain('aberto-demais')
    expect(row.openWords).toBeLessThanOrEqual(150)
  })

  it('skips exact duplicates, keeping the oldest, and reports duplicado-de', () => {
    const body = `<p>${words(60, 'dup')}</p><p>${words(60, 'dup2')}</p>`
    const { records, report } = buildImportRecords([
      mk(body, { wpSlug: 'meu-conto-copy', publishedAt: '2025-03-01T00:00:00.000Z' }),
      mk(body.toUpperCase(), { wpSlug: 'meu-conto-copy-3', publishedAt: '2025-04-01T00:00:00.000Z' }),
      mk(body, { wpSlug: 'meu-conto', publishedAt: '2024-01-01T00:00:00.000Z' }),
      mk(`<p>${words(80, 'outro')}</p>`),
    ])
    expect(records[0]!.slug).toBe('meu-conto')
    expect(records).toHaveLength(2)
    expect(report.duplicados).toBe(2)
    expect(report.rows[0]!.flags).toContain('duplicado-de:meu-conto')
    expect(report.rows[1]!.flags).toContain('duplicado-de:meu-conto')
    expect(formatReport(report)).toContain('duplicados: 2')
  })

  it('derives title and slug from the text for untitled posts with numeric slugs', () => {
    const { records, report } = buildImportRecords([
      mk(`<p>Era uma noite quente em Brasilia quando tudo comecou ${words(60)}</p><p>${words(40, 'x')}</p>`, {
        wpSlug: '4384-2',
        title: '',
      }),
    ])
    expect(records[0]!.slug).toBe('era-uma-noite-quente-em-brasilia')
    expect(records[0]!.title).toBe('Era uma noite quente em Brasilia quando tudo')
    expect(report.rows[0]!.flags).toContain('sem-titulo')
    expect(report.rows[0]!.flags).toContain('slug-alterado')
  })

  it('uses the title for a numeric slug that has a title', () => {
    const { records, report } = buildImportRecords([
      mk(paragraphs(words(60), words(60)), { wpSlug: '4464-2', title: 'Uma Noite Boa' }),
    ])
    expect(records[0]!.slug).toBe('uma-noite-boa')
    expect(report.rows[0]!.flags).not.toContain('sem-titulo')
  })

  it('strips leftover shortcodes fully and does not flag the redaction label', () => {
    const html = `<p>Antes [algo&nbsp;id=1 x=2] depois [/algo] ${words(40)} chame 61 98877-6655</p><p>${words(40, 'k')}</p>`
    const { records, report } = buildImportRecords([mk(html)])
    const text = plainTextOf(records[0]!.texto)
    expect(text).not.toMatch(/\[\/?algo/)
    expect(text).toContain('Antes depois')
    expect(text).toContain('[contato só para assinantes]')
    expect(report.rows[0]!.flags).toContain('shortcode-restante')

    const onlyContact = buildImportRecords([mk(`<p>${words(40)} fulana@exemplo.test</p><p>${words(40, 'k')}</p>`)])
    expect(onlyContact.report.rows[0]!.flags).toContain('contatos-removidos')
    expect(onlyContact.report.rows[0]!.flags).not.toContain('shortcode-restante')
  })
})

describe('bundle', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bundle-'))

  it('round-trips and rejects wrong versions or missing fields', () => {
    const { records } = buildImportRecords([mk(paragraphs(words(30), words(30), words(30), words(30)))])
    const file = path.join(dir, 'b.json')
    writeBundle(file, records, new Date('2026-10-20T12:00:00Z'))
    expect(readBundle(file)).toEqual(records as ContoRecord[])

    const v2 = path.join(dir, 'v2.json')
    fs.writeFileSync(v2, JSON.stringify({ version: 2, contos: [] }))
    expect(() => readBundle(v2)).toThrow('Arquivo de contos inválido.')

    const bad = path.join(dir, 'bad.json')
    fs.writeFileSync(bad, JSON.stringify({ version: 1, contos: [{ wpId: 1 }] }))
    expect(() => readBundle(bad)).toThrow('Arquivo de contos inválido.')
    expect(() => readBundle(path.join(dir, 'nao-existe.json'))).toThrow('Arquivo de contos inválido.')
  })
})

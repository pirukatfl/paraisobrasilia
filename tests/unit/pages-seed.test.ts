import type { SanitizedConfig } from 'payload'
import { beforeAll, describe, expect, it } from 'vitest'

import { markdownToLexical } from '../../src/migrations/seed/markdown-to-lexical'
import { PAGES_SEED } from '../../src/migrations/seed/pages-content'
import { PAGE_KEYS } from '../../src/lib/pages/keys'

type Node = { type: string; children?: Node[]; listType?: string; text?: string }

const find = (node: Node, pred: (n: Node) => boolean): Node[] => [
  ...(pred(node) ? [node] : []),
  ...(node.children ?? []).flatMap((c) => find(c, pred)),
]

describe('institutional page seeds (INST-01, INST-06)', () => {
  let config: SanitizedConfig

  beforeAll(async () => {
    config = await (await import('../../src/payload.config')).default
  })

  it('has one entry per fixed key', () => {
    expect(PAGES_SEED.map((p) => p.key).sort()).toEqual([...PAGE_KEYS].sort())
    for (const p of PAGES_SEED) expect(p.intro.length).toBeLessThanOrEqual(200)
  })

  it('every seed converts to a non-empty Lexical document', async () => {
    for (const page of PAGES_SEED) {
      const state = (await markdownToLexical(page.markdown, config)) as unknown as { root: Node }
      expect(state.root.children?.length, page.key).toBeGreaterThan(0)
    }
  })

  it('Regras is a numbered list of 10 rules', async () => {
    const regras = PAGES_SEED.find((p) => p.key === 'regras')!
    const state = (await markdownToLexical(regras.markdown, config)) as unknown as { root: Node }
    const lists = find(state.root, (n) => n.type === 'list')
    expect(lists).toHaveLength(1)
    expect(lists[0].children).toHaveLength(10)
  })

  it('headings are h2 and links survive', async () => {
    const priv = PAGES_SEED.find((p) => p.key === 'privacidade')!
    const state = (await markdownToLexical(priv.markdown, config)) as unknown as { root: Node }
    expect(find(state.root, (n) => n.type === 'heading').length).toBeGreaterThan(5)
    expect(find(state.root, (n) => n.type === 'link').length).toBeGreaterThanOrEqual(2)
  })

  it('keeps editor notes out and the lawyer markers in', () => {
    for (const page of PAGES_SEED) {
      expect(page.markdown).not.toContain('[Conteúdo redigido]')
      expect(page.markdown).not.toContain('> **RASCUNHO')
      expect(page.markdown).not.toContain('[Confirmar com o cliente]')
      expect(page.markdown).not.toContain('Última atualização')
    }
    const termos = PAGES_SEED.find((p) => p.key === 'termos')!
    const priv = PAGES_SEED.find((p) => p.key === 'privacidade')!
    expect(termos.markdown).toContain('[VALIDAR')
    expect(priv.markdown).toContain('[VALIDAR')
    expect(priv.markdown).toContain('Pedido de remoção de imagem')
    expect(priv.markdown).toContain('WhatsApp (61) 99988-9772')
    expect(priv.markdown).toContain('em até 24 horas')
  })
})

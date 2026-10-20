import { describe, expect, it } from 'vitest'

import { PAGE_KEYS } from '../../src/lib/pages/keys'
import { buildSitemap } from '../../src/lib/seo/sitemap'

const base = 'https://novo.swingbrasilia.com.br/'
const pages = PAGE_KEYS.map((key) => ({ key, updatedAt: '2026-10-19T12:00:00.000Z' }))
const paths = (entries: { url: string }[]) => entries.map((e) => e.url.replace('https://novo.swingbrasilia.com.br', ''))

describe('sitemap (INST-06, T-02-13)', () => {
  it('lists the open pages and leaves /modelos out while no model is published', () => {
    const urls = paths(buildSitemap({ base, parties: [], pages, hasModels: false }))
    expect(urls).toEqual(
      expect.arrayContaining([
        '/',
        '/contato',
        '/espaco',
        '/quem-somos',
        '/quem-somos/normas',
        '/quem-somos/regras',
        '/quem-somos/dicas',
        '/termos-de-uso',
        '/politica-de-privacidade',
        '/assine-ja',
        '/classisex',
        '/contos',
      ]),
    )
    expect(urls).not.toContain('/modelos')
    expect(urls).not.toContain('/recados') // mural removed 2026-10-20 (R-08)
    expect(urls).toHaveLength(12)
  })

  it('includes /modelos and upcoming parties when present', () => {
    const urls = paths(
      buildSitemap({ base, parties: [{ slug: 'festa-x', updatedAt: '2026-10-19T12:00:00.000Z' }], pages: [], hasModels: true }),
    )
    expect(urls).toContain('/modelos')
    expect(urls).toContain('/festas/festa-x')
    expect(urls).not.toContain('/quem-somos') // unpublished pages are not passed in
  })

  it('lists published contos and never the members contos (05-03)', () => {
    const urls = paths(
      buildSitemap({ base, parties: [], pages: [], hasModels: false, contos: [{ slug: 'conto-um', updatedAt: '2026-10-19T12:00:00.000Z' }] }),
    )
    expect(urls).toContain('/contos')
    expect(urls).toContain('/contos/conto-um')
    for (const url of urls) expect(url).not.toMatch(/^\/area-do-assinante/)
  })

  it('lists /assine-ja and never the members or auth pages (T-03-05)', () => {
    const urls = paths(buildSitemap({ base, parties: [], pages, hasModels: true }))
    expect(urls).toContain('/assine-ja')
    expect(urls).toContain('/classisex') // public preview (PREV-01); the full board is members-only
    for (const url of urls) {
      expect(url).not.toMatch(/^\/(area-do-assinante|entrar|nova-senha|esqueci-senha)/)
    }
  })
})

import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import nextConfig from '../../next.config'
import { buildLegacyRedirects, parseOldUrls, renderLegacyModule } from '@/lib/redirects/build'
import { LEGACY_REDIRECTS, LEGACY_SEM_DESTINO } from '@/lib/redirects/legacy-redirects'

const root = path.resolve(__dirname, '../..')
const markdown = fs.readFileSync(path.join(root, '.planning/phases/06-migra-o-do-wordpress/06-OLD-URLS.md'), 'utf8')
const bundle = (JSON.parse(fs.readFileSync(path.join(root, 'src/migrations/seed/contos-wp.json'), 'utf8')) as {
  contos: { wpSlug: string; slug: string }[]
}).contos.map((c) => ({ wpSlug: c.wpSlug, slug: c.slug }))
const slugs = new Set(bundle.map((c) => c.slug))

function listPages(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) listPages(p, out)
    else if (e.name === 'page.tsx') out.push(p)
  }
  return out
}

/** Routes of the new site as regexes (route groups dropped, [param] = one segment, [...x] skipped). */
const frontend = path.join(root, 'src/app/(frontend)')
const routePatterns = listPages(frontend)
  .map((f) => path.relative(frontend, path.dirname(f)).split(path.sep).filter((s) => s && !/^\(.*\)$/.test(s)))
  .filter((segs) => !segs.some((s) => s.startsWith('[...')))
  .map((segs) => '/' + segs.join('/'))
const routeRegexes = routePatterns.map(
  (r) => new RegExp('^' + r.replace(/\[[^\]]+\]/g, '[^/]+').replace(/\//g, '\\/') + '$'),
)
const isRoute = (p: string) => routeRegexes.some((re) => re.test(p))
const validDestination = (d: string) => {
  if (d === '/sitemap.xml') return true
  const m = /^\/contos\/([^/]+)$/.exec(d)
  if (m) return slugs.has(m[1]!)
  return isRoute(d)
}

const result = buildLegacyRedirects(markdown, bundle)
const get = (source: string) => result.redirects.find((r) => r.source === source)?.destination

describe('parseOldUrls', () => {
  it('reads the inventory', () => {
    const urls = parseOldUrls(markdown)
    expect(urls.filter((u) => u.kind === 'pagina')).toHaveLength(20)
    expect(urls.filter((u) => u.kind === 'post')).toHaveLength(100)
    expect(urls.filter((u) => u.kind === 'categoria')).toHaveLength(4)
    expect(urls.find((u) => u.path === '/4716-2/')?.categorias).toEqual(['contos', 'postdev'])
  })
})

describe('buildLegacyRedirects', () => {
  it('maps the important links', () => {
    expect(get('/classisex1')).toBe('/classisex')
    expect(get('/4384-2')).toBe('/contos/engole-minha-pica-sua-puta-safada')
    expect(get('/a-amante-da-minha-mulher')).toBe('/contos/a-amante-da-minha-mulher')
    expect(get('/regras-da-casa')).toBe('/quem-somos/regras')
    expect(get('/beijo-grego')).toBeUndefined()
    expect(result.semDestino).toContain('/beijo-grego')
    expect(get('/barraca-armada')).toBe('/contos')
    expect(get('/assine-ja')).toBeUndefined()
    expect(get('/mural')).toBe('/classisex')
    expect(get('/wp-login.php')).toBe('/entrar')
    expect(get('/membros/:path*')).toBe('/classisex')
  })

  it('every entry is well formed and points to an existing page', () => {
    const sources = new Set<string>()
    for (const r of result.redirects) {
      expect(r.source.startsWith('/')).toBe(true)
      expect(r.source.length === 1 || !r.source.endsWith('/')).toBe(true)
      expect(r.statusCode).toBe(301)
      expect(validDestination(r.destination), `${r.source} -> ${r.destination}`).toBe(true)
      expect(sources.has(r.source), `duplicado ${r.source}`).toBe(false)
      sources.add(r.source)
    }
    expect(result.redirects.length).toBeGreaterThanOrEqual(100)
  })

  it('shadows no page of the new site', () => {
    const toRegex = (s: string) =>
      new RegExp(
        '^' +
          s
            .replace(/\/:[A-Za-z]+\*/g, '(?:/.*)?')
            .replace(/:[A-Za-z]+/g, '[^/]+')
            .replace(/\./g, '\\.') +
          '$',
      )
    const samples = [
      ...routePatterns.map((r) => r.replace(/\[[^\]]+\]/g, 'x')),
      '/admin',
      '/admin/collections/assinantes',
      '/api/assinantes/login',
      '/_next/static/x.js',
      '/area-do-assinante',
      '/area-do-assinante/mensagens',
      '/contos/engole-minha-pica-sua-puta-safada',
    ]
    for (const r of result.redirects) {
      const re = toRegex(r.source)
      for (const s of samples) {
        if (s === '/sitemap.xml') continue
        expect(re.test(s), `${r.source} esconde ${s}`).toBe(false)
      }
    }
  })

  it('accounts for every inventoried path', () => {
    for (const u of parseOldUrls(markdown)) {
      if (u.kind === 'categoria') continue
      const p = '/' + u.path.replace(/^\/+|\/+$/g, '')
      const ok = get(p) !== undefined || result.semDestino.includes(p) || isRoute(p)
      expect(ok, p).toBe(true)
    }
    for (const s of result.semDestino) {
      const u = parseOldUrls(markdown).find((x) => '/' + x.path.replace(/^\/+|\/+$/g, '') === s)!
      expect(u.categorias.includes('dicas-hot') || s === '/o-que-e-dogging').toBe(true)
    }
  })

  it('the committed map is up to date', () => {
    const file = path.join(root, 'src/lib/redirects/legacy-redirects.ts')
    const rendered = renderLegacyModule(result)
    if (process.env.UPDATE_REDIRECTS === '1') {
      fs.writeFileSync(file, rendered)
      return
    }
    expect(fs.readFileSync(file, 'utf8')).toBe(rendered)
    expect(LEGACY_REDIRECTS).toEqual(result.redirects)
    expect(LEGACY_SEM_DESTINO).toEqual(result.semDestino)
  })
})

describe('next.config redirects', () => {
  it('keeps the existing entries first and appends the legacy map', async () => {
    const list = (await nextConfig.redirects!()) as { source: string }[]
    expect(list[0]!.source).toBe('/recados')
    expect(list[1]!.source).toBe('/area-do-assinante/recados')
    expect(list.slice(2)).toEqual(LEGACY_REDIRECTS)
  })
})

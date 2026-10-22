/**
 * Generator of the old-WordPress-links redirect map (M-05). Pure: no Next, no Payload, no fs.
 * Input: the URL inventory markdown (06-OLD-URLS.md) and the contos bundle pairs (wpSlug -> slug).
 * T-06-08: only wpSlug/slug of the bundle are used; nothing else of the bundle is read.
 */

export type RedirectEntry = { source: string; destination: string; statusCode: 301 }
export type OldUrl = { path: string; kind: 'pagina' | 'post' | 'categoria'; categorias: string[] }

/** Old page slug -> new path; null = the same path exists in the new site (no entry needed). */
export const PAGE_DESTINATIONS: Record<string, string | null> = {
  'assine-ja': null,
  checkout: '/assine-ja',
  contos: null,
  'dicas-hot': '/quem-somos/dicas',
  'envie-seu-conto': '/contato',
  'esqueci-minha-senha': '/esqueci-senha',
  faq: '/quem-somos',
  galeria: '/espaco',
  'galeria-hot': '/modelos',
  home: '/',
  'hot-ia-videos-members': '/area-do-assinante',
  'ia-hot-previa': '/assine-ja',
  'login-ou-cadastro': '/entrar',
  'minha-conta': '/area-do-assinante',
  obrigado: '/',
  'politica-de-privacidade': null,
  quemsomos: '/quem-somos',
  'rede-social': '/classisex',
  'regras-da-casa': '/quem-somos/regras',
  sobreacasa: '/espaco',
}

export const STRUCTURAL_POSTS: Record<string, string> = {
  classisex1: '/classisex',
  mural: '/classisex', // 2026-10-22: o mural antigo virou o ClassiSex
  programacao: '/',
  avisos: '/',
  '3753-2': '/',
}

/** Posts explicitly left to 404 (no equivalent page). */
export const NO_DESTINATION_POSTS: string[] = ['o-que-e-dogging']

const redirect = (source: string, destination: string): RedirectEntry => ({ source, destination, statusCode: 301 })

/** Specific before generic (Next uses the first match). */
export const WILDCARD_REDIRECTS: RedirectEntry[] = [
  ...[
    '/feed',
    '/feed/:path*',
    '/:slug/feed',
    '/:slug/feed/:path*',
    '/wp-login.php',
    '/wp-admin',
    '/wp-admin/:path*',
    '/atividades',
    '/atividades/:path*',
    '/activity',
    '/activity/:path*',
    '/grupos',
    '/grupos/:path*',
    '/groups',
    '/groups/:path*',
    '/forums',
    '/forums/:path*',
    '/forum',
    '/forum/:path*',
    '/account',
    '/account/:path*',
    '/login',
    '/logout',
  ].map((s) => redirect(s, '/entrar')),
  ...['/membros', '/membros/:path*', '/members', '/members/:path*', '/user', '/user/:path*'].map((s) =>
    redirect(s, '/classisex'),
  ),
  redirect('/register', '/cadastro'),
  redirect('/tag/:path*', '/'),
  redirect('/author/:path*', '/'),
  redirect('/image', '/espaco'),
  redirect('/image/:path*', '/espaco'),
  redirect('/assinatura/:path*', '/assine-ja'),
  ...[
    '/wp-sitemap.xml',
    '/sitemap_index.xml',
    '/post-sitemap.xml',
    '/page-sitemap.xml',
    '/category-sitemap.xml',
    '/product-sitemap.xml',
  ].map((s) => redirect(s, '/sitemap.xml')),
]

const slugOf = (path: string) => path.replace(/^\/+|\/+$/g, '')

/** Reads the "Páginas publicadas", "Posts publicados" and "Categorias" lists of 06-OLD-URLS.md. */
export function parseOldUrls(markdown: string): OldUrl[] {
  const out: OldUrl[] = []
  let section: 'pagina' | 'post' | 'categoria' | null = null
  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      if (/^##\s+Páginas publicadas/i.test(line)) section = 'pagina'
      else if (/^##\s+Posts publicados/i.test(line)) section = 'post'
      else if (/^##\s+Categorias/i.test(line)) section = 'categoria'
      else section = null
      continue
    }
    const m = /^-\s+(\/\S*)(.*)$/.exec(line)
    if (!m || !section) continue
    const path = m[1]!
    if (section === 'post') {
      const cats = (m[2] ?? '').replace(/^\s*·\s*/, '')
      out.push({ path, kind: 'post', categorias: cats.split(',').map((c) => c.trim()).filter(Boolean) })
    } else {
      out.push({ path, kind: section, categorias: [] })
    }
  }
  return out
}

export function buildLegacyRedirects(
  markdown: string,
  contos: { wpSlug: string; slug: string }[],
): { redirects: RedirectEntry[]; semDestino: string[] } {
  const bundle = new Map(contos.map((c) => [c.wpSlug, c.slug]))
  const exact: RedirectEntry[] = []
  const semDestino: string[] = []
  const categoryRules: RedirectEntry[] = []

  for (const url of parseOldUrls(markdown)) {
    const slug = slugOf(url.path)
    if (url.kind === 'pagina') {
      if (!(slug in PAGE_DESTINATIONS)) throw new Error(`Página antiga sem destino definido: /${slug}`)
      const dest = PAGE_DESTINATIONS[slug]
      if (dest) exact.push(redirect(`/${slug}`, dest))
    } else if (url.kind === 'post') {
      if (slug in STRUCTURAL_POSTS) {
        exact.push(redirect(`/${slug}`, STRUCTURAL_POSTS[slug]!))
      } else if (NO_DESTINATION_POSTS.includes(slug)) {
        semDestino.push(`/${slug}`)
      } else if (url.categorias.includes('contos')) {
        const novo = bundle.get(slug)
        exact.push(redirect(`/${slug}`, novo ? `/contos/${novo}` : '/contos'))
      } else if (url.categorias.includes('dicas-hot')) {
        semDestino.push(`/${slug}`)
      } else {
        exact.push(redirect(`/${slug}`, '/contos'))
      }
    } else {
      const m = /^\/category\/([^/]+)/.exec(url.path)
      const cat = m?.[1]
      // /contos and /dicas-hot are pages (handled above); the other category slugs go to the home page
      if (cat && cat !== 'contos' && cat !== 'dicas-hot') categoryRules.push(redirect(`/${cat}`, '/'))
    }
  }

  exact.sort((a, b) => a.source.localeCompare(b.source))
  categoryRules.sort((a, b) => a.source.localeCompare(b.source))
  const redirects = [
    ...exact,
    redirect('/category/contos', '/contos'),
    redirect('/category/contos/:path*', '/contos'),
    redirect('/category/:slug', '/'),
    redirect('/category/:slug/:path*', '/'),
    ...categoryRules,
    ...WILDCARD_REDIRECTS,
  ]
  return { redirects, semDestino: semDestino.sort() }
}

export function renderLegacyModule(result: { redirects: RedirectEntry[]; semDestino: string[] }): string {
  const lines = [
    '// Gerado por tests/unit/legacy-redirects.test.ts (UPDATE_REDIRECTS=1). Não edite à mão.',
    '// M-05: links do site antigo -> páginas novas. Fonte: 06-OLD-URLS.md + contos-wp.json (src/lib/redirects/build.ts).',
    '',
    'export const LEGACY_REDIRECTS: { source: string; destination: string; statusCode: 301 }[] = [',
    ...result.redirects.map(
      (r) => `  { source: ${JSON.stringify(r.source)}, destination: ${JSON.stringify(r.destination)}, statusCode: 301 },`,
    ),
    ']',
    '',
    '/** Links antigos sem página equivalente: ficam em 404 de propósito. */',
    'export const LEGACY_SEM_DESTINO: string[] = [',
    ...result.semDestino.map((s) => `  ${JSON.stringify(s)},`),
    ']',
    '',
  ]
  return lines.join('\n')
}

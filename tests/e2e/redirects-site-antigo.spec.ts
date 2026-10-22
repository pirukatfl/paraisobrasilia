import fs from 'node:fs'
import path from 'node:path'

import { expect, test, type APIRequestContext } from '@playwright/test'

import { LEGACY_REDIRECTS } from '../../src/lib/redirects/legacy-redirects'

const dicasBundle = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'src/migrations/seed/dicas-wp.json'), 'utf8'),
) as { legado: { wpSlug: string; slug: string | null }[] }

// M-05 / MIG-03: links of the old WordPress site end in the right new page with permanent redirects.
test.skip(({ isMobile }) => !isMobile, 'HTTP only: one project is enough')

const HEADERS = { cookie: 'pb_age_ok=1' }

async function follow(request: APIRequestContext, start: string) {
  const hops: { url: string; status: number }[] = []
  let url = start
  for (let i = 0; i < 5; i++) {
    const res = await request.get(url, { maxRedirects: 0, headers: HEADERS })
    hops.push({ url, status: res.status() })
    const location = res.headers()['location']
    if (res.status() >= 300 && res.status() < 400 && location) {
      url = new URL(location, 'http://localhost').pathname
      continue
    }
    return { hops, final: url, status: res.status() }
  }
  throw new Error(`redirect demais para ${start}`)
}

const CASES: [string, string][] = [
  ['/classisex1/', '/classisex'],
  ['/quemsomos/', '/quem-somos'],
  ['/regras-da-casa/', '/quem-somos/regras'],
  ['/4384-2/', '/contos/engole-minha-pica-sua-puta-safada'],
  ['/wp-login.php', '/entrar'],
  ['/wp-admin/', '/entrar'],
  ['/feed/', '/entrar'],
  ['/membros/fulano/', '/classisex'],
  ['/atividades/', '/entrar'],
  ['/category/contos/', '/contos'],
  ['/dicas-hot/', '/dicas-hot'],
  ['/category/dicas-hot/', '/dicas-hot'],
  ['/dicas-hot/page/2/', '/dicas-hot'],
  ['/sitemap_index.xml', '/sitemap.xml'],
  ['/login-ou-cadastro/', '/entrar'],
]

for (const [from, to] of CASES) {
  test(`${from} leva a ${to} com redirecionamento permanente`, async ({ request }) => {
    const first = await request.get(from, { maxRedirects: 0, headers: HEADERS })
    expect([301, 308]).toContain(first.status())
    const { hops, final } = await follow(request, from)
    for (const h of hops.filter((x) => x.status >= 300 && x.status < 400)) expect([301, 308]).toContain(h.status)
    expect(final).toBe(to)
  })
}

test('/assine-ja/ termina em /assine-ja com 200', async ({ request }) => {
  const { final, status } = await follow(request, '/assine-ja/')
  expect(final).toBe('/assine-ja')
  expect(status).toBe(200)
})

for (const { wpSlug } of dicasBundle.legado) {
  test(`dica antiga /${wpSlug}/ termina no destino do mapa`, async ({ request }) => {
    const destination = LEGACY_REDIRECTS.find((r) => r.source === `/${wpSlug}`)!.destination
    const { hops, final } = await follow(request, `/${wpSlug}/`)
    for (const h of hops.filter((x) => x.status >= 300 && x.status < 400)) expect([301, 308]).toContain(h.status)
    expect(final).toBe(destination)
  })
}

test('/o-que-e-dogging/ termina em 404', async ({ request }) => {
  const { status, hops } = await follow(request, '/o-que-e-dogging/')
  expect(status).toBe(404)
  for (const h of hops.slice(0, -1)) expect([301, 308]).toContain(h.status)
})

test('/classisex (rota nova) responde 200 sem redirecionar', async ({ request }) => {
  const res = await request.get('/classisex', { maxRedirects: 0, headers: HEADERS })
  expect(res.status()).toBe(200)
})

test('/admin nao e redirecionado pelo mapa', async ({ request }) => {
  const res = await request.get('/admin', { maxRedirects: 0, headers: HEADERS })
  expect(res.status()).not.toBe(301)
})

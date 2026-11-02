import { expect, test } from '@playwright/test'

import { STAFF_EMAIL, STAFF_PASSWORD } from './helpers/staff'

// Lote 4 J: bold/underline made in the panel show on the institutional pages (intro and body) and on the home teaser.
test.describe.configure({ mode: 'serial' })

type Pagina = { id: number | string; intro: unknown; body: unknown }
const originais = new Map<string, Pagina>()

const noTexto = (text: string, format = 0) => ({ type: 'text', version: 1, text, format, detail: 0, mode: 'normal', style: '' })
const paragrafo = (...children: unknown[]) => ({
  type: 'paragraph', version: 1, direction: 'ltr', format: '', indent: 0, textFormat: 0, textStyle: '', children,
})
const estado = (...children: unknown[]) => ({
  root: { type: 'root', version: 1, direction: 'ltr', format: '', indent: 0, children },
})

async function token(request: import('@playwright/test').APIRequestContext) {
  const login = await request.post('/api/users/login', { data: { email: STAFF_EMAIL, password: STAFF_PASSWORD } })
  expect(login.ok()).toBe(true)
  return ((await login.json()) as { token: string }).token
}

async function pagina(request: import('@playwright/test').APIRequestContext, key: string): Promise<Pagina> {
  const t = await token(request)
  const res = await request.get(`/api/pages?where[key][equals]=${key}&depth=0&limit=1`, { headers: { Authorization: `JWT ${t}` } })
  expect(res.ok()).toBe(true)
  return ((await res.json()) as { docs: Pagina[] }).docs[0]
}

async function salvar(request: import('@playwright/test').APIRequestContext, key: string, data: Record<string, unknown>) {
  const p = originais.get(key) ?? (await pagina(request, key))
  originais.set(key, p)
  const t = await token(request)
  const res = await request.patch(`/api/pages/${p.id}`, { headers: { Authorization: `JWT ${t}` }, data: { ...data, _status: 'published' } })
  expect(res.ok(), await res.text()).toBe(true)
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test.afterAll(async ({ request }) => {
  const t = await token(request)
  for (const p of originais.values()) {
    await request.patch(`/api/pages/${p.id}`, { headers: { Authorization: `JWT ${t}` }, data: { intro: p.intro, body: p.body, _status: 'published' } })
  }
})

test('intro and body of Regras keep bold and underline', async ({ page, request }) => {
  await salvar(request, 'regras', {
    intro: estado(paragrafo(noTexto('Introdução ', 0), noTexto('em negrito', 1), noTexto(' e ', 0), noTexto('sublinhada', 8))),
    body: estado(
      paragrafo(noTexto('Corpo com ', 0), noTexto('destaque forte', 1), noTexto(' e ', 0), noTexto('sublinhado no corpo', 8)),
      paragrafo(),
      paragrafo(noTexto('Linha um'), { type: 'linebreak', version: 1 }, noTexto('Linha dois riscada', 4)),
    ),
  })
  await page.goto('/quem-somos/regras')
  const main = page.locator('main')
  await expect(main.locator('strong', { hasText: 'em negrito' })).toBeVisible()
  await expect(main.locator('u', { hasText: 'sublinhada' })).toBeVisible()
  await expect(main.locator('strong', { hasText: 'destaque forte' })).toBeVisible()
  await expect(main.locator('u, span[style*="underline"]', { hasText: 'sublinhado no corpo' })).toBeVisible()
  await expect(main.locator('s, span[style*="line-through"]', { hasText: 'Linha dois riscada' })).toBeVisible()
  await expect(main.locator('br').first()).toBeAttached()
  // The description for Google and WhatsApp is plain text
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', 'Introdução em negrito e sublinhada')
})

test('Quem somos: intro shows on the page and on the home teaser, with formatting', async ({ page, request }) => {
  await salvar(request, 'quem-somos', {
    intro: estado(paragrafo(noTexto('Casa ', 0), noTexto('discreta', 1), noTexto(' e acolhedora, com ', 0), noTexto('respeito', 8))),
  })
  await page.goto('/quem-somos')
  await expect(page.locator('main strong', { hasText: 'discreta' })).toBeVisible()
  await expect(page.locator('main u', { hasText: 'respeito' })).toBeVisible()
  await page.goto('/')
  const teaser = page.locator('section[aria-labelledby="titulo-quem-somos-home"]')
  await expect(teaser.locator('strong', { hasText: 'discreta' })).toBeVisible()
  await expect(teaser.locator('u', { hasText: 'respeito' })).toBeVisible()
})

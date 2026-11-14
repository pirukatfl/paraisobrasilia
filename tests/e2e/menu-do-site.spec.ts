import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { abrirMinhaConta } from './helpers/menu'

// Menu do site (novo planejamento 2026-11-01): staff hide menu items in the panel, and the external link
// is a members-only entry: it must never reach the public menu, the footer, the sitemap or the HTML of
// a logged-out visitor.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-provisoria-1'
const SUB = { email: 'menu-site@teste.local', name: 'Menu Site' }
const EXTERNAL = 'https://www.redtube.com.br/'
const RESET = { itensOcultos: [], linkExterno: { ativo: true, rotulo: 'Pornô grátis', url: EXTERNAL } }

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.updateGlobal('menu-do-site', RESET)
  const mensal = (await api.findPlans()).find((p) => p.name === 'Mensal')!
  const { id } = await api.createAssinante({ ...SUB, password: PASSWORD })
  await api.createSubscription({ assinante: id, plan: mensal.id, startsAt: new Date().toISOString() })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', RESET)
  await api.deleteAll('assinantes')
  await api.dispose()
})

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

/** The header menu as the visitor sees it: the inline nav on desktop, the opened panel on mobile. */
async function headerMenu(page: Page, isMobile: boolean) {
  if (isMobile) {
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    return page.getByRole('navigation', { name: 'Menu' })
  }
  return page.getByRole('navigation', { name: 'Principal' })
}

test('logged out: the external link is nowhere (menu, footer, HTML, sitemap)', async ({ page, request, isMobile }) => {
  await page.goto('/')
  const menu = await headerMenu(page, isMobile)
  await expect(menu.getByRole('link', { name: 'Contato' })).toBeVisible()
  await expect(menu.getByRole('link', { name: /Pornô grátis/ })).toHaveCount(0)
  await expect(page.locator('a[href*="redtube"]')).toHaveCount(0)
  await expect(page.locator('footer').getByText(/Pornô grátis/)).toHaveCount(0)

  for (const path of ['/', '/contato', '/modelos', '/assine-ja']) {
    const html = await (await request.get(path, { headers: { Cookie: 'pb_age_ok=1' } })).text()
    expect(html.toLowerCase(), path).not.toContain('redtube')
  }
  const sitemap = await (await request.get('/sitemap.xml')).text()
  expect(sitemap.toLowerCase()).not.toContain('redtube')
})

test('logged in: Pornô grátis sits in the Vídeos group (no link), opens a new tab with safe rel, above Amadores', async ({
  page,
  isMobile,
}) => {
  await loginAsAssinante(page, SUB.email, PASSWORD)
  const menu = await headerMenu(page, isMobile)
  await expect(menu.getByRole('link', { name: 'Vídeos', exact: true })).toHaveCount(0)
  if (!isMobile) await menu.getByRole('button', { name: 'Vídeos', exact: true }).click()
  const link = menu.getByRole('link', { name: 'Pornô grátis' })
  await expect(link).toHaveAttribute('href', EXTERNAL)
  await expect(link).toHaveAttribute('target', '_blank')
  const rel = (await link.getAttribute('rel')) ?? ''
  for (const token of ['noopener', 'noreferrer', 'nofollow']) expect(rel).toContain(token)
  await expect(menu.getByRole('link', { name: 'Amadores', exact: true })).toHaveAttribute('href', '/videos-amadores')

  await abrirMinhaConta(menu)
  await expect(menu.getByRole('button', { name: 'Sair' })).toBeVisible()
  // still not in the footer
  await expect(page.locator('footer a[href*="redtube"]')).toHaveCount(0)
})

test('staff turn the external link off and it leaves the logged-in menu at once', async ({ page, request, isMobile }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', { linkExterno: { ativo: false } })
  await api.dispose()

  await loginAsAssinante(page, SUB.email, PASSWORD)
  const menu = await headerMenu(page, isMobile)
  await abrirMinhaConta(menu)
  await expect(menu.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(menu.getByRole('link', { name: /Pornô grátis/ })).toHaveCount(0)
  await expect(page.locator('a[href*="redtube"]')).toHaveCount(0)

  const again = await staffApi(request)
  await again.updateGlobal('menu-do-site', RESET)
  await again.dispose()
})

test('hidden items leave the header menu, the mobile menu and the footer; the page still opens', async ({
  page,
  request,
  isMobile,
}) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', { itensOcultos: ['espaco', 'galeria', 'quem-somos', 'assine-ja'] })

  await page.goto('/')
  const menu = await headerMenu(page, isMobile)
  await expect(menu.getByRole('link', { name: 'Contato' })).toBeVisible()
  for (const name of ['Espaço', 'Galeria', 'Quem somos', 'Assine Já', 'Normas', 'Amadoras']) {
    await expect(menu.getByRole('link', { name, exact: true }), name).toHaveCount(0)
  }
  const footer = page.getByRole('navigation', { name: 'Rodapé' })
  await expect(footer.getByRole('link', { name: 'Contato' })).toBeVisible()
  for (const name of ['Espaço', 'Galeria', 'Quem somos', 'Assine Já', 'Normas', 'Regras', 'Dicas']) {
    await expect(footer.getByRole('link', { name, exact: true }), name).toHaveCount(0)
  }
  // "Dicas Hot" is a different item from Quem somos → Dicas
  await expect(footer.getByRole('link', { name: 'Dicas Hot' })).toBeVisible()
  expect((await page.goto('/espaco'))?.status()).toBe(200)

  // showing it again
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
  await api.dispose()
  await page.goto('/')
  const back = await headerMenu(page, isMobile)
  await expect(back.getByRole('link', { name: 'Espaço', exact: true })).toBeVisible()
})

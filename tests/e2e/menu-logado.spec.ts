import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// quick menu-logado: a logged-in subscriber gets ONE header menu (members entries + Sair) in place of
// the public one, on every page; logged out nothing changes.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-provisoria-1'
const SUB = { email: 'menu@teste.local', name: 'Menu Teste' }

const LABELS = [
  'Festas',
  'Quem somos',
  'Espaço',
  'Modelos',
  'ClassiSex',
  'Recados',
  'Contos',
  'Dicas Hot',
  'Contato',
  'Meus anúncios',
  'Minha assinatura',
  'Trocar senha',
]
const HREFS = [
  '/',
  '/quem-somos',
  '/espaco',
  '/modelos',
  '/area-do-assinante/classisex',
  '/area-do-assinante/mensagens',
  '/area-do-assinante/contos',
  '/area-do-assinante/dicas-hot',
  '/contato',
  '/area-do-assinante/meus-anuncios',
  '/area-do-assinante',
  '/area-do-assinante/senha',
]

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  const mensal = (await api.findPlans()).find((p) => p.name === 'Mensal')!
  const { id } = await api.createAssinante({ ...SUB, password: PASSWORD })
  await api.createSubscription({ assinante: id, plan: mensal.id, startsAt: new Date().toISOString() })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

/** Desktop-sized context (newContext defaults to 1280x720), age gate already accepted. */
async function freshPage(browser: Browser, baseURL: string, viewport?: { width: number; height: number }) {
  const context = await browser.newContext({ baseURL, viewport: viewport ?? { width: 1280, height: 720 } })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

async function expectMemberMenu(page: Page, name: 'Principal' | 'Menu') {
  const nav = page.getByRole('navigation', { name })
  await expect(nav).toHaveCount(1)
  expect((await nav.getByRole('link').allTextContents()).map((t) => t.trim().replace(/\s*\d+\+?$/, ''))).toEqual(LABELS)
  const hrefs = await nav.getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('href')))
  expect(hrefs).toEqual(HREFS)
  await expect(nav.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Área do assinante' })).toHaveCount(0)
  // never a second menu
  await expect(page.getByRole('navigation', { name: 'Área do assinante' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: name === 'Menu' ? 'Principal' : 'Menu' })).toHaveCount(0)
}

test('logged out: the public menu is unchanged and has no Sair', async ({ browser, baseURL }) => {
  const { context, page } = await freshPage(browser, baseURL!)
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Área do assinante' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: 'Minha assinatura' })).toHaveCount(0)
  await context.close()
})

test('right after login the logged-in menu is shown, on desktop and on public pages', async ({ browser, baseURL }) => {
  const { context, page } = await freshPage(browser, baseURL!)
  await loginAsAssinante(page, SUB.email, PASSWORD)
  // no reload since the login redirect
  await expectMemberMenu(page, 'Principal')
  await page.goto('/espaco')
  await expectMemberMenu(page, 'Principal')
  await expect(page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Espaço' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await context.close()
})

test('mobile: the menu button opens the same logged-in list', async ({ browser, baseURL }) => {
  const { context, page } = await freshPage(browser, baseURL!, { width: 390, height: 844 })
  await loginAsAssinante(page, SUB.email, PASSWORD)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await expect(page.getByRole('navigation', { name: 'Menu' })).toBeVisible()
  // mobile nav also lists the Quem somos children (Normas, Regras, Dicas): check the top level only
  const nav = page.getByRole('navigation', { name: 'Menu' })
  await expect(nav).toHaveCount(1)
  const top = await nav.locator(':scope > ul > li > a').allTextContents()
  expect(top.map((t) => t.trim().replace(/\s*\d+\+?$/, ''))).toEqual(LABELS)
  await expect(nav.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Área do assinante' })).toHaveCount(0)
  await context.close()
})

test('Sair returns to the home page and the public menu is back without a reload', async ({ browser, baseURL }) => {
  const { context, page } = await freshPage(browser, baseURL!)
  await loginAsAssinante(page, SUB.email, PASSWORD)
  await page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(baseURL! + '/')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Área do assinante' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  await context.close()
})

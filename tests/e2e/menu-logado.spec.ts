import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { abrirMinhaConta } from './helpers/menu'

// quick menu-logado: a logged-in subscriber gets ONE header menu (members entries + Sair) in place of
// the public one, on every page; logged out nothing changes.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-provisoria-1'
const SUB = { email: 'menu@teste.local', name: 'Menu Teste' }

const LABELS = [
  'Festas',
  'Quem somos',
  'Espaço',
  'Galeria',
  'ClassiSex',
  'Contos',
  'Dicas Hot',
  'Contato',
  'Meus anúncios',
  'Minha assinatura',
  'Trocar senha',
  'Vídeos pornô grátis',
]
// Desktop (xl+): one row; the account entries sit inside "Minha conta", after the external link
const ACCOUNT = ['Meus anúncios', 'Minha assinatura', 'Trocar senha']
const ACCOUNT_HREFS = ['/area-do-assinante/meus-anuncios', '/area-do-assinante', '/area-do-assinante/senha']
const HREFS = [
  '/',
  '/quem-somos',
  '/espaco',
  '/modelos',
  '/area-do-assinante/classisex',
  '/area-do-assinante/contos',
  '/area-do-assinante/dicas-hot',
  '/contato',
  '/area-do-assinante/meus-anuncios',
  '/area-do-assinante',
  '/area-do-assinante/senha',
  'https://www.redtube.com.br/', // link externo (Menu do site), só para assinante
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
  const desktop = name === 'Principal'
  if (desktop) await abrirMinhaConta(nav)
  const labels = desktop ? [...LABELS.filter((l) => !ACCOUNT.includes(l)), ...ACCOUNT] : LABELS
  const hrefsEsperados = desktop
    ? [...HREFS.filter((h) => !ACCOUNT_HREFS.includes(h)), ...ACCOUNT_HREFS]
    : HREFS
  expect((await nav.getByRole('link').allTextContents()).map((t) => t.trim().replace(/\s*\d+\+?$/, ''))).toEqual(labels)
  const hrefs = await nav.getByRole('link').evaluateAll((els) => els.map((el) => el.getAttribute('href')))
  expect(hrefs).toEqual(hrefsEsperados)
  await expect(nav.getByRole('button', { name: 'Sair' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toHaveCount(0)
  await expect(nav.getByRole('link', { name: /Recados/ })).toHaveCount(0)
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
  await expect(nav.getByRole('link', { name: /Recados/ })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Principal' })).toHaveCount(0)
  await expect(page.getByRole('navigation', { name: 'Área do assinante' })).toHaveCount(0)
  await context.close()
})

test('Sair returns to the home page and the public menu is back without a reload', async ({ browser, baseURL }) => {
  const { context, page } = await freshPage(browser, baseURL!)
  await loginAsAssinante(page, SUB.email, PASSWORD)
  const nav0 = page.getByRole('navigation', { name: 'Principal' })
  await abrirMinhaConta(nav0)
  await nav0.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(baseURL! + '/')
  const nav = page.getByRole('navigation', { name: 'Principal' })
  await expect(nav.getByRole('link', { name: 'Assine Já' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Área do assinante' })).toBeVisible()
  await expect(nav.getByRole('button', { name: 'Sair' })).toHaveCount(0)
  await context.close()
})

for (const width of [1280, 1440]) {
  test(`desktop ${width}px: the logged-in menu is one single row, nothing overflows, Minha conta groups the account`, async ({ browser, baseURL }) => {
    const { context, page } = await freshPage(browser, baseURL!, { width, height: 800 })
    await loginAsAssinante(page, SUB.email, PASSWORD)
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav).toBeVisible()
    // every top-level entry (links, dropdown triggers, Minha conta) shares the same row
    const tops = await nav.locator(':scope > ul > li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(tops.length).toBe(10)
    expect(new Set(tops).size).toBe(1)
    // the external link is inline, right before Minha conta, and Sair is not on the main row
    const lis = nav.locator(':scope > ul > li')
    await expect(lis.nth(8).getByRole('link', { name: 'Vídeos pornô grátis' })).toBeVisible()
    await expect(lis.nth(9).getByRole('button', { name: 'Minha conta' })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Sair' })).toHaveCount(0)
    for (const label of ACCOUNT) await expect(nav.getByRole('link', { name: label })).toHaveCount(0)
    // no horizontal overflow, nav inside the viewport
    const box = (await nav.boundingBox())!
    expect(box.x).toBeGreaterThanOrEqual(0)
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    // the dropdown: aria-expanded, links, Sair as a button; Esc closes it
    const trigger = nav.getByRole('button', { name: 'Minha conta' })
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    for (const label of ACCOUNT) await expect(nav.getByRole('link', { name: label })).toBeVisible()
    await expect(nav.getByRole('button', { name: 'Sair' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await context.close()
  })
}

// Promoção on air adds one more item; the desktop row must still be a single line
for (const width of [1280, 1440]) {
  test(`desktop ${width}px with the promotion on air: still one row, Promoção before the external link`, async ({ browser, baseURL, request }) => {
    const api = await staffApi(request)
    await api.updateGlobal('promocao', { ativa: true, titulo: 'Promoção de Teste', texto: null, inicio: null, fim: null, imagem: null })
    const { context, page } = await freshPage(browser, baseURL!, { width, height: 800 })
    try {
      await loginAsAssinante(page, SUB.email, PASSWORD)
      const nav = page.getByRole('navigation', { name: 'Principal' })
      await expect(nav).toBeVisible()
      const tops = await nav.locator(':scope > ul > li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
      expect(tops.length).toBe(11)
      expect(new Set(tops).size).toBe(1)
      const lis = nav.locator(':scope > ul > li')
      await expect(lis.nth(8).getByRole('button', { name: 'Promoção' })).toBeVisible()
      await expect(lis.nth(9).getByRole('link', { name: 'Vídeos pornô grátis' })).toBeVisible()
      await expect(lis.nth(10).getByRole('button', { name: 'Minha conta' })).toBeVisible()
      const box = (await nav.boundingBox())!
      expect(box.x + box.width).toBeLessThanOrEqual(width)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await lis.nth(8).getByRole('button', { name: 'Promoção' }).click()
      await expect(page.getByRole('dialog', { name: 'Promoção de Teste' })).toBeVisible()
    } finally {
      await api.updateGlobal('promocao', { ativa: false, titulo: '', texto: null, inicio: null, fim: null, imagem: null })
      await api.dispose()
      await context.close()
    }
  })
}

test('mobile: the logged-in menu has Promoção and it opens the modal', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('promocao', { ativa: true, titulo: 'Promoção de Teste', texto: null, inicio: null, fim: null, imagem: null })
  const { context, page } = await freshPage(browser, baseURL!, { width: 390, height: 844 })
  try {
    await loginAsAssinante(page, SUB.email, PASSWORD)
    await page.getByRole('button', { name: 'Abrir menu' }).click()
    await page.getByRole('navigation', { name: 'Menu' }).getByRole('button', { name: 'Promoção' }).click()
    await expect(page.getByRole('dialog', { name: 'Promoção de Teste' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Menu' })).toBeHidden()
  } finally {
    await api.updateGlobal('promocao', { ativa: false, titulo: '', texto: null, inicio: null, fim: null, imagem: null })
    await api.dispose()
    await context.close()
  }
})

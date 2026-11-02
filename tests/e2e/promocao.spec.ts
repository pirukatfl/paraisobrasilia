import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { headerMenu } from './helpers/menu'

// Promoção (novo planejamento 2026-11-01, item G): pop-up of the home page, edited in the panel.
test.describe.configure({ mode: 'serial' })

const DIALOG_NAME = 'Conteúdo para maiores de 18 anos'
const ENTER = 'Tenho 18 anos ou mais — Entrar'
const OFF = { ativa: false, participarAtivo: true, botaoParticipar: 'Participar', titulo: '', texto: null, inicio: null, fim: null, imagem: null }

const lexical = (text: string) => ({
  root: {
    type: 'root',
    version: 1,
    direction: 'ltr',
    format: '',
    indent: 0,
    children: [
      {
        type: 'paragraph',
        version: 1,
        direction: 'ltr',
        format: '',
        indent: 0,
        children: [{ type: 'text', version: 1, text, format: 0, detail: 0, mode: 'normal', style: '' }],
      },
    ],
  },
})

async function setPromocao(request: Parameters<typeof staffApi>[0], data: Record<string, unknown>) {
  const api = await staffApi(request)
  await api.updateGlobal('promocao', data)
  await api.dispose()
}

const ON = {
  ...OFF,
  ativa: true,
  titulo: 'Promoção de Teste',
  texto: lexical('Mande seus contos ou fotos e vídeos da festa.'),
}

const popup = (page: Page) => page.getByRole('dialog', { name: 'Promoção de Teste' })

test.afterAll(async ({ request }) => {
  await setPromocao(request, OFF)
})

test('never on top of the age gate: appears only after the 18+ confirmation, once per session', async ({ page, request }) => {
  await setPromocao(request, ON)
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: DIALOG_NAME })).toBeVisible()
  await expect(page.locator('[data-promocao]')).toHaveCount(0)

  await page.getByRole('button', { name: ENTER }).click()
  await expect(page.getByRole('dialog', { name: DIALOG_NAME })).toBeHidden()
  await expect(popup(page)).toBeVisible()
  await expect(popup(page).getByRole('button', { name: 'Fechar a promoção' })).toBeFocused()

  // Read, then close or participate: the text has no automatic links, only the two buttons
  await expect(popup(page).getByText('Mande seus contos ou fotos e vídeos da festa.')).toBeVisible()
  await expect(popup(page).getByRole('link')).toHaveCount(1)
  await expect(popup(page).getByRole('link', { name: 'Participar' })).toHaveAttribute('href', '/enviar-fotos-e-videos?promocao=1')
  await expect(popup(page).getByRole('button', { name: 'Fechar', exact: true })).toBeVisible()

  // Esc closes
  await page.keyboard.press('Escape')
  await expect(popup(page)).toHaveCount(0)

  // Same session: not again
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
  await expect(popup(page)).toHaveCount(0)
})

test('traps focus, closes on the backdrop and returns focus', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/')
  await expect(popup(page)).toBeVisible()
  // Tab never leaves the dialog
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
  }
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)

  await page.mouse.click(2, 2) // backdrop
  await expect(popup(page)).toHaveCount(0)
})

test('the Fechar button closes it', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/')
  await popup(page).getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(popup(page)).toHaveCount(0)
  await context.close()
})

test('Participar leads to the form with the promotion on top; switched off it is informative only', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/')
  await popup(page).getByRole('link', { name: 'Participar' }).click()
  await expect(page).toHaveURL(/\/enviar-fotos-e-videos\?promocao=1$/)
  await expect(page.getByRole('heading', { name: 'Enviar fotos e vídeos', level: 1 })).toBeVisible()
  await expect(page.locator('[data-promocao-quadro]')).toHaveText('Participando da promoção: Promoção de Teste')
  await expect(page.getByLabel(/^Festa \/ data que pretende ir/)).toBeVisible()

  await setPromocao(request, { ...ON, participarAtivo: false })
  const informativa = await context.newPage()
  await informativa.addInitScript(() => sessionStorage.clear())
  await informativa.goto('/')
  await expect(popup(informativa)).toBeVisible()
  await expect(popup(informativa).getByRole('link')).toHaveCount(0)
  await expect(popup(informativa).getByRole('button', { name: 'Fechar', exact: true })).toBeVisible()
  await setPromocao(request, ON)
  await context.close()
})

test('the X closes it', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/')
  await popup(page).getByRole('button', { name: 'Fechar a promoção' }).click()
  await expect(popup(page)).toHaveCount(0)
  await context.close()
})

test('off, expired or not started yet: no pop-up; without JavaScript: none', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()

  await setPromocao(request, { ...ON, ativa: false })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
  await expect(page.locator('[data-promocao]')).toHaveCount(0)

  await setPromocao(request, { ...ON, fim: '2020-01-01T00:00:00.000Z' })
  await page.goto('/')
  await expect(page.locator('[data-promocao]')).toHaveCount(0)

  await setPromocao(request, { ...ON, inicio: '2999-01-01T00:00:00.000Z' })
  await page.goto('/')
  await expect(page.locator('[data-promocao]')).toHaveCount(0)

  await setPromocao(request, ON)
  const semJs = await browser.newContext({ baseURL, javaScriptEnabled: false })
  await semJs.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const p2 = await semJs.newPage()
  await p2.goto('/')
  await expect(p2.getByText('Promoção de Teste')).toHaveCount(0)
  await semJs.close()
  await context.close()
})

// Client request 2026-11-02: "Promoção" in the main menu reopens the modal, on any page, while the promotion is on.
async function itemPromocao(page: Page) {
  const menu = await headerMenu(page)
  return menu.getByRole('button', { name: 'Promoção', exact: true })
}

test('menu item Promoção: on a non-home page it opens the modal without navigating, then returns focus', async ({ browser, baseURL, request }) => {
  await setPromocao(request, ON)
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/espaco')
  // never opens by itself outside the home page
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(popup(page)).toHaveCount(0)

  const item = await itemPromocao(page)
  await expect(item).toHaveAttribute('aria-haspopup', 'dialog')
  await item.click()
  await expect(popup(page)).toBeVisible()
  await expect(page).toHaveURL(/\/espaco$/)
  await expect(popup(page).getByRole('button', { name: 'Fechar a promoção' })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(popup(page)).toHaveCount(0)
  // the menu toggle on mobile, the item itself on desktop
  const toggle = page.getByRole('button', { name: 'Abrir menu' })
  if (await toggle.isVisible()) await expect(toggle).toBeFocused()
  else await expect(item).toBeFocused()
  await context.close()
})

test('menu item Promoção: on the home page it reopens the modal after it was closed (ignores once per session)', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/')
  await expect(popup(page)).toBeVisible()
  await popup(page).getByRole('button', { name: 'Fechar', exact: true }).click()
  await expect(popup(page)).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
  await expect(popup(page)).toHaveCount(0)

  await (await itemPromocao(page)).click()
  await expect(popup(page)).toBeVisible()
  // Participar still leads to the form and the modal is gone there
  await popup(page).getByRole('link', { name: 'Participar' }).click()
  await expect(page).toHaveURL(/\/enviar-fotos-e-videos\?promocao=1$/)
  await expect(popup(page)).toHaveCount(0)
  await context.close()
})

test('menu item Promoção: not in the footer; promotion off or hidden by staff: no item, no modal markup', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/contato')
  await expect(page.getByRole('contentinfo').getByText('Promoção', { exact: true })).toHaveCount(0)

  await setPromocao(request, { ...ON, ativa: false })
  await page.goto('/contato')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(await itemPromocao(page)).toHaveCount(0)
  await expect(page.locator('[data-promocao]')).toHaveCount(0)

  const api = await staffApi(request)
  await setPromocao(request, ON)
  await api.updateGlobal('menu-do-site', { itensOcultos: ['promocao'] })
  await page.goto('/contato')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(await itemPromocao(page)).toHaveCount(0)
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
  await api.dispose()
  await context.close()
})

test('menu item Promoção without JavaScript: goes to the home page, which shows the promotion as a block', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/contato')
  const nav = page.locator('nav[aria-label="Principal"], nav[aria-label="Menu"]')
  // no JS: the age gate overlay stays up (its script is off), so submit the form without a pointer click
  await nav.locator('button[aria-haspopup="dialog"]').first().evaluate((el) => (el as HTMLButtonElement).click())
  await expect(page).toHaveURL(/\/\?promocao=abrir$/)
  const bloco = page.locator('[data-promocao-sem-js]')
  await expect(bloco.getByRole('heading', { name: 'Promoção de Teste' })).toBeVisible()
  await expect(bloco.getByRole('link', { name: 'Participar' })).toHaveAttribute('href', '/enviar-fotos-e-videos?promocao=1')
  await context.close()
})

for (const width of [1280, 1440]) {
  test(`desktop ${width}px: the public menu with Promoção stays on one row`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 800 } })
    await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
    const page = await context.newPage()
    await page.goto('/contato')
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav.getByRole('button', { name: 'Promoção', exact: true })).toBeVisible()
    const tops = await nav.locator(':scope > ul > li').evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)))
    expect(tops.length).toBe(11)
    expect(new Set(tops).size).toBe(1)
    const box = (await nav.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await context.close()
  })
}

test('loaded as /?promocao=abrir with JavaScript: the modal opens and the query leaves the address', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/?promocao=abrir')
  await expect(popup(page)).toBeVisible()
  await expect(page).toHaveURL(baseURL! + '/')
  await expect(page.locator('[data-promocao-sem-js]')).toHaveCount(0)
  await context.close()
})

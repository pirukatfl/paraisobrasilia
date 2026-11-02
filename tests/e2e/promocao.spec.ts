import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'

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

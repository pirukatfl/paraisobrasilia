import { expect, test, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { headerMenu } from './helpers/menu'

// Promoção (novo planejamento 2026-11-01, item G; 2026-11-03: seção da home acima de "Como chegar", sem pop-up e sem item no menu).
test.describe.configure({ mode: 'serial' })

const DIALOG_NAME = 'Conteúdo para maiores de 18 anos'
const ENTER = 'Tenho 18 anos ou mais — Entrar'
const OFF = { ativa: false, participarAtivo: true, botaoConto: 'Envie seu conto', botaoMidia: 'Mande sua foto/vídeo', titulo: '', texto: null, inicio: null, fim: null, imagem: null }

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

const secao = (page: Page) => page.locator('[data-promocao-home]')
const comoChegar = (page: Page) => page.getByRole('heading', { name: 'Como chegar', level: 2 })

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
  await api.dispose()
  await setPromocao(request, OFF)
})

test('on: section on the home, directly above Como chegar, and no modal even on the first visit', async ({ page, request }) => {
  await setPromocao(request, ON)
  await page.goto('/')
  // first visit: only the age notice is a dialog
  await expect(page.getByRole('dialog', { name: DIALOG_NAME })).toBeVisible()
  await page.getByRole('button', { name: ENTER }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-promocao]')).toHaveCount(0)

  const bloco = secao(page)
  await expect(bloco.getByRole('heading', { name: 'Promoção de Teste', level: 2 })).toBeVisible()
  await expect(bloco.getByText('Mande seus contos ou fotos e vídeos da festa.')).toBeVisible()
  await expect(bloco.getByRole('link')).toHaveCount(2)
  await expect(bloco.getByRole('link', { name: 'Envie seu conto' })).toHaveAttribute('href', '/contos/enviar?promocao=1')
  await expect(bloco.getByRole('link', { name: 'Mande sua foto/vídeo' })).toHaveAttribute('href', '/enviar-fotos-e-videos?promocao=1')

  // order in the document: promotion, then Como chegar (when the contact has an address)
  if (await comoChegar(page).count()) {
    const ordem = await page.evaluate(() => {
      const a = document.querySelector('[data-promocao-home]')!
      const b = document.getElementById('titulo-como-chegar-home')!.closest('section')!
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? 'antes' : 'depois'
    })
    expect(ordem).toBe('antes')
    const next = await page.evaluate(() => document.querySelector('[data-promocao-home]')!.nextElementSibling?.querySelector('h2')?.id)
    expect(next).toBe('titulo-como-chegar-home')
  }
})

test('works without JavaScript: the section is server-rendered', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/')
  await expect(secao(page).getByRole('heading', { name: 'Promoção de Teste' })).toBeAttached()
  await expect(secao(page).getByRole('link', { name: 'Envie seu conto' })).toHaveAttribute('href', '/contos/enviar?promocao=1')
  await expect(secao(page).getByRole('link', { name: 'Mande sua foto/vídeo' })).toHaveAttribute('href', '/enviar-fotos-e-videos?promocao=1')
  await context.close()
})

test('the two buttons lead to the forms with the promotion on top and the e-mail required; switched off it is informative only', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  await page.goto('/')
  await secao(page).getByRole('link', { name: 'Envie seu conto' }).click()
  await expect(page).toHaveURL(/\/contos\/enviar\?promocao=1$/)
  await expect(page.locator('[data-promocao-quadro]')).toHaveText('Participando da promoção: Promoção de Teste')
  await expect(page.getByLabel(/^Seu e-mail/)).toBeVisible()
  await expect(page.getByText('(obrigatório)').last()).toBeVisible()

  await page.goto('/')
  await secao(page).getByRole('link', { name: 'Mande sua foto/vídeo' }).click()
  await expect(page).toHaveURL(/\/enviar-fotos-e-videos\?promocao=1$/)
  await expect(page.getByRole('heading', { name: 'Enviar fotos e vídeos', level: 1 })).toBeVisible()
  await expect(page.locator('[data-promocao-quadro]')).toHaveText('Participando da promoção: Promoção de Teste')
  await expect(page.getByLabel(/^Festa \/ data que pretende ir/)).toBeVisible()

  await setPromocao(request, { ...ON, participarAtivo: false })
  await page.goto('/')
  await expect(secao(page).getByRole('heading', { name: 'Promoção de Teste' })).toBeVisible()
  await expect(secao(page).getByRole('link')).toHaveCount(0)

  await setPromocao(request, { ...ON, botaoConto: 'Quero mandar um conto', botaoMidia: 'Quero mandar fotos' })
  await page.goto('/')
  await expect(secao(page).getByRole('link', { name: 'Quero mandar um conto' })).toBeVisible()
  await expect(secao(page).getByRole('link', { name: 'Quero mandar fotos' })).toBeVisible()
  await setPromocao(request, ON)
  await context.close()
})

test('off, expired, not started yet or hidden in Menu do site: no section', async ({ browser, baseURL, request }) => {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()

  await setPromocao(request, { ...ON, ativa: false })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
  await expect(secao(page)).toHaveCount(0)

  await setPromocao(request, { ...ON, fim: '2020-01-01T00:00:00.000Z' })
  await page.goto('/')
  await expect(secao(page)).toHaveCount(0)

  await setPromocao(request, { ...ON, inicio: '2999-01-01T00:00:00.000Z' })
  await page.goto('/')
  await expect(secao(page)).toHaveCount(0)

  await setPromocao(request, ON)
  await page.goto('/')
  await expect(secao(page)).toBeVisible()
  const api = await staffApi(request)
  await api.updateGlobal('menu-do-site', { itensOcultos: ['promocao'] })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
  await expect(secao(page)).toHaveCount(0)
  await api.updateGlobal('menu-do-site', { itensOcultos: [] })
  await api.dispose()
  await context.close()
})

test('no menu item Promoção (desktop and mobile, any page), nothing in the footer, and /?promocao=abrir is just the home', async ({ browser, baseURL, request }) => {
  await setPromocao(request, ON)
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await context.newPage()
  for (const caminho of ['/contato', '/']) {
    await page.goto(caminho)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    const menu = await headerMenu(page)
    await expect(menu.getByText('Promoção', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('contentinfo').getByText('Promoção', { exact: true })).toHaveCount(0)
  }

  await page.goto('/?promocao=abrir')
  await expect(page.getByRole('heading', { name: 'Próximas festas' })).toBeVisible()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('[data-promocao], [data-promocao-sem-js]')).toHaveCount(0)
  await expect(secao(page)).toHaveCount(1)
  await context.close()
})

for (const width of [390, 1280]) {
  test(`${width}px: the section fits the viewport`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, viewport: { width, height: 800 } })
    await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
    const page = await context.newPage()
    await page.goto('/')
    await expect(secao(page)).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await context.close()
  })
}

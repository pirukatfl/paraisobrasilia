import { expect, test } from '@playwright/test'

import { loginAsStaff, STAFF_EMAIL, STAFF_PASSWORD } from './helpers/staff'

// PAINEL-10: a equipe troca textos fixos pelo painel; o site mostra no próximo acesso; apagar volta ao original.
test.describe.configure({ mode: 'serial' })

const TITULO_NOVO = 'Festas que vêm aí'
const MENU_NOVO = 'Agenda'

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

async function salvar(
  request: import('@playwright/test').APIRequestContext,
  slug: string,
  data: Record<string, unknown>,
) {
  const login = await request.post('/api/users/login', { data: { email: STAFF_EMAIL, password: STAFF_PASSWORD } })
  expect(login.ok()).toBe(true)
  const { token } = (await login.json()) as { token: string }
  const res = await request.post(`/api/globals/${slug}`, { headers: { Authorization: `JWT ${token}` }, data })
  expect(res.ok(), await res.text()).toBe(true)
}

async function limpar(request: import('@playwright/test').APIRequestContext) {
  await salvar(request, 'textos-inicio', { tituloProximasFestas: '' })
  await salvar(request, 'textos-geral', { menuFestas: '' })
  // Formatted text: null = emptied editor = original text
  await salvar(request, 'textos-espaco', { intro: null })
}

test.afterAll(async ({ request }) => {
  await limpar(request)
})

test('textos trocados pelo painel aparecem no site e apagar volta ao original', async ({ page, request }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas', level: 1 })).toBeVisible()

  await salvar(request, 'textos-inicio', { tituloProximasFestas: TITULO_NOVO })
  await salvar(request, 'textos-geral', { menuFestas: MENU_NOVO })

  await page.goto('/')
  await expect(page.getByRole('heading', { name: TITULO_NOVO, level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Próximas festas', level: 1 })).toHaveCount(0)
  await expect(page.getByRole('contentinfo').getByRole('link', { name: MENU_NOVO, exact: true })).toBeVisible()

  await limpar(request)

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Próximas festas', level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: TITULO_NOVO })).toHaveCount(0)
  await expect(page.getByRole('contentinfo').getByRole('link', { name: 'Festas', exact: true })).toBeVisible()
})

test('visitante anônimo não consegue alterar os textos', async ({ request }) => {
  const res = await request.post('/api/globals/textos-inicio', { data: { tituloProximasFestas: 'Invasão' } })
  expect(res.ok()).toBe(false)
  expect([401, 403]).toContain(res.status())
})

const INTRO_ORIGINAL = 'Conheça os ambientes do Paraíso: pista, bar, jardim e piscina numa chácara reservada no Lago Oeste.'

// What a never-edited global holds: the original text as editor state
const introOriginalComoEditor = () => ({
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
        textFormat: 0,
        textStyle: '',
        children: [{ type: 'text', version: 1, text: INTRO_ORIGINAL, format: 0, detail: 0, mode: 'normal', style: '' }],
      },
    ],
  },
})

test('texto longo formatado no editor do painel aparece com a formatação no site; apagar volta ao original', async ({ page, request }) => {
  await salvar(request, 'textos-espaco', { intro: introOriginalComoEditor() })
  await loginAsStaff(page)
  await page.goto('/admin/globals/textos-espaco')

  const editor = page.locator('[data-field-path="intro"] [contenteditable="true"]').first()
  await expect(editor).toContainText(INTRO_ORIGINAL)

  // Replace the text: bold word, a link (fixed toolbar), then a bullet list
  await editor.click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.type('Venha ')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type('conhecer')
  await page.keyboard.press('ControlOrMeta+b')
  await page.keyboard.type(' o espaço E2E. Veja o mapa')
  await page.keyboard.press('Shift+ArrowLeft')
  await page.keyboard.press('Shift+ArrowLeft')
  await page.keyboard.press('Shift+ArrowLeft')
  await page.keyboard.press('Shift+ArrowLeft')
  await page.locator('[data-field-path="intro"] .toolbar-popup__button-link').first().click()
  const gaveta = page.locator('dialog.lexical-link-edit-drawer')
  await gaveta.locator('#field-url').fill('https://exemplo.com/mapa')
  await gaveta.locator('button[type="submit"]').click()
  await expect(gaveta).toHaveCount(0)

  await editor.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('- Piscina E2E')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Jardim E2E')

  await page.getByRole('button', { name: 'Salvar' }).first().click()
  await expect(page.getByText('Atualizado com sucesso')).toBeVisible()

  await page.context().addCookies([{ name: 'pb_age_ok', value: '1', url: page.url() }])
  const avisos: string[] = []
  page.on('console', (msg) => {
    if (/hydrat|did not match|cannot be a descendant/i.test(msg.text())) avisos.push(msg.text())
  })
  await page.goto('/espaco')
  const intro = page.locator('main .texto-rico').first()
  await expect(intro.locator('strong')).toHaveText('conhecer')
  await expect(intro.locator('ul li').first()).toContainText('Piscina E2E')
  await expect(intro.locator('a[href="https://exemplo.com/mapa"]')).toHaveText(/mapa/)
  await expect(page.getByText(INTRO_ORIGINAL)).toHaveCount(0)
  // The saved markup never reaches the page as script or raw HTML
  await expect(intro.locator('script')).toHaveCount(0)
  expect(avisos).toEqual([])

  // Empty the field: the original text returns
  await page.goto('/admin/globals/textos-espaco')
  await page.locator('[data-field-path="intro"] [contenteditable="true"]').first().click()
  await page.keyboard.press('ControlOrMeta+a')
  await page.keyboard.press('Delete')
  await page.getByRole('button', { name: 'Salvar' }).first().click()
  await expect(page.getByText('Atualizado com sucesso')).toBeVisible()

  await page.goto('/espaco')
  await expect(page.locator('main .texto-rico').first()).toHaveText(INTRO_ORIGINAL)
  await expect(page.locator('main .texto-rico strong')).toHaveCount(0)
})

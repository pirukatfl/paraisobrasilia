import { expect, test } from '@playwright/test'

import { STAFF_EMAIL, STAFF_PASSWORD } from './helpers/staff'

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
  data: Record<string, string | null>,
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

import { expect, test } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// ASS-01: subscriber login on /entrar, 30-day session, logout; members pages guarded,
// private and noindex (T-03-04, T-03-05, T-03-08).
test.describe.configure({ mode: 'serial' })

const EMAIL = 'ana@teste.local'
const PASSWORD = 'senha-provisoria-1'

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.createAssinante({ email: EMAIL, password: PASSWORD, name: 'Ana Teste' })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

test('anonymous visitors are sent to /entrar with next', async ({ page }) => {
  await page.goto('/area-do-assinante')
  await expect(page).toHaveURL(/\/entrar\?next=%2Farea-do-assinante$/)
  await expect(page.getByRole('heading', { name: 'Entrar', level: 1 })).toBeVisible()
  await expect(page.getByLabel('E-mail')).toBeVisible()
  await expect(page.getByLabel('Senha', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ainda não é assinante? Assine Já' })).toHaveAttribute(
    'href',
    '/assine-ja',
  )
})

test('wrong password and unknown e-mail show the same generic error', async ({ page }) => {
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(EMAIL)
  await page.getByLabel('Senha', { exact: true }).fill('senha-errada-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
  await expect(page).toHaveURL(/\/entrar/)

  await page.getByLabel('E-mail').fill('ninguem@teste.local')
  await page.getByLabel('Senha', { exact: true }).fill('qualquer-senha-1')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/entrar\?erro=credenciais/)
  await expect(page.locator('main').getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
})

test('login lands on the members area and the session persists for 30 days', async ({ page, browser, baseURL }) => {
  await loginAsAssinante(page, EMAIL, PASSWORD)
  await expect(page).toHaveURL(/\/area-do-assinante$/)
  await expect(page.getByRole('heading', { name: 'Olá, Ana Teste', level: 1 })).toBeVisible()

  const cookie = (await page.context().cookies()).find((c) => c.name === 'payload-token')
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie!.expires).toBeGreaterThanOrEqual(Date.now() / 1000 + 29 * 86_400)

  // A new browser context built from the stored state is still logged in (between visits)
  const state = await page.context().storageState()
  const again = await browser.newContext({ storageState: state, baseURL })
  const page2 = await again.newPage()
  await page2.goto('/area-do-assinante')
  await expect(page2.getByRole('heading', { name: 'Olá, Ana Teste', level: 1 })).toBeVisible()
  await again.close()
})

test('members pages are private, never cached and not indexed', async ({ page }) => {
  await loginAsAssinante(page, EMAIL, PASSWORD)
  const res = await page.goto('/area-do-assinante')
  const headers = res!.headers()
  expect(headers['cache-control']).toContain('no-store')
  expect(headers['x-robots-tag']).toContain('noindex')

  const login = await page.request.get('/entrar')
  expect(login.headers()['x-robots-tag']).toContain('noindex')
})

test('Sair ends the session', async ({ page }) => {
  await loginAsAssinante(page, EMAIL, PASSWORD)
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/area-do-assinante')
  await expect(page).toHaveURL(/\/entrar\?next=/)
})

test('a staff session is not a subscriber session', async ({ page }) => {
  await loginAsStaff(page)
  await page.goto('/area-do-assinante')
  await expect(page).toHaveURL(/\/entrar\?next=%2Farea-do-assinante$/)
})

test('a logged-in subscriber opening /entrar goes to the members area', async ({ page }) => {
  await loginAsAssinante(page, EMAIL, PASSWORD)
  await page.goto('/entrar')
  await expect(page).toHaveURL(/\/area-do-assinante$/)
})

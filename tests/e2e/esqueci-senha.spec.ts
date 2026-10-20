import { expect, test, type Browser } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { staffApi } from './helpers/api'

// ASS-02: "Esqueci minha senha" by e-mail. The server writes messages to EMAIL_CAPTURE_DIR
// (no SMTP in tests); the token is read from the captured e-mail.
test.describe.configure({ mode: 'serial' })

const DIR = path.resolve('test-results/emails')
const NEUTRAL = 'Se o e-mail existir, enviamos um link para criar uma nova senha.'
// One account per project and run: the 5/hour per-e-mail brake lives in the server's memory
const RUN = Date.now()
const gabi = (project: string) => ({
  email: `gabi.${project}.${RUN}@teste.local`,
  name: 'Gabi Esqueci',
  password: 'senha-gabi-1234',
})

test.beforeAll(async ({ request }, info) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.createAssinante(gabi(info.project.name))
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

type Mail = { to: string; subject: string; text: string; html: string }

const capturedTo = (email: string): Mail[] => {
  if (!fs.existsSync(DIR)) return []
  return fs
    .readdirSync(DIR)
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Mail)
    .filter((m) => String(m.to).includes(email))
}

// A distinct client IP per project so the 5/hour per-IP brake does not cross tests
async function newPage(browser: Browser, baseURL: string, ip: string) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ip } })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

const octet = (name: string) => (name === 'mobile' ? 21 : 22)

test('/entrar links to the form; unknown and known e-mails get the same answer', async ({ browser, baseURL }, info) => {
  const { context, page } = await newPage(browser, baseURL!, `10.20.${octet(info.project.name)}.1`)
  await page.goto('/entrar')
  await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
  await expect(page).toHaveURL(/\/esqueci-senha$/)
  await expect(page.getByRole('heading', { name: 'Esqueci minha senha', level: 1 })).toBeVisible()

  const submit = async (email: string) => {
    await page.goto('/esqueci-senha')
    await page.getByLabel('E-mail').fill(email)
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page).toHaveURL(/\/esqueci-senha\?enviado=1$/)
    return page.locator('main').getByRole('status').innerText()
  }
  const GABI = gabi(info.project.name)
  const unknown = await submit(`ninguem.${RUN}@teste.local`)
  const known = await submit(GABI.email)
  expect(unknown).toBe(known)
  expect(known).toContain(NEUTRAL)
  await expect.poll(() => capturedTo(`ninguem.${RUN}@teste.local`).length).toBe(0)
  await context.close()
})

test('the e-mailed link resets the password; a newer e-mail cancels the older link', async ({ browser, baseURL }, info) => {
  test.setTimeout(120_000)
  const GABI = gabi(info.project.name)
  const { context, page } = await newPage(browser, baseURL!, `10.20.${octet(info.project.name)}.2`)
  const before = capturedTo(GABI.email).length
  const ask = async (n: number) => {
    await page.goto('/esqueci-senha')
    await page.getByLabel('E-mail').fill(GABI.email)
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page).toHaveURL(/enviado=1/)
    await expect.poll(() => capturedTo(GABI.email).length).toBe(before + n)
    return capturedTo(GABI.email).at(-1)!
  }
  const first = await ask(1)
  const second = await ask(2)
  const tokenOf = (m: Mail) => /nova-senha\?token=([a-f0-9]+)/.exec(m.text)![1]!
  expect(first.subject).toContain('nova senha')
  expect(second.html).toContain('/nova-senha?token=')
  expect(second.text).toContain('Olá, Gabi Esqueci!')

  await page.goto(`/nova-senha?token=${tokenOf(first)}`)
  await expect(page.locator('main')).toContainText('Este link expirou ou já foi usado.')

  await page.goto(`/nova-senha?token=${tokenOf(second)}`)
  const nova = `nova-${info.project.name}-senha-1`
  await page.getByLabel('Nova senha', { exact: true }).fill(nova)
  await page.getByLabel('Repita a nova senha').fill(nova)
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\?ok=senha$/)
  await context.close()
})

test('public forgot-password REST stays closed', async ({ playwright, baseURL }, info) => {
  const anon = await playwright.request.newContext({ baseURL })
  expect((await anon.post('/api/assinantes/forgot-password', { data: { email: gabi(info.project.name).email } })).status()).toBe(403)
  await anon.dispose()
})

test('rate limit: the sixth request in an hour from one IP is refused', async ({ browser, baseURL }, info) => {
  const { context, page } = await newPage(browser, baseURL!, `10.30.${octet(info.project.name)}.${Date.now() % 250}`)
  for (let i = 0; i < 5; i++) {
    await page.goto('/esqueci-senha')
    await page.getByLabel('E-mail').fill(`limite${i}-${info.project.name}-${RUN}@teste.local`)
    await page.getByRole('button', { name: 'Enviar link' }).click()
    await expect(page).toHaveURL(/enviado=1/)
  }
  await page.goto('/esqueci-senha')
  await page.getByLabel('E-mail').fill(`limite9-${info.project.name}-${RUN}@teste.local`)
  await page.getByRole('button', { name: 'Enviar link' }).click()
  await expect(page).toHaveURL(/erro=limite/)
  await expect(page.locator('main').getByRole('alert')).toContainText('Muitos pedidos')
  await context.close()
})

import { expect, test, type Browser } from '@playwright/test'
import fs from 'fs'
import path from 'path'

import { staffApi } from './helpers/api'

// G-01: public sign-up with 18+ declaration, consent and e-mail confirmation. The server writes
// messages to EMAIL_CAPTURE_DIR (no SMTP in tests); the link is read from the captured e-mail.
test.describe.configure({ mode: 'serial' })

const DIR = path.resolve('test-results/emails')
const RUN = Date.now()
const PASSWORD = 'senha-cadastro-1234'
const who = (project: string, n: string) => `cad.${n}.${project}.${RUN}@teste.local`
// a distinct client IP per project, test and run: the 5/hour per-IP brake lives in the server's memory
const ipOf = (project: string, n: number) => `10.${RUN % 250}.${project === 'mobile' ? 31 : 32}.${n}`

type Mail = { to: string; subject: string; text: string; html: string }

const capturedTo = (email: string): Mail[] => {
  if (!fs.existsSync(DIR)) return []
  return fs
    .readdirSync(DIR)
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')) as Mail)
    .filter((m) => String(m.to).includes(email))
}

const linkOf = (mail: Mail) => /(\/cadastro\/confirmar\?token=[a-f0-9]{40})/.exec(mail.text)![1]!

async function newPage(browser: Browser, baseURL: string, ip: string) {
  const context = await browser.newContext({ baseURL, extraHTTPHeaders: { 'x-forwarded-for': ip } })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function accountsByEmail(request: Parameters<typeof staffApi>[0], email: string) {
  const api = await staffApi(request)
  const res = (await api.get(`/api/assinantes?where[email][equals]=${encodeURIComponent(email)}&depth=0&limit=5`)) as {
    docs: Record<string, unknown>[]
  }
  await api.dispose()
  return res.docs
}

async function fill(page: import('@playwright/test').Page, v: { email: string; apelido: string; senha?: string; maior18?: boolean; termos?: boolean }) {
  await page.getByLabel('E-mail', { exact: true }).fill(v.email)
  await page.getByLabel('Senha', { exact: true }).fill(v.senha ?? PASSWORD)
  await page.getByLabel('Apelido', { exact: true }).fill(v.apelido)
  if (v.maior18 !== false) await page.getByLabel('Tenho 18 anos ou mais').check()
  if (v.termos !== false) await page.getByLabel(/Li e aceito os/).check()
}

test('/cadastro is noindex, shows the form, the comparison table and the links; stays out of the sitemap', async ({ browser, baseURL, request }, info) => {
  const { context, page } = await newPage(browser, baseURL!, ipOf(info.project.name, 1))
  const res = await page.goto('/cadastro')
  expect(res!.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'Criar conta grátis', level: 1 })).toBeVisible()
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.getByLabel('Tenho 18 anos ou mais')).toBeVisible()
  await expect(page.locator('main').getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos-de-uso')
  await expect(page.locator('main').getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/politica-de-privacidade')
  await expect(page.getByRole('link', { name: 'Já tem conta? Entrar' })).toHaveAttribute('href', '/entrar')
  // comparison block (G-06)
  const table = page.getByRole('table')
  await expect(table).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Grátis' })).toBeVisible()
  await expect(table.getByRole('columnheader', { name: 'Assinante' })).toBeVisible()
  await expect(table.getByRole('rowheader', { name: 'Fotos por anúncio' })).toBeVisible()
  await expect(page.locator('main').getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  expect(await (await request.get('/sitemap.xml')).text()).not.toContain('/cadastro')
  // /entrar links to it while e-mail is on
  await page.goto('/entrar')
  await expect(page.getByRole('link', { name: 'Criar conta grátis' })).toHaveAttribute('href', '/cadastro')
  await context.close()
})

test('full flow: sign up, confirm by e-mail, log in as a free account', async ({ browser, baseURL, request }, info) => {
  test.setTimeout(120_000)
  const email = who(info.project.name, 'fluxo')
  const { context, page } = await newPage(browser, baseURL!, ipOf(info.project.name, 2))
  await page.goto('/cadastro')
  await fill(page, { email, apelido: 'Casal Fluxo' })
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await expect(page).toHaveURL(/\/cadastro\?enviado=1$/)
  await expect(page.getByRole('status')).toContainText('Enviamos um link para o seu e-mail')

  await expect.poll(() => capturedTo(email).length).toBeGreaterThan(0)
  const mail = capturedTo(email)[0]!
  expect(mail.subject).toBe('Confirme seu e-mail - Paraíso Brasília')
  const link = linkOf(mail)

  // the account exists, unconfirmed, from the site, with consent dates (staff REST)
  const [acc] = await accountsByEmail(request, email)
  expect(acc!._verified).toBe(false)
  expect(acc!.origem).toBe('cadastro')
  expect(acc!.declaracao18Em).toBeTruthy()
  expect(acc!.termosAceitosEm).toBeTruthy()
  expect(acc!.accessUntil ?? null).toBeNull()

  // login before confirming
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(/\/entrar\?erro=nao-confirmado/)
  await expect(page.locator('main').getByRole('alert')).toHaveText(
    'Confirme seu e-mail antes de entrar. Enviamos o link quando você criou a conta.',
  )
  await expect(page.getByRole('button', { name: 'Reenviar link' })).toBeVisible()

  // confirm: the link only shows a button (POST)
  const res = await page.goto(link)
  expect(res!.status()).toBe(200)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer')
  expect((await accountsByEmail(request, email))[0]!._verified).toBe(false)
  await page.getByRole('button', { name: 'Confirmar meu e-mail' }).click()
  await expect(page).toHaveURL(/\/entrar\?confirmado=1$/)
  await expect(page.getByRole('status')).toHaveText('E-mail confirmado. Entre com seu e-mail e senha.')

  // the link is single use
  await page.goto(link)
  await page.getByRole('button', { name: 'Confirmar meu e-mail' }).click()
  await expect(page.locator('main').getByRole('alert')).toHaveText('Link inválido ou já usado.')

  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/area-do-assinante/)
  await expect(page.getByRole('heading', { name: 'Olá, Casal Fluxo', level: 1 })).toBeVisible()
  await context.close()
})

test('a duplicate e-mail shows the same screen and creates no second account', async ({ browser, baseURL, request }, info) => {
  const email = who(info.project.name, 'dup')
  const { context, page } = await newPage(browser, baseURL!, ipOf(info.project.name, 3))
  const submit = async (apelido: string) => {
    await page.goto('/cadastro')
    await fill(page, { email, apelido })
    await page.getByRole('button', { name: 'Criar conta grátis' }).click()
    await expect(page).toHaveURL(/\/cadastro\?enviado=1$/)
    return page.getByRole('status').innerText()
  }
  const first = await submit('Casal Dup')
  const second = await submit('Casal Dup 2')
  expect(first).toBe(second)
  expect(await accountsByEmail(request, email)).toHaveLength(1)
  await context.close()
})

test('unchecked 18+ or Termos: field errors, typed values kept, no account', async ({ browser, baseURL, request }, info) => {
  const email = who(info.project.name, 'campos')
  const { context, page } = await newPage(browser, baseURL!, ipOf(info.project.name, 4))
  await page.goto('/cadastro')
  await fill(page, { email, apelido: 'Casal Campos', maior18: false, termos: false })
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await expect(page.getByText('Confirme que você tem 18 anos ou mais.', { exact: true })).toBeVisible()
  await expect(page.getByText('Aceite os Termos de Uso e a Política de Privacidade para criar a conta.', { exact: true })).toBeVisible()
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(email)
  await expect(page.getByLabel('Apelido', { exact: true })).toHaveValue('Casal Campos')
  expect(await accountsByEmail(request, email)).toHaveLength(0)

  // a contact in the apelido is refused too
  await page.getByLabel('Tenho 18 anos ou mais').check()
  await page.getByLabel(/Li e aceito os/).check()
  await page.getByLabel('Senha', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Apelido', { exact: true }).fill('Zap 61 99988-9772')
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await expect(page.getByText(/não pode ter telefone/)).toBeVisible()
  expect(await accountsByEmail(request, email)).toHaveLength(0)
  await context.close()
})

test('the honeypot gets the neutral screen and no account', async ({ browser, baseURL, request }, info) => {
  const email = who(info.project.name, 'robo')
  const { context, page } = await newPage(browser, baseURL!, ipOf(info.project.name, 5))
  await page.goto('/cadastro')
  await fill(page, { email, apelido: 'Robo' })
  await page.locator('#cad-website').evaluate((el) => ((el as HTMLInputElement).value = 'http://spam.test'))
  await page.getByRole('button', { name: 'Criar conta grátis' }).click()
  await expect(page).toHaveURL(/\/cadastro\?enviado=1$/)
  expect(await accountsByEmail(request, email)).toHaveLength(0)
  expect(capturedTo(email)).toHaveLength(0)
  await context.close()
})

test('REST: anonymous create and first-register are refused', async ({ request }) => {
  for (const url of ['/api/assinantes', '/api/assinantes/first-register']) {
    const res = await request.post(url, {
      data: { email: `rest.${RUN}@teste.local`, password: PASSWORD, name: 'Rest' },
      headers: { origin: process.env.E2E_BASE_URL ?? 'http://localhost:3000' },
    })
    expect(res.ok(), url).toBe(false)
  }
  expect(await accountsByEmail(request, `rest.${RUN}@teste.local`)).toHaveLength(0)
})

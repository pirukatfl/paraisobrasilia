import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// ASS-02 substitute (D-04): temporary password set by staff, self change, sessions revoked.
test.describe.configure({ mode: 'serial' })

const CAIO = { email: 'caio@teste.local', name: 'Caio Teste' }
const TEMP = 'senha-provisoria-1'
const NEW = 'nova-senha-caio-1'
const BANNER = 'Você está usando uma senha provisória.'

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.createAssinante({ ...CAIO, password: TEMP })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

async function newPage(browser: Browser, baseURL: string) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  return { context, page: await context.newPage() }
}

test('temporary password: banner, validation, change, other sessions logged out', async ({ browser, baseURL }) => {
  test.setTimeout(120_000)
  // A second device logged in before the change
  const other = await newPage(browser, baseURL!)
  await loginAsAssinante(other.page, CAIO.email, TEMP)

  const { context, page } = await newPage(browser, baseURL!)
  await loginAsAssinante(page, CAIO.email, TEMP)
  const main = page.locator('main')
  await expect(main).toContainText(BANNER)
  await expect(main.getByRole('link', { name: 'Troque agora.' })).toHaveAttribute('href', '/area-do-assinante/senha')

  await main.getByRole('link', { name: 'Troque agora.' }).click()
  await expect(page.getByRole('heading', { name: 'Trocar senha', level: 1 })).toBeVisible()

  const submit = async (atual: string, nova: string, confirmacao: string) => {
    await page.getByLabel('Senha atual').fill(atual)
    await page.getByLabel('Nova senha', { exact: true }).fill(nova)
    await page.getByLabel('Repita a nova senha').fill(confirmacao)
    await page.getByRole('button', { name: 'Salvar nova senha' }).click()
  }
  await submit('senha-errada-1', NEW, NEW)
  await expect(main.getByRole('alert')).toHaveText('Senha atual incorreta.')
  await submit(TEMP, 'curta', 'curta')
  await expect(main.getByRole('alert')).toHaveText('A nova senha precisa ter pelo menos 8 caracteres.')
  await submit(TEMP, NEW, 'outra-senha-1')
  await expect(main.getByRole('alert')).toHaveText('As senhas não conferem.')

  await submit(TEMP, NEW, NEW)
  await expect(page).toHaveURL(/\/area-do-assinante\?ok=senha$/)
  await expect(main.getByRole('status')).toHaveText('Senha alterada.')
  await expect(main).not.toContainText(BANNER)

  // The other device was logged out
  await other.page.goto('/area-do-assinante')
  await expect(other.page).toHaveURL(/\/entrar\?next=/)
  await other.context.close()

  // Old password fails, new one works
  await page.locator('nav[aria-label="Área do assinante"]').getByRole('button', { name: 'Sair' }).click()
  await page.goto('/entrar')
  await page.getByLabel('E-mail').fill(CAIO.email)
  await page.getByLabel('Senha', { exact: true }).fill(TEMP)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(main.getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
  await loginAsAssinante(page, CAIO.email, NEW)
  await expect(main).not.toContainText(BANNER)
  await context.close()
})

// Staff-generated link (D-04): single use, 48 h, no e-mail.
const DANI = { email: 'dani@teste.local', name: 'Dani Teste', whatsapp: '5561999990000' }
const EXPIRED = 'Este link expirou ou já foi usado. Peça um novo para a equipe pelo WhatsApp.'

test('password link: create the password, log in, reuse shows the expired message', async ({ browser, baseURL, request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  const dani = await api.createAssinante({ ...DANI, password: 'senha-provisoria-2' })
  const { url } = await api.linkSenha(dani.id)
  const path = new URL(url).pathname + new URL(url).search

  const { context, page } = await newPage(browser, baseURL!)
  const main = page.locator('main')
  const res = await page.goto(path)
  expect(res?.headers()['x-robots-tag']).toContain('noindex')
  await expect(page.getByRole('heading', { name: 'Criar nova senha', level: 1 })).toBeVisible()

  const submit = async (nova: string, confirmacao: string) => {
    await page.getByLabel('Nova senha', { exact: true }).fill(nova)
    await page.getByLabel('Repita a nova senha').fill(confirmacao)
    await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  }
  await submit('curta', 'curta')
  await expect(main.getByRole('alert')).toHaveText('A nova senha precisa ter pelo menos 8 caracteres.')
  await submit('nova-senha-dani-1', 'outra-senha-dani')
  await expect(main.getByRole('alert')).toHaveText('As senhas não conferem.')
  await submit('nova-senha-dani-1', 'nova-senha-dani-1')
  await expect(page).toHaveURL(/\/area-do-assinante\?ok=senha$/)
  await expect(main.getByRole('status')).toHaveText('Senha alterada.')
  await expect(main).not.toContainText(BANNER)

  // Single use
  await page.goto(path)
  await expect(main.getByRole('alert')).toHaveText(EXPIRED)
  await context.close()

  // The new password works on a fresh device
  const fresh = await newPage(browser, baseURL!)
  await loginAsAssinante(fresh.page, DANI.email, 'nova-senha-dani-1')
  await fresh.context.close()

  // Logged as done by the subscriber, without the token
  const log = await api.get(`/api/audit-log?where[assinante][equals]=${dani.id}&limit=50&depth=0`)
  const rows = (log.docs as { action: string; actorType: string; summary: string }[]).filter(
    (r) => r.action === 'senha-trocada-pelo-assinante',
  )
  expect(rows).toHaveLength(1)
  expect(rows[0].actorType).toBe('assinante')
  expect(rows[0].summary).toBe('Senha criada pelo link enviado pela equipe')
  expect(JSON.stringify(log)).not.toContain(new URL(url).searchParams.get('token')!)
  await api.dispose()
})

test('/nova-senha without a valid token shows the expired message, noindex', async ({ browser, baseURL }) => {
  const { context, page } = await newPage(browser, baseURL!)
  for (const path of ['/nova-senha', '/nova-senha?token=0123456789abcdef0123456789abcdef01234567']) {
    const res = await page.goto(path)
    expect(res?.headers()['x-robots-tag']).toContain('noindex')
    await expect(page.locator('main').getByRole('alert')).toHaveText(EXPIRED)
    await expect(page.getByLabel('Nova senha', { exact: true })).toHaveCount(0)
  }
  await context.close()
})

test('link endpoint is staff only (403 for anonymous and subscribers)', async ({ playwright, baseURL, request }) => {
  const api = await staffApi(request)
  const edu = await api.createAssinante({ email: 'edu@teste.local', name: 'Edu Teste', password: 'senha-edu-12345' })
  await api.dispose()

  const anon = await playwright.request.newContext({ baseURL })
  expect((await anon.post(`/api/assinantes/${edu.id}/link-senha`, { data: {} })).status()).toBe(403)
  const login = await anon.post('/api/assinantes/login', { data: { email: 'edu@teste.local', password: 'senha-edu-12345' } })
  expect(login.ok()).toBe(true)
  const { token } = (await login.json()) as { token: string }
  const asSub = await anon.post(`/api/assinantes/${edu.id}/link-senha`, {
    data: {},
    headers: { Authorization: `JWT ${token}` },
  })
  expect(asSub.status()).toBe(403)
  await anon.dispose()
})

test('admin panel generates the link with copy and WhatsApp buttons', async ({ page, request, isMobile }) => {
  test.skip(isMobile, 'admin flow runs on desktop only')
  test.setTimeout(120_000)
  const api = await staffApi(request)
  const fabi = await api.createAssinante({ email: 'fabi@teste.local', name: 'Fabi Teste', password: 'senha-fabi-1234', whatsapp: '5561988887777' })
  await api.dispose()

  await loginAsStaff(page)
  await page.goto(`/admin/collections/assinantes/${fabi.id}`)
  const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Assinatura', exact: true }) })
  await expect(panel).toContainText('Para definir uma senha provisória, use o campo Senha desta ficha.')
  await panel.getByRole('button', { name: 'Gerar link de nova senha' }).click()
  const field = panel.getByLabel('Link de nova senha')
  await expect(field).toHaveValue(/\/nova-senha\?token=[0-9a-f]{40}$/)
  await expect(panel).toContainText('Vale por 48 horas e só pode ser usado uma vez.')
  await expect(panel.getByRole('button', { name: 'Copiar' })).toBeVisible()
  const wa = panel.getByRole('link', { name: 'Enviar pelo WhatsApp' })
  await expect(wa).toHaveAttribute('href', /^https:\/\/wa\.me\/5561988887777\?text=/)

  // The link works once
  const url = new URL(await field.inputValue())
  const { context, page: sub } = await newPage(page.context().browser()!, new URL(page.url()).origin)
  await sub.goto(url.pathname + url.search)
  await expect(sub.getByLabel('Nova senha', { exact: true })).toBeVisible()
  await context.close()
})

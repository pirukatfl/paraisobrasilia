import { expect, test, type Browser } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

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

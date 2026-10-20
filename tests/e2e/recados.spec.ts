import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { fetchAs } from './helpers/classisex'

// REC-01 / D-01: subscribers post recados (moderated, contacts removed), read the board of active
// authors, and delete their own; nothing leaks to expired subscribers or REST (T-05-02..04).
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-recados-12345'
const RITA = { email: 'rita.recado@teste.local', name: 'Rita Recado', password: PASSWORD }
const DAVI = { email: 'davi.leitor@teste.local', name: 'Davi Leitor', password: PASSWORD }
const TEXTO = 'Casal tranquilo procurando amigos, chama no 61 98877-6655'
const PATH = '/area-do-assinante/recados'
let ritaId = 0
let daviId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('assinantes')
  ritaId = (await api.createAssinante(RITA)).id
  daviId = (await api.createAssinante(DAVI)).id
  await api.liberar(ritaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.liberar(daviId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('recados')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function login(browser: Browser, baseURL: string, who: typeof RITA, next = PATH) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, who.email, who.password, next)
  return { context, page }
}

const post = async (page: Page, apelido: string, texto: string) => {
  await page.getByLabel('Seu apelido').fill(apelido)
  await page.getByLabel('Recado', { exact: true }).fill(texto)
  await page.getByRole('button', { name: 'Enviar para aprovação' }).click()
}

test('the form, the sub-nav and the redaction notice', async ({ browser, baseURL }) => {
  const { context, page } = await login(browser, baseURL!, RITA)
  await expect(page.getByRole('heading', { name: 'Recados', level: 1 })).toBeVisible()
  const nav = page.getByRole('navigation', { name: 'Área do assinante' })
  const labels = await nav.getByRole('link').allTextContents()
  expect(labels.map((l) => l.trim())).toEqual([
    'Minha assinatura',
    'ClassiSex',
    'Recados',
    'Mensagens',
    'Contos',
    'Meus anúncios',
    'Trocar senha',
  ])
  await expect(page.getByLabel('Seu apelido')).toHaveValue('')
  const texto = page.getByLabel('Recado', { exact: true })
  await expect(texto).toHaveAttribute('maxlength', '500')
  await texto.fill('abc')
  await expect(page.getByText('3/500')).toBeVisible()
  await expect(page.getByText('Telefones, e-mails, @ e links são retirados. Para trocar contato, use Enviar mensagem.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Enviar para aprovação' })).toBeVisible()
  await context.close()
})

test('a posted recado is redacted, pending and invisible to others until approved', async ({ browser, baseURL, request }) => {
  const rita = await login(browser, baseURL!, RITA)
  await post(rita.page, 'Rita e Beto', TEXTO)
  await expect(rita.page.getByRole('status')).toContainText('Recado enviado. Ele aparece no mural depois que a equipe aprovar.')
  const own = rita.page.getByRole('region', { name: 'Seus recados' })
  await expect(own).toContainText('Em análise pela equipe')
  await expect(own).toContainText('[contato só para assinantes]')
  await expect(own).not.toContainText('98877')
  await expect(own).toContainText('Removemos 1 contato do seu recado.')
  // The apelido is remembered on the account
  await rita.page.goto(PATH)
  await expect(rita.page.getByLabel('Seu apelido')).toHaveValue('Rita e Beto')

  const davi = await login(browser, baseURL!, DAVI)
  await expect(davi.page.getByRole('region', { name: 'Mural de recados' })).not.toContainText('Rita e Beto')

  // Approve through the audited staff endpoint (05-06)
  const api = await staffApi(request)
  const [recado] = await api.findRecados(`where[author][equals]=${ritaId}`)
  await api.aprovarRecado(recado!.id)
  await api.dispose()

  await davi.page.reload()
  const board = davi.page.getByRole('region', { name: 'Mural de recados' })
  const card = board.getByRole('article').filter({ hasText: 'Rita e Beto' })
  await expect(card).toHaveCount(1)
  await expect(card).toContainText('[contato só para assinantes]')
  await expect(card).not.toContainText('Seu recado')
  await rita.page.reload()
  await expect(rita.page.getByRole('region', { name: 'Mural de recados' }).getByRole('article').filter({ hasText: 'Seu recado' })).toHaveCount(1)
  await rita.context.close()
  await davi.context.close()
})

test('the limit of 3 active recados keeps the typed text; Apagar frees a slot', async ({ browser, baseURL }) => {
  const { context, page } = await login(browser, baseURL!, RITA)
  const own = page.getByRole('region', { name: 'Seus recados' })
  // The page URL does not change between posts: wait for the new card instead of the status alert
  await post(page, 'Rita e Beto', 'Segundo recado')
  await expect(own.getByRole('article')).toHaveCount(2)
  await post(page, 'Rita e Beto', 'Terceiro recado')
  await expect(own.getByRole('article')).toHaveCount(3)
  await post(page, 'Rita e Beto', 'Quarto recado que não passa')
  await expect(page.getByRole('alert').filter({ hasText: 'Você já tem 3 recados ativos. Apague um para publicar outro.' })).toBeVisible()
  await expect(page.getByLabel('Recado', { exact: true })).toHaveValue('Quarto recado que não passa')

  await expect(own.getByRole('article')).toHaveCount(3)
  await own.getByRole('article').filter({ hasText: 'Terceiro recado' }).locator('summary').click()
  await own.getByRole('article').filter({ hasText: 'Terceiro recado' }).getByRole('button', { name: 'Sim, apagar' }).click()
  await expect(page.getByRole('status')).toContainText('Recado apagado.')
  await expect(own.getByRole('article')).toHaveCount(2)
  await context.close()
})

test('an ended subscription removes the recado from the board and the form from its author', async ({ browser, baseURL, request }) => {
  const api = await staffApi(request)
  const davi = await login(browser, baseURL!, DAVI)
  await expect(davi.page.getByRole('region', { name: 'Mural de recados' })).toContainText('Rita e Beto')
  await api.encerrar(ritaId, 'fim do teste')
  await davi.page.reload()
  await expect(davi.page.getByRole('region', { name: 'Mural de recados' })).not.toContainText('Rita e Beto')

  const rita = await login(browser, baseURL!, RITA)
  await expect(rita.page.getByRole('heading', { name: 'Sua assinatura não está ativa' })).toBeVisible()
  await expect(rita.page.getByRole('button', { name: 'Enviar para aprovação' })).toHaveCount(0)
  await expect(rita.page.getByRole('region', { name: 'Mural de recados' })).toHaveCount(0)
  const own = rita.page.getByRole('region', { name: 'Seus recados' })
  await expect(own).toContainText('Fora do ar: assinatura vencida')
  await expect(own.locator('summary', { hasText: 'Apagar' })).toHaveCount(2)
  await api.dispose()
  await rita.context.close()
  await davi.context.close()
})

test('anonymous visitors are sent to the login and REST stays closed to subscribers', async ({ browser, baseURL }) => {
  const anon = await browser.newContext({ baseURL })
  await anon.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  const page = await anon.newPage()
  await page.goto(PATH)
  await expect(page).toHaveURL(/\/entrar\?next=/)
  await anon.close()

  const davi = await login(browser, baseURL!, DAVI)
  const created = await fetchAs(davi.page, 'POST', '/api/recados', { json: { author: daviId, apelido: 'x', texto: 'y' } })
  expect(created.status).toBe(403)
  const list = await fetchAs(davi.page, 'GET', '/api/recados')
  expect(list.status).toBe(403)
  const api = await staffApi(davi.page.request)
  const [any] = await api.findRecados()
  await api.dispose()
  if (any) {
    const patched = await fetchAs(davi.page, 'PATCH', `/api/recados/${any.id}`, { json: { status: 'aprovado' } })
    expect(patched.status).toBe(403)
  }
  await davi.context.close()
})

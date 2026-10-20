import { expect, test, type Browser, type Page } from '@playwright/test'

import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { loginAsStaff } from './helpers/staff'

// REC-03: block and report from the thread; staff resolve and may suspend messaging; every
// resolution is audited (T-05-07, T-05-09, T-05-11, T-05-28).
test.describe.configure({ mode: 'serial' })
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

const PASSWORD = 'senha-bloqueio-12345'
const ANA = { email: 'ana.bloqueio@teste.local', name: 'Ana Bloqueio', password: PASSWORD }
const BETO = { email: 'beto.bloqueio@teste.local', name: 'Beto Bloqueio', password: PASSWORD }
const BASE = '/area-do-assinante/mensagens'
const NEUTRAL = 'Não é possível enviar mensagens para esta pessoa.'
let anaId = 0
let adId = 0
let conversaId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  anaId = (await api.createAssinante(ANA)).id
  const betoId = (await api.createAssinante(BETO)).id
  await api.liberar(anaId, { durationDays: 30, method: 'cortesia', amount: 0 })
  await api.liberar(betoId, { durationDays: 30, method: 'cortesia', amount: 0 })
  adId = (await api.createAd({ author: anaId, apelido: 'AnaBSB', status: 'aprovado' })).id
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('ads')
  await api.deleteAll('assinantes')
  await api.dispose()
})

async function login(browser: Browser, baseURL: string, who: typeof ANA, next = BASE) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, who.email, who.password, next)
  return { context, page }
}

async function reply(page: Page, texto: string) {
  await page.getByLabel('Mensagem', { exact: true }).fill(texto)
  await page.getByRole('button', { name: 'Enviar' }).click()
}

test('Beto starts a conversation from the ad; Ana blocks him from the thread', async ({ browser, baseURL }) => {
  const beto = await login(browser, baseURL!, BETO, `/area-do-assinante/classisex/${adId}`)
  await beto.page.getByRole('link', { name: 'Enviar mensagem' }).click()
  await beto.page.getByLabel('Seu apelido').fill('BetoDF')
  await beto.page.getByLabel('Mensagem', { exact: true }).fill('Oi, vi seu anúncio')
  await beto.page.getByRole('button', { name: 'Enviar' }).click()
  await expect(beto.page).toHaveURL(new RegExp(`${BASE}/\\d+$`))
  conversaId = Number(beto.page.url().split('/').pop())
  await beto.context.close()

  const ana = await login(browser, baseURL!, ANA, `${BASE}/${conversaId}`)
  await expect(ana.page.getByRole('heading', { name: 'Conversa com BetoDF', level: 1 })).toBeVisible()
  await ana.page.getByText('Bloquear', { exact: true }).click()
  await ana.page.getByRole('button', { name: 'Sim, bloquear' }).click()
  await expect(ana.page.getByText('Você bloqueou esta pessoa.', { exact: true })).toBeVisible()
  await expect(ana.page.getByRole('button', { name: 'Desbloquear' })).toBeVisible()
  await expect(ana.page.getByRole('heading', { name: 'Responder' })).toHaveCount(0)
  await ana.context.close()
})

test('the blocked person gets a neutral message, even from the ad', async ({ browser, baseURL }) => {
  const beto = await login(browser, baseURL!, BETO, `${BASE}/${conversaId}`)
  await expect(beto.page.getByText('Oi, vi seu anúncio')).toBeVisible()
  await reply(beto.page, 'Oi?')
  await expect(beto.page.getByText(NEUTRAL)).toBeVisible()
  await beto.page.goto(`${BASE}/nova?anuncio=${adId}`)
  await expect(beto.page).toHaveURL(new RegExp(`${BASE}/${conversaId}$`))
  await reply(beto.page, 'Oi de novo')
  await expect(beto.page.getByText(NEUTRAL)).toBeVisible()
  await beto.context.close()
})

test('unblocking restores the conversation', async ({ browser, baseURL }) => {
  const ana = await login(browser, baseURL!, ANA, `${BASE}/${conversaId}`)
  await ana.page.getByRole('button', { name: 'Desbloquear' }).click()
  await expect(ana.page.getByRole('heading', { name: 'Responder' })).toBeVisible()
  await ana.context.close()
  const beto = await login(browser, baseURL!, BETO, `${BASE}/${conversaId}`)
  await reply(beto.page, 'Voltei')
  await expect(beto.page.getByRole('list', { name: 'Mensagens' })).toContainText('Voltei')
  await beto.context.close()
})

test('Beto reports the conversation and blocks Ana at the same time', async ({ browser, baseURL }) => {
  const ana = await login(browser, baseURL!, ANA, `${BASE}/${conversaId}`)
  await reply(ana.page, 'Oi Beto!')
  await expect(ana.page.getByRole('list', { name: 'Mensagens' })).toContainText('Oi Beto!')
  await ana.context.close()

  const beto = await login(browser, baseURL!, BETO, `${BASE}/${conversaId}`)
  await beto.page.getByText('Denunciar', { exact: true }).click()
  await expect(beto.page.getByRole('radio')).toHaveCount(6)
  await expect(beto.page.getByLabel('Também bloquear esta pessoa')).toBeChecked()
  await beto.page.getByLabel('Assédio ou insistência').check()
  await beto.page.getByLabel('Detalhes (opcional)').fill('Insiste muito')
  await beto.page.getByRole('button', { name: 'Enviar denúncia' }).click()
  await expect(beto.page.getByText('Denúncia enviada. A equipe vai analisar.')).toBeVisible()
  await expect(beto.page.getByText('Você bloqueou esta pessoa.', { exact: true })).toBeVisible()
  await beto.context.close()
})

test.describe('staff', () => {
  test.skip(({ isMobile }) => isMobile, 'admin flow runs on desktop only')

  test('the dashboard counts the report; the report shows the captured messages; sidebar entries', async ({ page }) => {
    test.setTimeout(150_000)
    await loginAsStaff(page)
    await page.goto('/admin')
    await expect(page.getByRole('link', { name: 'Mensagens: 1 denúncia aberta' })).toBeVisible()
    await expect(page.locator('nav a[href="/admin/collections/message-reports"]')).toHaveCount(1)
    for (const hidden of ['conversations', 'messages', 'blocks']) {
      await expect(page.locator(`a[href="/admin/collections/${hidden}"]`)).toHaveCount(0)
    }
    await page.getByRole('link', { name: 'Mensagens: 1 denúncia aberta' }).click()
    await expect(page.locator('table tbody tr')).toHaveCount(1)
    const href = await page.locator('table tbody tr').first().getByRole('link').first().getAttribute('href')
    await page.goto(href!)
    const panel = page.locator('section', { has: page.getByRole('heading', { name: 'Denúncia', exact: true }) })
    await expect(panel).toContainText('Assédio ou insistência · Aberta')
    await expect(panel).toContainText('Insiste muito')
    await expect(page.locator('#field-mensagens')).toHaveValue(/Oi, vi seu anúncio[\s\S]*Oi Beto!/)
    await panel.getByRole('button', { name: 'Suspender mensagens' }).click()
    await expect(panel.getByRole('alert')).toHaveText('Escreva uma nota para resolver ou suspender.')
    await panel.getByLabel(/^Nota/).fill('Insistência confirmada')
    await panel.getByRole('button', { name: 'Suspender mensagens' }).click()
    await expect(panel).toContainText('Mensagens da pessoa suspensas e denúncias fechadas.')
    await expect(panel).toContainText('Assédio ou insistência · Resolvida')
  })

  test('the suspended person is told so; staff free the account by unticking', async ({ browser, baseURL, page }) => {
    test.setTimeout(150_000)
    const ana = await login(browser, baseURL!, ANA, `${BASE}/${conversaId}`)
    await reply(ana.page, 'Posso falar?')
    await expect(
      ana.page.getByText('Seu envio de mensagens foi suspenso pela equipe. Fale com a casa pelo WhatsApp.'),
    ).toBeVisible()

    await loginAsStaff(page)
    await page.goto(`/admin/collections/assinantes/${anaId}`)
    const box = page.locator('#field-mensagensSuspensas')
    await expect(box).toBeChecked()
    await box.uncheck()
    await page.getByRole('button', { name: 'Salvar' }).click()
    await expect(page.getByText(/sucesso/i).first()).toBeVisible()

    // Still blocked by Beto (the report asked for it), but no longer suspended
    await reply(ana.page, 'E agora?')
    await expect(ana.page.getByText(NEUTRAL)).toBeVisible()
    await ana.context.close()
  })

  test('the action log lists the resolution and the suspension', async ({ page }) => {
    await loginAsStaff(page)
    await page.goto('/admin/collections/audit-log?search=ana.bloqueio%40teste.local&limit=50')
    const rows = page.locator('table tbody tr')
    await expect(rows.filter({ has: page.getByRole('cell', { name: 'Denúncia de mensagem resolvida', exact: true }) })).toHaveCount(1)
    await expect(rows.filter({ has: page.getByRole('cell', { name: 'Mensagens suspensas', exact: true }) })).toHaveCount(1)
  })
})

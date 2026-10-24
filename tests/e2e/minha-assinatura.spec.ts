import { expect, test, type Browser } from '@playwright/test'

import { daysLeft, validUntilLabel } from '../../src/lib/assinantes/periods'
import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'
import { headerMenu } from './helpers/menu'

// ASS-03 / ASS-04: subscribers see until when they have access; restricted content only while
// a period is active (no restricted markup otherwise, T-03-05).
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-provisoria-1'
// Intro of the members ClassiSex (Phase 4 replaced the Phase 3 'Conteúdo exclusivo' placeholder)
const RESTRICTED = 'Anúncios publicados pelos assinantes do Paraíso.'
const DAY = 86_400_000

type Account = { email: string; name: string }
const ATIVA: Account = { email: 'ativa@teste.local', name: 'Ativa Teste' }
const VENCIDA: Account = { email: 'vencida@teste.local', name: 'Vencida Teste' }
const SEM: Account = { email: 'sem@teste.local', name: 'Sem Teste' }
const ENCERRADA: Account = { email: 'encerrada@teste.local', name: 'Encerrada Teste' }

let ativaEndsAt = ''
let vencidaEndsAt = ''

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  const mensal = (await api.findPlans()).find((p) => p.name === 'Mensal')!
  const ids: Record<string, number> = {}
  for (const acc of [ATIVA, VENCIDA, SEM, ENCERRADA]) {
    ids[acc.email] = (await api.createAssinante({ ...acc, password: PASSWORD })).id
  }
  const now = Date.now()
  ativaEndsAt = (
    await api.createSubscription({ assinante: ids[ATIVA.email], plan: mensal.id, startsAt: new Date(now).toISOString() })
  ).endsAt
  vencidaEndsAt = (
    await api.createSubscription({
      assinante: ids[VENCIDA.email],
      startsAt: new Date(now - 40 * DAY).toISOString(),
      endsAt: new Date(now - 10 * DAY).toISOString(),
      payment: { method: 'pix', amount: 30 },
    })
  ).endsAt
  const current = await api.createSubscription({
    assinante: ids[ENCERRADA.email],
    plan: mensal.id,
    startsAt: new Date(now - DAY).toISOString(),
  })
  await api.endSubscription(current.id)
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

/** Fresh context per subscriber (one auth cookie per browser, Pitfall 1). */
async function asSubscriber(browser: Browser, baseURL: string, acc: Account) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, PASSWORD)
  return { page, context }
}

test('active subscription shows the valid-until date and opens the restricted page', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, ATIVA)
  await page.goto('/area-do-assinante')
  const main = page.locator('main')
  await expect(main).toContainText('Sua assinatura: Ativa')
  await expect(main).toContainText(`Válida até ${validUntilLabel(ativaEndsAt)}`)
  await expect(main).toContainText(`Faltam ${daysLeft(ativaEndsAt, new Date())} dias`)

  const nav = await headerMenu(page)
  await expect(nav.getByRole('link', { name: 'Minha assinatura' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'ClassiSex' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Meus anúncios' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Trocar senha' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Conteúdo exclusivo' })).toHaveCount(0)
  await expect(nav.getByRole('button', { name: 'Sair' })).toBeVisible()

  await nav.getByRole('link', { name: 'ClassiSex' }).click()
  await expect(page.getByRole('heading', { name: 'ClassiSex', level: 1 })).toBeVisible()
  await expect(main).toContainText(RESTRICTED)

  // The Phase 3 placeholder address now leads to the ClassiSex
  await page.goto('/area-do-assinante/exclusivo')
  await expect(page).toHaveURL(/\/area-do-assinante\/classisex$/)
  await context.close()
})

test('expired subscription offers renewal and hides the restricted content', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, VENCIDA)
  await page.goto('/area-do-assinante')
  const main = page.locator('main')
  await expect(main).toContainText(`Sua assinatura venceu em ${validUntilLabel(vencidaEndsAt)}`)
  await expect(main.getByRole('link', { name: 'Renovar' })).toHaveAttribute('href', '/assine-ja')
  await expect(main.getByRole('link', { name: /WhatsApp/ })).toHaveAttribute('href', /^https:\/\/wa\.me\//)

  await page.goto('/area-do-assinante/classisex')
  await expect(main).toContainText('Sua assinatura não está ativa')
  expect(await page.content()).not.toContain(RESTRICTED)
  await context.close()
})

test('account without subscription sees the plans link', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, SEM)
  await page.goto('/area-do-assinante')
  const main = page.locator('main')
  await expect(main).toContainText('Sua conta ainda não tem uma assinatura ativa.')
  await expect(main.getByRole('link', { name: 'Ver planos' })).toHaveAttribute('href', '/assine-ja')
  await page.goto('/area-do-assinante/classisex')
  // never subscribed: the free-account panel (G-02) instead of the expiry panel
  await expect(main.getByRole('heading', { name: 'Disponível para assinantes' })).toBeVisible()
  await expect(main.getByRole('link', { name: 'Assine Já' })).toHaveAttribute('href', '/assine-ja')
  expect(await page.content()).not.toContain(RESTRICTED)
  await context.close()
})

test('access ended by staff is explained', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, ENCERRADA)
  await page.goto('/area-do-assinante')
  await expect(page.locator('main')).toContainText(
    'Seu acesso foi encerrado pela equipe. Fale com a gente pelo WhatsApp.',
  )
  await page.goto('/area-do-assinante/classisex')
  await expect(page.locator('main')).toContainText('Sua assinatura não está ativa')
  expect(await page.content()).not.toContain(RESTRICTED)
  await context.close()
})

test('anonymous visitors are sent to /entrar from the restricted page', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/area-do-assinante/classisex')
  await expect(page).toHaveURL(/\/entrar\?next=%2Farea-do-assinante%2Fclassisex$/)
  // Old placeholder address: redirected first, then sent to /entrar
  await page.goto('/area-do-assinante/exclusivo')
  await expect(page).toHaveURL(/\/entrar\?next=%2Farea-do-assinante%2Fclassisex$/)
})

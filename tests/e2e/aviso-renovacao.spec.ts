import { expect, test, type Browser } from '@playwright/test'

import { validUntilLabel } from '../../src/lib/assinantes/periods'
import { staffApi } from './helpers/api'
import { loginAsAssinante } from './helpers/assinante'

// Renewal strip above the header: only for subscribers whose period ends within 7 days or already ended.
test.describe.configure({ mode: 'serial' })

const PASSWORD = 'senha-provisoria-1'
const DAY = 86_400_000

type Account = { email: string; name: string }
const PERTO: Account = { email: 'aviso-perto@teste.local', name: 'Aviso Perto' }
const LONGE: Account = { email: 'aviso-longe@teste.local', name: 'Aviso Longe' }
const VENCIDA: Account = { email: 'aviso-vencida@teste.local', name: 'Aviso Vencida' }
const SEM: Account = { email: 'aviso-sem@teste.local', name: 'Aviso Sem' }

let vencidaEndsAt = ''

test.beforeAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  const ids: Record<string, number> = {}
  for (const acc of [PERTO, LONGE, VENCIDA, SEM]) {
    ids[acc.email] = (await api.createAssinante({ ...acc, password: PASSWORD })).id
  }
  const now = Date.now()
  const period = (email: string, startOffset: number, endOffset: number) =>
    api.createSubscription({
      assinante: ids[email],
      startsAt: new Date(now + startOffset * DAY).toISOString(),
      endsAt: new Date(now + endOffset * DAY).toISOString(),
      payment: { method: 'pix', amount: 30 },
    })
  await period(PERTO.email, -27, 3)
  await period(LONGE.email, -10, 20)
  vencidaEndsAt = (await period(VENCIDA.email, -40, -10)).endsAt
  await api.dispose()
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
})

/** Fresh context per subscriber (one auth cookie per browser). */
async function asSubscriber(browser: Browser, baseURL: string, acc: Account) {
  const context = await browser.newContext({ baseURL })
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL }])
  const page = await context.newPage()
  await loginAsAssinante(page, acc.email, PASSWORD)
  return { page, context }
}

test('subscription ending in 3 days shows the renewal banner', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, PERTO)
  await page.goto('/')
  const banner = page.getByTestId('aviso-renovacao')
  await expect(banner).toBeVisible()
  await expect(banner).toContainText('Sua assinatura vence em')
  await expect(banner.getByRole('link', { name: 'Renovar agora' })).toHaveAttribute('href', '/assine-ja')
  await context.close()
})

test('subscription with 20 days left shows no banner', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, LONGE)
  await page.goto('/')
  await expect(page.getByTestId('aviso-renovacao')).toHaveCount(0)
  await context.close()
})

test('expired subscription shows the banner', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, VENCIDA)
  await page.goto('/')
  const banner = page.getByTestId('aviso-renovacao')
  await expect(banner).toContainText(`Sua assinatura venceu em ${validUntilLabel(vencidaEndsAt)}`)
  await expect(banner.getByRole('link', { name: 'Renovar agora' })).toHaveAttribute('href', '/assine-ja')
  await context.close()
})

test('account that never subscribed sees no banner', async ({ browser, baseURL }) => {
  const { page, context } = await asSubscriber(browser, baseURL!, SEM)
  await page.goto('/')
  await expect(page.getByTestId('aviso-renovacao')).toHaveCount(0)
  await context.close()
})

test('anonymous visitors see no banner', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await page.goto('/')
  await expect(page.getByTestId('aviso-renovacao')).toHaveCount(0)
})

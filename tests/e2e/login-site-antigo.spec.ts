import { expect, test, type Page } from '@playwright/test'

import { getTestPayload, seedLegacyAssinante } from '../helpers/seed'
import { staffApi } from './helpers/api'

// M-03: members imported from the old site enter with the old WordPress password.
// Hashes are the PHP-generated synthetic vectors of 06-RESEARCH §1.
test.skip(({ isMobile }) => !isMobile, 'one project is enough for this flow')
test.describe.configure({ mode: 'serial' })

const WP1 = '$wp$2y$10$9Q4zpTS2fiTKXOlU7LXUSeIvoh2bfYHnt8hHjrVynU50s9CXKFica'
const PH1 = '$P$BMqVaElQIGOM7G/gvip1NrrFWhngog.'
const WP3 = '$wp$2y$10$ZCyjg8Ai1fHJVHo4vpmju.MqB6nw24/NjZ9IiOXRF6VjB6zBH8Y..'
const OLD = 'senha-sintetica-1'

const ACC = {
  wp: { email: 'antiga.wp@teste.local', name: 'Antiga WP' },
  ph: { email: 'antiga.ph@teste.local', name: 'Antiga PH' },
  curta: { email: 'antiga.curta@teste.local', name: 'Antiga Curta' },
  link: { email: 'antiga.link@teste.local', name: 'Antiga Link' },
}
let linkId = 0

test.beforeAll(async ({ request }) => {
  test.setTimeout(120_000)
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
  const payload = await getTestPayload()
  await seedLegacyAssinante(payload, { ...ACC.wp, hash: WP1, wpUserId: 101 })
  await seedLegacyAssinante(payload, { ...ACC.ph, hash: PH1, wpUserId: 102 })
  await seedLegacyAssinante(payload, { ...ACC.curta, hash: WP3, wpUserId: 103 })
  linkId = (await seedLegacyAssinante(payload, { ...ACC.link, hash: WP1, wpUserId: 104 })).id
})

test.afterAll(async ({ request }) => {
  const api = await staffApi(request)
  await api.deleteAll('assinantes')
  await api.dispose()
})

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
})

async function submitLogin(page: Page, email: string, password: string, next?: string) {
  await page.goto(next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
}

test('$wp$ account: old password logs in and lands on next; the same password works again', async ({ page }) => {
  await submitLogin(page, ACC.wp.email, OLD, '/area-do-assinante/meus-anuncios')
  await expect(page).toHaveURL(/\/area-do-assinante\/meus-anuncios/)
  await page.goto('/area-do-assinante')
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/$/)
  await submitLogin(page, ACC.wp.email, OLD)
  await expect(page).toHaveURL(/\/area-do-assinante$/)
})

test('$P$ account logs in', async ({ page }) => {
  await submitLogin(page, ACC.ph.email, OLD)
  await expect(page).toHaveURL(/\/area-do-assinante/)
})

test('a wrong password shows the usual generic error', async ({ page }) => {
  await submitLogin(page, ACC.link.email, 'senha-errada-123')
  await expect(page).toHaveURL(/\/entrar\?erro=credenciais/)
  await expect(page.locator('main').getByRole('alert')).toHaveText('E-mail ou senha incorretos.')
})

test('short old password: creates a new one on the spot', async ({ page }) => {
  await submitLogin(page, ACC.curta.email, 'curta7')
  await expect(page).toHaveURL(/\/nova-senha\?token=/)
  await expect(page.getByRole('status')).toHaveText(
    'Sua senha do site antigo tem menos de 8 caracteres. Crie uma nova para continuar.',
  )
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-123')
  await page.getByLabel('Repita a nova senha').fill('nova-senha-123')
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\?ok=senha/)

  await page.getByRole('button', { name: 'Sair' }).click()
  await submitLogin(page, ACC.curta.email, 'curta7')
  await expect(page).toHaveURL(/\/entrar\?erro=credenciais/)
  await submitLogin(page, ACC.curta.email, 'nova-senha-123')
  await expect(page).toHaveURL(/\/area-do-assinante/)
})

test('a staff link (new password) makes the old WordPress password stop working', async ({ page, request }) => {
  const api = await staffApi(request)
  const { url } = await api.linkSenha(linkId)
  await api.dispose()
  await page.goto(new URL(url).pathname + new URL(url).search)
  await page.getByLabel('Nova senha', { exact: true }).fill('outra-senha-456')
  await page.getByLabel('Repita a nova senha').fill('outra-senha-456')
  await page.getByRole('button', { name: 'Salvar e entrar' }).click()
  await expect(page).toHaveURL(/\/area-do-assinante\?ok=senha/)
  await page.getByRole('button', { name: 'Sair' }).click()
  await submitLogin(page, ACC.link.email, OLD)
  await expect(page).toHaveURL(/\/entrar\?erro=credenciais/)
  await submitLogin(page, ACC.link.email, 'outra-senha-456')
  await expect(page).toHaveURL(/\/area-do-assinante/)
})

test('a cross-site POST to the login is rejected by the Origin guard', async ({ request }) => {
  const res = await request.post('/entrar', {
    headers: { origin: 'https://evil.example' },
    form: { email: ACC.wp.email, password: OLD },
    maxRedirects: 0,
  })
  expect(res.status()).toBe(403)
})

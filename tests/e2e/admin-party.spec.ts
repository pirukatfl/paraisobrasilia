import { expect, type Page, test } from '@playwright/test'
import path from 'path'

import { brasiliaAt } from '../helpers/dates'

// PAINEL-01: staff publish, edit and unpublish a party on their own; the site reflects it at once.
test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'admin flow runs on desktop only')

// Staff work in Portuguese, in Brasília time
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

const FLYER = path.resolve('tests/fixtures/flyer-square.jpg')
const STAFF_EMAIL = 'equipe@teste.local'
const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? 'senha-de-teste-123'

async function homeShows(page: Page, title: string) {
  await page.goto('/')
  return page.getByRole('link', { name: `Ver detalhes da festa ${title}` })
}

test('staff creates, publishes, edits and unpublishes a party', async ({ page, context, baseURL }) => {
  test.setTimeout(180_000)
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])

  // Log in
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(STAFF_EMAIL)
  await page.locator('#field-password').fill(STAFF_PASSWORD)
  await page.locator('button[type=submit]').click()
  await page.waitForURL(/\/admin$/)

  // Festas → Criar novo
  await page.goto('/admin/collections/parties/create')
  await page.locator('#field-title').fill('Festa E2E')

  const tomorrow = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(brasiliaAt(1, 23)))
  const startsAt = page.locator('#field-startsAt input')
  await startsAt.click()
  await startsAt.fill(`${tomorrow} 23:00`)
  await startsAt.press('Enter')

  // Flyer: create a media document in the drawer
  await page.getByRole('button', { name: 'Criar Novo' }).click()
  const [chooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.getByRole('button', { name: 'Selecione um arquivo' }).click(),
  ])
  await chooser.setFiles(FLYER)
  const drawer = page.locator('dialog, .drawer__content').filter({ hasText: 'Criando novo(a) Mídia' }).last()
  await drawer.locator('#field-alt').fill('Flyer da Festa E2E')
  await drawer.getByRole('button', { name: 'Salvar' }).click()
  await expect(drawer).toBeHidden()

  // The flyer format is automatic now: no selector, and the upload says any social format works
  await expect(page.locator('#field-flyerFormat')).not.toBeVisible()
  await expect(page.getByText('o site mostra inteiro')).toBeVisible()

  // Publicar
  await page.getByRole('button', { name: 'Publicar alterações' }).click()
  await expect(page.getByText('Status: Publicado')).toBeVisible()
  const editUrl = page.url()
  expect(editUrl).toMatch(/\/admin\/collections\/parties\/\d+/)

  // Visitor sees it right away (no 600 s wait)
  const site = await context.newPage()
  await expect(await homeShows(site, 'Festa E2E')).toBeVisible()

  // Edit the title and publish again
  await page.locator('#field-title').fill('Festa E2E Editada')
  // "Status: Publicado" is already on screen: wait for the save itself before checking the site
  const saved = page.waitForResponse(
    (r) => /\/api\/parties\/\d+/.test(r.url()) && r.request().method() === 'PATCH' && r.ok(),
  )
  await page.getByRole('button', { name: 'Publicar alterações' }).click()
  await saved
  await expect(page.getByText('Status: Publicado')).toBeVisible()
  await expect(await homeShows(site, 'Festa E2E Editada')).toBeVisible()

  // Despublicar (with confirmation)
  await page.locator('.doc-controls__popup .popup-button').click()
  await page.getByRole('button', { name: 'Despublicar', exact: true }).click()
  const confirm = page.getByRole('dialog').filter({ hasText: 'Confirmar despublicação' })
  await confirm.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Status: Rascunho')).toBeVisible()

  await expect(await homeShows(site, 'Festa E2E Editada')).toHaveCount(0)
  const res = await site.goto('/festas/festa-e2e')
  expect(res?.status()).toBe(404)
})

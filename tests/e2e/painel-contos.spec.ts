import { expect, test } from '@playwright/test'

import { loginAsStaff } from './helpers/staff'

// PAINEL-03 / PREV-03: staff write a conto, see what visitors will read and publish it.
test.skip(({ browserName, isMobile }) => browserName !== 'chromium' || isMobile, 'admin flow runs on desktop only')
test.use({ locale: 'pt-BR', timezoneId: 'America/Sao_Paulo' })

test('staff set the open excerpt of a conto and publish it', async ({ page, context, baseURL }) => {
  test.setTimeout(180_000)
  await context.addCookies([{ name: 'pb_age_ok', value: '1', url: baseURL! }])
  await loginAsStaff(page)

  await page.goto('/admin/collections/contos/create')
  await page.locator('#field-title').fill('Conto E2E do Painel')
  await expect(page.locator('#field-paragrafosAbertos')).toHaveValue('3')

  const date = page.locator('#field-publishedAt input').first()
  await date.click()
  await date.fill('01/06/2025')
  await date.press('Enter')

  const panel = page.getByTestId('trecho-aberto')
  await expect(panel).toContainText('Escreva o texto')

  // Single paragraph: first 60 words only
  const editor = page.locator('.rich-text-lexical [contenteditable="true"]').first()
  await editor.click()
  await page.keyboard.type('Sentinela Um abre o conto.')
  await expect(panel).toContainText('Visitantes leem as primeiras 60 palavras; o conto inteiro fica para assinantes.')

  // Five paragraphs
  for (const n of ['Dois', 'Três', 'Quatro', 'Cinco']) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Sentinela ${n} segue o conto.`)
  }
  await expect(panel).toContainText('Visitantes leem 3 de 5 parágrafos')
  await expect(panel).toContainText('Só assinantes: 2 parágrafos')
  await expect(panel).toContainText('Sentinela Um abre o conto.')
  await expect(panel).toContainText('Sentinela Três segue o conto.')
  await expect(panel).not.toContainText('Sentinela Cinco')

  await page.locator('#field-paragrafosAbertos').fill('5')
  await expect(panel).toContainText('Visitantes leem 4 de 5 parágrafos')
  await expect(panel).toContainText('Pelo menos um parágrafo fica sempre para assinantes.')
  await expect(panel).not.toContainText('Sentinela Cinco')

  // Imported-only fields are read-only and empty for staff-created contos
  await expect(page.getByText('Endereço no site antigo')).toBeVisible()
  await expect(page.getByText('No site antigo era só para assinantes')).toBeVisible()

  // Publicar
  await page.getByRole('button', { name: 'Publicar' }).first().click()
  await expect(page.getByText('Status: Publicado')).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/collections\/contos\/\d+/)

  // The list shows it as published
  await page.goto('/admin/collections/contos')
  const row = page.getByRole('row').filter({ hasText: 'Conto E2E do Painel' })
  await expect(row).toBeVisible()
  await expect(row).toContainText('Publicado')

  // Despublicar leaves it as a draft
  await row.getByRole('link').first().click()
  await page.locator('.doc-controls__popup .popup-button').click()
  await page.getByRole('button', { name: 'Despublicar', exact: true }).click()
  const confirm = page.getByRole('dialog').filter({ hasText: 'Confirmar despublicação' })
  await confirm.getByRole('button', { name: 'Confirmar' }).click()
  await expect(page.getByText('Status: Rascunho')).toBeVisible()
})

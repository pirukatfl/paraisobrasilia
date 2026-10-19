import { expect, type Page } from '@playwright/test'

/** Logs a subscriber in through /entrar (the real login form) and waits for the members area. */
export async function loginAsAssinante(page: Page, email: string, password: string, next?: string): Promise<void> {
  await page.goto(next ? `/entrar?next=${encodeURIComponent(next)}` : '/entrar')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Senha', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(/\/area-do-assinante/)
  await expect(page.locator('h1')).toBeVisible()
}

import type { Page } from '@playwright/test'

export const STAFF_EMAIL = 'equipe@teste.local'
export const STAFF_PASSWORD = process.env.E2E_STAFF_PASSWORD ?? 'senha-de-teste-123'

/** Logs the seeded staff user into /admin. */
export async function loginAsStaff(page: Page): Promise<void> {
  await page.goto('/admin/login')
  await page.locator('#field-email').fill(STAFF_EMAIL)
  await page.locator('#field-password').fill(STAFF_PASSWORD)
  await page.locator('button[type=submit]').click()
  await page.waitForURL(/\/admin$/)
}

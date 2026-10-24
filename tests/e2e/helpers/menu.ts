import type { Locator, Page } from '@playwright/test'

/**
 * The logged-in header menu: "Principal" on desktop, the opened "Menu" panel below xl (the project
 * contexts inherit the mobile device in the mobile project). The panel closes on every navigation,
 * so call this right before each use.
 */
export async function headerMenu(page: Page): Promise<Locator> {
  const open = page.getByRole('button', { name: 'Abrir menu' })
  if (await open.isVisible()) await open.click()
  const desktop = page.getByRole('navigation', { name: 'Principal' })
  if (await desktop.isVisible()) return desktop
  return page.getByRole('navigation', { name: 'Menu' })
}

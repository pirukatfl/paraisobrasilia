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

/**
 * Desktop logged-in menu: Meus anúncios, Minha assinatura, Trocar senha and Sair live in the "Minha conta" dropdown.
 * Opens it when there is one (the mobile panel lists everything, so nothing to do there). Returns the same menu.
 */
export async function abrirMinhaConta(menu: Locator): Promise<Locator> {
  const trigger = menu.getByRole('button', { name: 'Minha conta' })
  if ((await trigger.count()) > 0 && (await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click()
  return menu
}

/** Clicks Sair wherever it is (inside "Minha conta" on desktop, at the end of the mobile panel). */
export async function clicarSair(page: Page): Promise<void> {
  const menu = await headerMenu(page)
  await abrirMinhaConta(menu)
  await menu.getByRole('button', { name: 'Sair' }).click()
}

const ITENS_DA_CONTA = ['Meus anúncios', 'Minha assinatura', 'Trocar senha']

/** Top-level link labels expected in the menu: on desktop the account entries are inside "Minha conta", not top-level. */
export async function rotulosNoTopo(menu: Locator, completo: string[]): Promise<string[]> {
  const desktop = (await menu.getByRole('button', { name: 'Minha conta' }).count()) > 0
  return desktop ? completo.filter((l) => !ITENS_DA_CONTA.includes(l)) : completo
}

/**
 * Site navigation registry (header menu, mobile menu, footer).
 * Fixed order (UI-SPEC Phase 2, updated by 05-03; Recados removed 2026-10-20, quick recados-privados): Festas · Quem somos ·
 * Espaço · Galeria (was "Profissionais e amadoras"; submenus Profissionais / Amadoras, 2026-11-01) · ClassiSex · Contos (05-03) · Dicas Hot (quick dicas-hot-menu) · Contato · Assine Já · Área do assinante. Pinned by tests/e2e/modelos.spec.ts.
 * Slices add their entries here: 02-02 Quem somos (+ Normas/Regras/Dicas), 02-03 Espaço,
 * 02-04 Modelos (always listed since quick menu-modelos; the page shows an empty state until a model is published), 03-01 Área do assinante, 03-02 Assine Já,
 * 04-07 ClassiSex (public preview).
 * Logged-in subscribers get getMemberNavItems() instead (quick menu-logado, 2026-10-24): Festas · Quem somos · Espaço ·
 * Galeria · ClassiSex · Contos (no Recados: client request, the inbox stays at /area-do-assinante/mensagens) · Dicas Hot · Contato · Meus anúncios · Minha assinatura · Trocar senha · link externo for subscribers (Menu do site, last) (+ Sair
 * rendered by Nav/MobileMenu). The promotion is not a menu item: it is a home section above "Como chegar" (PromocaoHome). Items staff hide in "Menu do site" are filtered out by key (menu.ts). Header picks the list on the server; pinned by tests/e2e/menu-logado.spec.ts.
 */
// Header: with 10 items the inline menu needs >= 1280 px (xl); below that the mobile menu is used.
import { pathForKey } from '../pages/keys'
import type { Textos } from '../textos/areas'
import { textoParaRico, type TextoRico } from '../textos/rico'
import { filtrarItens, MENU_VAZIO, type MenuConfig } from './menu'

/**
 * `key`: stable name of the item (see MENU_ITENS in menu.ts), what staff hide in "Menu do site".
 * `exact`: active only on the exact path (e.g. /area-do-assinante).
 * `external`: opens another site in a new tab (only the subscribers' external link).
 */
export type NavItem = {
  key: string
  href: string
  label: TextoRico
  children?: NavItem[]
  exact?: boolean
  external?: boolean
}

/** Link to the previous (WordPress) site: always the last menu item, public and logged-in, new tab. Not hideable in "Menu do site". */
export const VERSAO_ANTERIOR_ITEM: NavItem = {
  key: 'versao-anterior',
  href: 'https://anterior.swingbrasilia.com.br/',
  label: textoParaRico('Acessar versão anterior'),
  external: true,
}

export function getNavItems(t: Textos<'geral'>, menu: MenuConfig = MENU_VAZIO): NavItem[] {
  const items: NavItem[] = [
    { key: 'festas', href: '/', label: t.menuFestas },
    {
      key: 'quem-somos',
      href: pathForKey('quem-somos'),
      label: t.menuQuemSomos,
      children: [
        { key: 'normas', href: pathForKey('normas'), label: t.menuNormas },
        { key: 'regras', href: pathForKey('regras'), label: t.menuRegras },
        { key: 'dicas', href: pathForKey('dicas'), label: t.menuDicas },
      ],
    },
    { key: 'espaco', href: '/espaco', label: t.menuEspaco },
    // quick menu-modelos: always listed (client request); /modelos shows an empty state until a model is published.
    // Novo planejamento 2026-11-01: renamed Galeria, with the Profissionais / Amadoras submenus (?tipo=).
    {
      key: 'galeria',
      href: '/modelos',
      label: t.menuGaleria,
      children: [
        { key: 'galeria-profissionais', href: '/modelos?tipo=profissionais', label: t.menuGaleriaProfissionais },
        { key: 'galeria-amadoras', href: '/modelos?tipo=amadoras', label: t.menuGaleriaAmadoras },
        { key: 'galeria-videos-amadores', href: '/videos-amadores', label: t.menuGaleriaVideosAmadores },
      ],
    },
    // PREV-01: open preview; the full board lives in the members area
    { key: 'classisex', href: '/classisex', label: t.menuClassisex },
    // PREV-03: open excerpts of the contos (05-03)
    { key: 'contos', href: '/contos', label: t.menuContos },
    // quick dicas-hot-menu: client asked for the open Dicas Hot section in the main menu (also stays in the footer)
    { key: 'dicas-hot', href: '/dicas-hot', label: t.menuDicasHot },
    { key: 'contato', href: '/contato', label: t.menuContato },
    // Phase 3: plans page (03-02) and members area
    { key: 'assine-ja', href: '/assine-ja', label: t.menuAssineJa },
    // members area (redirects to /entrar when logged out)
    { key: 'area-do-assinante', href: '/area-do-assinante', label: t.menuAreaAssinante },
  ]
  return filtrarItens(items, menu.ocultos)
}

/**
 * Menu for a logged-in subscriber: replaces the public list (quick menu-logado). Sair is added by the menu components.
 * The external link (Menu do site) exists only here, last before Sair: never in the public menu or the footer.
 */
export function getMemberNavItems(t: Textos<'geral'>, menu: MenuConfig = MENU_VAZIO): NavItem[] {
  const base = getNavItems(t) // unfiltered: the picks below are filtered once, with the rest
  const pick = (key: string) => base.find((item) => item.key === key)!
  const items: NavItem[] = [
    pick('festas'),
    pick('quem-somos'),
    pick('espaco'),
    pick('galeria'),
    { key: 'classisex', href: '/area-do-assinante/classisex', label: t.menuClassisex },
    { key: 'contos', href: '/area-do-assinante/contos', label: t.menuContos },
    { key: 'dicas-hot', href: '/area-do-assinante/dicas-hot', label: t.menuDicasHot },
    pick('contato'),
    { key: 'meus-anuncios', href: '/area-do-assinante/meus-anuncios', label: t.menuMeusAnuncios },
    { key: 'minha-assinatura', href: '/area-do-assinante', label: t.menuMinhaAssinatura, exact: true },
    { key: 'trocar-senha', href: '/area-do-assinante/senha', label: t.menuTrocarSenha },
  ]
  if (menu.linkExterno) {
    items.push({
      key: 'link-externo',
      href: menu.linkExterno.url,
      label: textoParaRico(menu.linkExterno.rotulo),
      external: true,
    })
  }
  return filtrarItens(items, menu.ocultos)
}

/** Active state: exact match, a child path, or party pages under "Festas". */
export function isActivePath(href: string, pathname: string, exact = false): boolean {
  if (exact) return pathname === href
  if (href === '/') return pathname === '/' || pathname.startsWith('/festas/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

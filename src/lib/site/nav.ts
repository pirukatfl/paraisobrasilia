/**
 * Site navigation registry (header menu, mobile menu, footer).
 * Fixed order (UI-SPEC Phase 2): Festas · Quem somos · Espaço · Modelos · Contato.
 * Slices add their entries here: 02-02 Quem somos (+ Normas/Regras/Dicas), 02-03 Espaço,
 * 02-04 Modelos (only when at least one model is published).
 */
import { pathForKey } from '../pages/keys'

export type NavItem = { href: string; label: string; children?: NavItem[] }

export function getNavItems(_opts: { hasModels: boolean } = { hasModels: false }): NavItem[] {
  return [
    { href: '/', label: 'Festas' },
    {
      href: pathForKey('quem-somos'),
      label: 'Quem somos',
      children: [
        { href: pathForKey('normas'), label: 'Normas' },
        { href: pathForKey('regras'), label: 'Regras' },
        { href: pathForKey('dicas'), label: 'Dicas' },
      ],
    },
    { href: '/espaco', label: 'Espaço' },
    { href: '/contato', label: 'Contato' },
  ]
}

/** Active state: exact match, a child path, or party pages under "Festas". */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/festas/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

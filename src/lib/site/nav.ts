/**
 * Site navigation registry (header menu, mobile menu, footer).
 * Fixed order (UI-SPEC Phase 2, updated by 05-03; Recados removed 2026-10-20, quick recados-privados): Festas · Quem somos ·
 * Espaço · Modelos · ClassiSex · Contos (05-03) · Contato · Assine Já · Área do assinante. Pinned by tests/e2e/modelos.spec.ts.
 * Slices add their entries here: 02-02 Quem somos (+ Normas/Regras/Dicas), 02-03 Espaço,
 * 02-04 Modelos (only when at least one model is published), 03-01 Área do assinante, 03-02 Assine Já,
 * 04-07 ClassiSex (public preview).
 */
import { pathForKey } from '../pages/keys'

export type NavItem = { href: string; label: string; children?: NavItem[] }

export function getNavItems({ hasModels }: { hasModels: boolean } = { hasModels: false }): NavItem[] {
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
    // D-08: secondary section, listed only while at least one model is published
    ...(hasModels ? [{ href: '/modelos', label: 'Modelos' }] : []),
    // PREV-01: open preview; the full board lives in the members area
    { href: '/classisex', label: 'ClassiSex' },
    // PREV-03: open excerpts of the contos (05-03)
    { href: '/contos', label: 'Contos' },
    { href: '/contato', label: 'Contato' },
    // Phase 3: plans page (03-02) and members area
    { href: '/assine-ja', label: 'Assine Já' },
    // members area (redirects to /entrar when logged out)
    { href: '/area-do-assinante', label: 'Área do assinante' },
  ]
}

/** Active state: exact match, a child path, or party pages under "Festas". */
export function isActivePath(href: string, pathname: string): boolean {
  if (href === '/') return pathname === '/' || pathname.startsWith('/festas/')
  return pathname === href || pathname.startsWith(`${href}/`)
}

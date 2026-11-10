/**
 * Menu do site (novo planejamento 2026-11-01, item D): which menu items staff hid in the panel and the
 * external link shown only to logged-in subscribers. Pure module (no Payload, no Next): the panel's
 * option list, the DTO and the filter live here so they can be tested without a database.
 */
import type { NavItem } from './nav'

/** Every item (and sub-item) of the header menu, the mobile menu and the footer, by stable key. */
export const MENU_ITENS = [
  { value: 'festas', label: 'Festas (início)' },
  { value: 'quem-somos', label: 'Quem somos (esconde também Normas, Regras e Dicas)' },
  { value: 'normas', label: 'Quem somos → Normas' },
  { value: 'regras', label: 'Quem somos → Regras' },
  { value: 'dicas', label: 'Quem somos → Dicas' },
  { value: 'espaco', label: 'Espaço' },
  { value: 'galeria', label: 'Galeria (esconde também Profissionais, Amadoras e Vídeos amadores)' },
  { value: 'galeria-profissionais', label: 'Galeria → Profissionais' },
  { value: 'galeria-amadoras', label: 'Galeria → Amadoras' },
  { value: 'galeria-videos-amadores', label: 'Galeria → Vídeos amadores' },
  { value: 'classisex', label: 'ClassiSex' },
  { value: 'contos', label: 'Contos' },
  { value: 'dicas-hot', label: 'Dicas Hot' },
  { value: 'contato', label: 'Contato' },
  { value: 'promocao', label: 'Promoção (seção da página inicial, só aparece com a promoção no ar)' },
  { value: 'assine-ja', label: 'Assine Já (só visitantes)' },
  { value: 'area-do-assinante', label: 'Área do assinante (só visitantes)' },
  { value: 'meus-anuncios', label: 'Menu do assinante → Meus anúncios' },
  { value: 'minha-assinatura', label: 'Menu do assinante → Minha assinatura' },
  { value: 'trocar-senha', label: 'Menu do assinante → Trocar senha' },
  { value: 'link-externo', label: 'Menu do assinante → Link externo' },
] as const

export type MenuKey = (typeof MENU_ITENS)[number]['value']

const KEYS = new Set<string>(MENU_ITENS.map((i) => i.value))

/** Sub-items go away with their parent. */
const PARENT: Partial<Record<MenuKey, MenuKey>> = {
  normas: 'quem-somos',
  regras: 'quem-somos',
  dicas: 'quem-somos',
  'galeria-profissionais': 'galeria',
  'galeria-amadoras': 'galeria',
  'galeria-videos-amadores': 'galeria',
}

export const LINK_EXTERNO_PADRAO = {
  ativo: true,
  rotulo: 'Vídeos pornô grátis',
  url: 'https://www.redtube.com.br/',
} as const

export type LinkExterno = { rotulo: string; url: string }

export type MenuConfig = {
  /** Keys hidden by staff (an array: the config goes through the Next data cache as JSON). */
  ocultos: readonly string[]
  /** Set only when active and the address is a valid http(s) URL; shown to logged-in subscribers only. */
  linkExterno: LinkExterno | null
}

/** Nothing hidden and no external link: also the answer when the database is unreachable. */
export const MENU_VAZIO: MenuConfig = { ocultos: [], linkExterno: null }

/** http(s) addresses only, so a typo or `javascript:` can never become a menu link. */
export function urlExternaSegura(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const url = valor.trim()
  if (!url) return null
  try {
    const u = new URL(url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

/**
 * Global document → config. A global never saved has no values yet: the original external link
 * (active) applies, as staff asked; once saved, whatever the panel holds wins.
 */
export function toMenuConfig(doc: {
  itensOcultos?: unknown
  linkExterno?: { ativo?: boolean | null; rotulo?: string | null; url?: string | null } | null
} | null | undefined): MenuConfig {
  const ocultos = (Array.isArray(doc?.itensOcultos) ? doc.itensOcultos : []).filter(
    (k): k is string => typeof k === 'string' && KEYS.has(k),
  )
  const le = doc?.linkExterno
  const ativo = le?.ativo ?? LINK_EXTERNO_PADRAO.ativo
  const rotulo = le?.rotulo?.trim() || LINK_EXTERNO_PADRAO.rotulo
  const url = urlExternaSegura(le?.url?.trim() ? le.url : LINK_EXTERNO_PADRAO.url)
  return { ocultos, linkExterno: ativo && url ? { rotulo, url } : null }
}

/** Hidden by its own key or by its parent's. */
export function estaOculto(key: string, ocultos: readonly string[]): boolean {
  if (ocultos.includes(key)) return true
  const parent = PARENT[key as MenuKey]
  return parent ? ocultos.includes(parent) : false
}

/** Drops hidden items; a hidden parent takes its children along. */
export function filtrarItens(items: NavItem[], ocultos: readonly string[]): NavItem[] {
  return items
    .filter((item) => !estaOculto(item.key, ocultos))
    .map((item) => (item.children ? { ...item, children: filtrarItens(item.children, ocultos) } : item))
}

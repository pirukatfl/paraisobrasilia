/**
 * Fixed institutional page keys (INST-01, INST-06): staff edit these six pages but cannot
 * invent routes. Single source for routes, navigation, sitemap and revalidation.
 */
export const PAGE_KEYS = ['quem-somos', 'normas', 'regras', 'dicas', 'termos', 'privacidade'] as const
export type PageKey = (typeof PAGE_KEYS)[number]

export const PAGE_KEY_LABELS: Record<PageKey, string> = {
  'quem-somos': 'Quem somos',
  normas: 'Normas',
  regras: 'Regras',
  dicas: 'Dicas',
  termos: 'Termos de Uso',
  privacidade: 'Política de Privacidade',
}

export function isPageKey(value: unknown): value is PageKey {
  return typeof value === 'string' && (PAGE_KEYS as readonly string[]).includes(value)
}

export function pathForKey(key: PageKey): string {
  switch (key) {
    case 'quem-somos':
      return '/quem-somos'
    case 'normas':
    case 'regras':
    case 'dicas':
      return `/quem-somos/${key}`
    case 'termos':
      return '/termos-de-uso'
    case 'privacidade':
      return '/politica-de-privacidade'
  }
}

export type SectionKey = 'normas' | 'regras' | 'dicas'

/** /quem-somos/{secao} → page key, or null for anything else (→ 404). */
export function keyForSection(secao: string): SectionKey | null {
  return secao === 'normas' || secao === 'regras' || secao === 'dicas' ? secao : null
}

export const SECTION_TABS: { key: 'quem-somos' | SectionKey; label: string }[] = [
  { key: 'quem-somos', label: 'Quem somos' },
  { key: 'normas', label: 'Normas' },
  { key: 'regras', label: 'Regras' },
  { key: 'dicas', label: 'Dicas' },
]

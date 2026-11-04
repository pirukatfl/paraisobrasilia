import type { Page } from '@playwright/test'

export type PageWeight = { total: number; scripts: number; byType: Record<string, number>; count: number }

/**
 * Bytes transferred by the page before any interaction (navigation + resource timing entries).
 * The local e2e server is `next dev`, whose JavaScript is unminified and carries dev tooling,
 * so scripts are reported separately (`scripts`) and left out of `total`; production JS weight
 * is checked against `next build && next start` (see 02-05 summary).
 * Cross-origin entries (e.g. the OpenStreetMap iframe) report 0 bytes and can be excluded by host.
 */
export async function measureWeight(page: Page, opts: { excludeHosts?: string[] } = {}): Promise<PageWeight> {
  await page.waitForLoadState('load')
  await page.waitForLoadState('networkidle')
  return page.evaluate((excludeHosts: string[]) => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    const byType: Record<string, number> = { document: nav?.transferSize ?? 0 }
    let scripts = 0
    let count = 0
    for (const e of performance.getEntriesByType('resource') as PerformanceResourceTiming[]) {
      const url = new URL(e.name)
      if (excludeHosts.includes(url.host)) continue
      const isScript = e.initiatorType === 'script' || /\.m?js(\?|$)/.test(url.pathname) || url.pathname.startsWith('/_next/webpack-hmr')
      if (isScript) {
        scripts += e.transferSize
        continue
      }
      byType[e.initiatorType] = (byType[e.initiatorType] ?? 0) + e.transferSize
      count++
    }
    const total = Object.values(byType).reduce((a, b) => a + b, 0)
    return { total, scripts, byType, count }
  }, opts.excludeHosts ?? [])
}

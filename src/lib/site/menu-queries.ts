import 'server-only'

import config from '@payload-config'
import { getPayload } from 'payload'

import { cached } from '../cache/cached'
import { MENU_VAZIO, type MenuConfig, toMenuConfig } from './menu'

async function fetchMenuConfig(): Promise<MenuConfig> {
  const payload = await getPayload({ config })
  const doc = await payload.findGlobal({ slug: 'menu-do-site', depth: 0 })
  return toMenuConfig(doc)
}

const cachedMenuConfig = cached(fetchMenuConfig, ['site:menu'], () => ['menu'])

/**
 * Menu do site (hidden items + external link for subscribers), cached with tag 'menu'. Never throws:
 * without a database (build-time prerender) nothing is hidden and there is no external link.
 */
export async function getMenuConfig(): Promise<MenuConfig> {
  try {
    return await cachedMenuConfig()
  } catch (err) {
    console.error('[menu] unavailable, nothing hidden and no external link:', err instanceof Error ? err.message : err)
    return MENU_VAZIO
  }
}

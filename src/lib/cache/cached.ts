import { unstable_cache } from 'next/cache'

const CACHE_SECONDS = 600 // time-based window: ended parties drop off by themselves (FEST-04)

/**
 * Next data cache (unstable_cache: stable in Next 16.4 without enabling cacheComponents),
 * tagged so Payload hooks can expire entries on publish/edit/unpublish.
 * Outside a Next server (vitest, scripts) there is no incremental cache: call through.
 */
export function cached<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
  keyParts: string[],
  tags: (...args: A) => string[],
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await unstable_cache(fn, keyParts, { tags: tags(...args), revalidate: CACHE_SECONDS })(...args)
    } catch (err) {
      if (err instanceof Error && err.message.includes('incrementalCache missing')) return fn(...args)
      throw err
    }
  }
}

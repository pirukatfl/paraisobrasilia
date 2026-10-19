// '.js' suffix: this module is also loaded by plain Node ESM (Payload CLI, test seeding)
import { revalidateTag } from 'next/cache.js'

/**
 * Cache tags: 'parties' — home list, sitemap, static params; 'party:{slug}' — one party page;
 * 'contact' — contact global (02-01); 'pages' + 'page:{key}' (02-02); 'space' (02-03); 'models' (02-04);
 * 'plans' — Assine Já plans (03-02); 'ads' — ClassiSex public preview (04-07), expired by ads,
 * Eu sou options, ad media and subscription changes.
 * `{ expire: 0 }` expires immediately, so the next visitor gets fresh HTML instead of a
 * stale-while-revalidate copy.
 */
export function expire(tags: string[]): void {
  for (const tag of tags) {
    try {
      revalidateTag(tag, { expire: 0 })
    } catch {
      // Outside a Next request (seed scripts, migrations, tests): nothing is cached there.
    }
  }
}

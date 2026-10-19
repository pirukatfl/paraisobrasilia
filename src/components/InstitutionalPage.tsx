import Link from 'next/link'

import { RichText } from '@/components/RichText'
import { SubNav } from '@/components/SubNav'
import { pathForKey, SECTION_TABS } from '@/lib/pages/keys'
import type { PageDTO } from '@/lib/pages/queries'

type SectionTabKey = (typeof SECTION_TABS)[number]['key']

/** Quem somos and its sub-pages (UI-SPEC S6): tabs, H1 + intro, text, link to the next sub-page. */
export function InstitutionalPage({ page, activeKey }: { page: PageDTO; activeKey: SectionTabKey }) {
  const index = SECTION_TABS.findIndex((t) => t.key === activeKey)
  const next = SECTION_TABS[index + 1]
  return (
    <article className="max-w-[680px]">
      <SubNav activeKey={activeKey} />
      <h1 className="type-display mt-8">{page.title}</h1>
      {page.intro && <p className="mt-4 text-body text-muted">{page.intro}</p>}
      {page.body && <RichText data={page.body} className="mt-8" />}
      <div className="mt-12">
        {next ? (
          <Link href={pathForKey(next.key)} className="btn-secondary">
            Próximo: {next.label} →
          </Link>
        ) : (
          <Link href="/" className="btn-primary">
            Ver próximas festas
          </Link>
        )}
      </div>
    </article>
  )
}

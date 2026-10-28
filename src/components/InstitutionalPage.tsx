import Link from 'next/link'

import { RichText } from '@/components/RichText'
import { SubNav } from '@/components/SubNav'
import { pathForKey, SECTION_TABS } from '@/lib/pages/keys'
import type { PageDTO } from '@/lib/pages/queries'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'
import { TextoRico } from '@/components/TextoRico'

type SectionTabKey = (typeof SECTION_TABS)[number]['key']

/** Quem somos and its sub-pages (UI-SPEC S6): tabs, H1 + intro, text, link to the next sub-page. */
export async function InstitutionalPage({ page, activeKey }: { page: PageDTO; activeKey: SectionTabKey }) {
  const t = await getTextos('institucional')
  const labels = { 'quem-somos': t.abaQuemSomos, normas: t.abaNormas, regras: t.abaRegras, dicas: t.abaDicas }
  const index = SECTION_TABS.findIndex((t) => t.key === activeKey)
  const next = SECTION_TABS[index + 1]
  return (
    <article className="max-w-[680px]">
      <SubNav activeKey={activeKey} />
      <h1 className="type-display mt-8">{page.title}</h1>
      {page.intro && <p className="mt-4 text-[1.125rem] leading-normal text-muted">{page.intro}</p>}
      {/* RichText renders bare nodes (no wrapper), so the 18px size goes on this div and the text inherits it. */}
      {page.body && (
        <div className="rich-text-lg mt-8">
          <RichText data={page.body} />
        </div>
      )}
      <div className="mt-12">
        {next ? (
          <Link href={pathForKey(next.key)} className="btn-secondary">
            <TextoRico valor={t.botaoProximo} vars={{ aba: textoPuro(labels[next.key]) }} linha />
          </Link>
        ) : (
          <Link href="/" className="btn-primary">
            <TextoRico valor={t.botaoFestas} linha />
          </Link>
        )}
      </div>
    </article>
  )
}

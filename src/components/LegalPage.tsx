import { RichText } from '@/components/RichText'
import { formatUpdatedDate } from '@/lib/format/date'
import type { PageDTO } from '@/lib/pages/queries'

/** Termos de Uso / Política de Privacidade (UI-SPEC S7): H1, "Atualizado em", text. */
export function LegalPage({ page }: { page: PageDTO }) {
  return (
    <article className="max-w-[680px]">
      <h1 className="type-display">{page.title}</h1>
      <p className="type-label mt-4 text-muted">
        Atualizado em <time dateTime={page.updatedAt}>{formatUpdatedDate(page.updatedAt)}</time>
      </p>
      {page.intro && <p className="mt-4 text-body text-muted">{page.intro}</p>}
      {page.body && <RichText data={page.body} className="mt-8" />}
    </article>
  )
}

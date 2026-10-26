import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'

/**
 * Shared "Assine Já" call for every open preview (PREV-04): contos and ClassiSex.
 * The primary link text is exactly "Assine Já" and goes to /assine-ja.
 */
export async function AssineJaCta({
  title,
  text,
  membersHref,
  membersLabel,
}: {
  title: string
  text: string
  membersHref: string
  membersLabel?: string
}) {
  const t = await getTextos('assine')
  return (
    <aside aria-label={title} className="mt-8 max-w-[680px] rounded-xl border border-line bg-surface p-6">
      <h2 className="type-heading">{title}</h2>
      <p className="mt-3 text-body text-muted">{text}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/assine-ja" className="btn-primary">
          {t.ctaBotao}
        </Link>
        <Link href={membersHref} className="type-label font-semibold text-accent underline underline-offset-4">
          {membersLabel ?? t.ctaJaSouAssinante}
        </Link>
      </div>
    </aside>
  )
}

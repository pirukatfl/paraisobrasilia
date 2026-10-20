import Link from 'next/link'

/**
 * Shared "Assine Já" call for every open preview (PREV-04): contos and ClassiSex.
 * The primary link text is exactly "Assine Já" and goes to /assine-ja.
 */
export function AssineJaCta({
  title,
  text,
  membersHref,
  membersLabel = 'Já sou assinante',
}: {
  title: string
  text: string
  membersHref: string
  membersLabel?: string
}) {
  return (
    <aside aria-label={title} className="mt-8 max-w-[680px] rounded-xl border border-line bg-surface p-6">
      <h2 className="type-heading">{title}</h2>
      <p className="mt-3 text-body text-muted">{text}</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/assine-ja" className="btn-primary">
          Assine Já
        </Link>
        <Link href={membersHref} className="type-label font-semibold text-accent underline underline-offset-4">
          {membersLabel}
        </Link>
      </div>
    </aside>
  )
}

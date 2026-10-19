import Link from 'next/link'

/** Shown on every members page while the subscriber still uses a staff-set password (D-04). */
export function PasswordBanner({ mustChangePassword }: { mustChangePassword?: boolean | null }) {
  if (!mustChangePassword) return null
  return (
    <p role="note" className="mb-8 rounded-lg border border-accent px-4 py-2 text-body">
      Você está usando uma senha provisória.{' '}
      <Link href="/area-do-assinante/senha" className="font-semibold text-accent underline underline-offset-4">
        Troque agora.
      </Link>
    </p>
  )
}

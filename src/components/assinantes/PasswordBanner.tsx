import Link from 'next/link'

import { getTextos } from '@/lib/textos/queries'
import { TextoRico } from '@/components/TextoRico'

/** Shown on every members page while the subscriber still uses a staff-set password (D-04). */
export async function PasswordBanner({ mustChangePassword }: { mustChangePassword?: boolean | null }) {
  if (!mustChangePassword) return null
  const t = await getTextos('areaAssinante')
  return (
    <p role="note" className="mb-8 rounded-lg border border-accent px-4 py-2 text-body">
      <TextoRico valor={t.provisoriaTexto} linha />{' '}
      <Link href="/area-do-assinante/senha" className="font-semibold text-accent underline underline-offset-4">
        <TextoRico valor={t.provisoriaLink} linha />
      </Link>
    </p>
  )
}

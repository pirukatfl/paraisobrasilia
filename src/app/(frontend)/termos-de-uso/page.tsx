import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPage } from '@/components/LegalPage'
import { pathForKey } from '@/lib/pages/keys'
import { getPageByKey } from '@/lib/pages/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache ('page:termos').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageByKey('termos')
  if (!page) return { title: 'Página não encontrada' }
  return buildPageMetadata({ title: page.title, description: page.intro, path: pathForKey('termos') })
}

export default async function TermsPage() {
  const page = await getPageByKey('termos')
  if (!page) notFound()
  return <LegalPage page={page} />
}

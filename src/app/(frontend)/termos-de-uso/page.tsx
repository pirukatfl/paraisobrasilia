import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPage } from '@/components/LegalPage'
import { getPageByKey } from '@/lib/pages/queries'

// Per request (no database at build); data from the tagged cache ('page:termos').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageByKey('termos')
  if (!page) return { title: 'Página não encontrada' }
  return { title: page.title, description: page.intro ?? undefined }
}

export default async function TermsPage() {
  const page = await getPageByKey('termos')
  if (!page) notFound()
  return <LegalPage page={page} />
}

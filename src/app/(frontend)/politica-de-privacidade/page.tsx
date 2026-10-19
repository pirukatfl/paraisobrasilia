import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { LegalPage } from '@/components/LegalPage'
import { getPageByKey } from '@/lib/pages/queries'

// Per request (no database at build); data from the tagged cache ('page:privacidade').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageByKey('privacidade')
  if (!page) return { title: 'Página não encontrada' }
  return { title: page.title, description: page.intro ?? undefined }
}

export default async function PrivacyPage() {
  const page = await getPageByKey('privacidade')
  if (!page) notFound()
  return <LegalPage page={page} />
}

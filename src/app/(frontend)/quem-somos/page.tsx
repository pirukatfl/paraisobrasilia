import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InstitutionalPage } from '@/components/InstitutionalPage'
import { pathForKey } from '@/lib/pages/keys'
import { getPageByKey } from '@/lib/pages/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache ('page:quem-somos').
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageByKey('quem-somos')
  if (!page) return { title: 'Página não encontrada' }
  return buildPageMetadata({ title: page.title, description: page.intro, path: pathForKey('quem-somos') })
}

export default async function QuemSomosPage() {
  const page = await getPageByKey('quem-somos')
  if (!page) notFound()
  return <InstitutionalPage page={page} activeKey="quem-somos" />
}

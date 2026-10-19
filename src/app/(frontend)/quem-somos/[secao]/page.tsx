import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { InstitutionalPage } from '@/components/InstitutionalPage'
import { keyForSection, pathForKey } from '@/lib/pages/keys'
import { getPageByKey } from '@/lib/pages/queries'
import { buildPageMetadata } from '@/lib/seo/metadata'

// Per request (no database at build); data from the tagged cache ('page:{key}').
export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ secao: string }>
}

async function load(secao: string) {
  const key = keyForSection(secao)
  if (!key) return null
  const page = await getPageByKey(key)
  return page ? { key, page } : null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const found = await load((await params).secao)
  if (!found) return { title: 'Página não encontrada' }
  return buildPageMetadata({ title: found.page.title, description: found.page.intro, path: pathForKey(found.key) })
}

export default async function QuemSomosSectionPage({ params }: Props) {
  const found = await load((await params).secao)
  if (!found) notFound()
  return <InstitutionalPage page={found.page} activeKey={found.key} />
}

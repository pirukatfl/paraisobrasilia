import type { PublicDicaDTO } from '@/lib/dicas/dto'

const ORG = { '@type': 'Organization', name: 'Paraíso Brasília' } as const

/** JSON-LD `Article` for a dica. '<' is escaped so a title can never close the script tag (T-DH-05). */
export function DicaJsonLd({ dica }: { dica: PublicDicaDTO }) {
  const base = (process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: dica.title,
    ...(dica.publishedAt ? { datePublished: dica.publishedAt } : {}),
    ...(dica.updatedAt || dica.publishedAt ? { dateModified: dica.updatedAt ?? dica.publishedAt } : {}),
    mainEntityOfPage: `${base}/dicas-hot/${dica.slug}`,
    ...(dica.ogImage ? { image: [dica.ogImage.url] } : {}),
    author: ORG,
    publisher: ORG,
    inLanguage: 'pt-BR',
  }
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}

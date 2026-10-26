import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { PasswordBanner } from '@/components/assinantes/PasswordBanner'
import { EnviarRecadoLink } from '@/components/mensagens/EnviarRecadoLink'
import { ContactLinks } from '@/components/classisex/ContactLinks'
import { InactivePanel } from '@/components/classisex/InactivePanel'
import { MediaGallery } from '@/components/classisex/MediaGallery'
import { ReportForm } from '@/components/classisex/ReportForm'
import { requireActiveSubscription } from '@/lib/assinantes/session'
import { getMemberAd, isOwnAd } from '@/lib/classisex/queries'
import { preencher } from '@/lib/textos/mesclar'
import { getTextos } from '@/lib/textos/queries'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('classisex')
  return { title: t.anuncioGoogleTitulo, robots: { index: false, follow: false } }
}

/** Full ad with contacts (CLAS-02, D-05). Hidden ads (pending, refused, unpublished) are a plain 404; ads of free authors show only the cover (G-05). */
export default async function AnuncioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTextos('classisex')
  const check = await requireActiveSubscription(`/area-do-assinante/classisex/${encodeURIComponent(id)}`)
  if (check.inactive) {
    return (
      <section aria-labelledby="titulo-anuncio">
        <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
        <p className="type-eyebrow text-muted">{t.membrosTopo}</p>
        <h1 id="titulo-anuncio" className="type-display mt-2">
          {t.membrosTitulo}
        </h1>
        <InactivePanel access={check.access} />
      </section>
    )
  }
  const ad = await getMemberAd(id)
  if (!ad) notFound()
  // Only a boolean reaches the client component, never the author (T-04-12)
  const canReport = !(await isOwnAd(check.assinante.id, id))
  return (
    <article aria-labelledby="titulo-anuncio" className="max-w-[720px]">
      <PasswordBanner mustChangePassword={check.assinante.mustChangePassword} />
      <p className="type-eyebrow text-muted">{t.anuncioTopo}</p>
      <h1 id="titulo-anuncio" className="type-display mt-2">
        {ad.apelido} · {ad.euSou}
        {ad.cidade ? ` · ${ad.cidade}` : ''}
      </h1>
      <p className="type-label mt-2 text-muted">{preencher(t.anuncioPublicadoEm, { data: ad.publishedLabel })}</p>
      <MediaGallery
        fotos={ad.fotos}
        videos={ad.videos}
        textos={{ galeriaVideoVarios: t.galeriaVideoVarios, galeriaVideoUm: t.galeriaVideoUm }}
      />
      <p className="mt-6 whitespace-pre-line text-body">{ad.texto}</p>
      <section aria-labelledby="titulo-contato" className="mt-8">
        <h2 id="titulo-contato" className="type-heading mb-4">
          {t.anuncioContato}
        </h2>
        <ContactLinks contato={ad.contato} />
        {canReport &&
          (ad.autorGratuito ? (
            <p className="type-label mt-4 text-muted">{t.anuncioRecadoGratuito}</p>
          ) : (
            <EnviarRecadoLink id={ad.id} />
          ))}
      </section>
      {canReport && (
        <ReportForm
          adId={ad.id}
          textos={{
            denunciarResumo: t.denunciarResumo,
            denunciarMotivo: t.denunciarMotivo,
            denunciarDetalhes: t.denunciarDetalhes,
            denunciarBotao: t.denunciarBotao,
            motivoContatoFalso: t.motivoContatoFalso,
            motivoGolpe: t.motivoGolpe,
            motivoOfensivo: t.motivoOfensivo,
            motivoMenor: t.motivoMenor,
            motivoSemAutorizacao: t.motivoSemAutorizacao,
            motivoOutro: t.motivoOutro,
          }}
        />
      )}
      <p className="mt-10">
        <Link href="/area-do-assinante/classisex" className="type-label text-muted underline underline-offset-4 hover:text-accent">
          {t.anuncioVoltar}
        </Link>
      </p>
    </article>
  )
}

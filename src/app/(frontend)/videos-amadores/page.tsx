import type { Metadata } from 'next'

import { EmptyState } from '@/components/EmptyState'
import { TextoRico } from '@/components/TextoRico'
import { VideosAmadoresGrid } from '@/components/midia/VideosAmadoresGrid'
import { espectadorDeVideos } from '@/lib/midia-enviada/espectador'
import { getVideosAmadores } from '@/lib/midia-enviada/publico'
import { buildPageMetadata } from '@/lib/seo/metadata'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'

// Per request: the list comes from the tagged cache ('amadores'), the viewer's right is read every time.
export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTextos('modelos')
  return buildPageMetadata({
    title: textoPuro(t.videosTitulo),
    description: textoPuro(t.videosIntro),
    path: '/videos-amadores',
  })
}

/**
 * Videos sent by the public and approved by staff (client decision 2026-11-10). Everybody sees the list; only
 * active subscribers get the player (staff sessions do not). The file itself is refused by /videos-amadores/{id}/video.
 */
export default async function VideosAmadoresPage() {
  const [t, videos, espectador] = await Promise.all([getTextos('modelos'), getVideosAmadores(), espectadorDeVideos()])
  return (
    <section aria-labelledby="titulo-videos-amadores">
      <h1 id="titulo-videos-amadores" className="type-display">
        <TextoRico valor={t.videosTitulo} linha />
      </h1>
      <p className="mt-4 max-w-[680px] text-body text-muted">
        <TextoRico valor={t.videosIntro} linha />
      </p>
      {videos.length === 0 ? (
        <EmptyState
          heading={<TextoRico valor={t.videosVazioTitulo} linha />}
          body={t.videosVazioTexto}
          actions={[{ href: '/enviar-fotos-e-videos', label: <TextoRico valor={t.videosVazioBotao} linha />, variant: 'primary' }]}
        />
      ) : (
        <VideosAmadoresGrid
          videos={videos}
          podeAssistir={espectador.podeAssistir}
          logado={espectador.logado}
          convite={{
            titulo: t.videosConviteTitulo,
            texto: t.videosConviteTexto,
            textoLogado: t.videosConviteTextoLogado,
            assine: t.videosConviteAssine,
            entrar: t.videosConviteEntrar,
          }}
        />
      )}
    </section>
  )
}

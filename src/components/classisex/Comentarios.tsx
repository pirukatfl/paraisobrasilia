import Link from 'next/link'

import { ApagarComentario } from '@/components/classisex/ApagarComentario'
import { ComentarioForm } from '@/components/classisex/ComentarioForm'
import { ResponderComentario } from '@/components/classisex/ResponderComentario'
import { TextoRico } from '@/components/TextoRico'
import type { ComentarioDTO, ComentariosViewer } from '@/lib/classisex/comentarios/dto'
import { QUEM_COMENTA } from '@/lib/classisex/comentarios/rules'
import type { Textos } from '@/lib/textos/areas'

/** Only what the client forms need (the whole area of texts must not travel to the browser per comment). */
const formTextosDe = (t: Textos<'classisex'>) => ({
  comentarioRotuloApelido: t.comentarioRotuloApelido,
  comentarioApelidoAjuda: t.comentarioApelidoAjuda,
  comentarioRotuloTexto: t.comentarioRotuloTexto,
  comentarioBotao: t.comentarioBotao,
  comentarioBotaoResponder: t.comentarioBotaoResponder,
  comentarioBotaoEnviando: t.comentarioBotaoEnviando,
  comentarioBotaoCancelar: t.comentarioBotaoCancelar,
  comentarioResponder: t.comentarioResponder,
  comentarioRotuloNome: t.comentarioRotuloNome,
  comentarioAvisoVisitante: t.comentarioAvisoVisitante,
  comentarioTemConta: t.comentarioTemConta,
  comentarioTemContaLink: t.comentarioTemContaLink,
})

const apagarTextosDe = (t: Textos<'classisex'>) => ({
  comentarioApagar: t.comentarioApagar,
  comentarioApagarPergunta: t.comentarioApagarPergunta,
  comentarioApagarConfirmar: t.comentarioApagarConfirmar,
})

function Selo({ t }: { t: Textos<'classisex'> }) {
  return (
    <span className="type-label rounded-full border border-gold/50 px-2 py-0.5 text-gold">
      <TextoRico valor={t.comentarioSeloAnunciante} linha />
    </span>
  )
}

function Visitante({ t }: { t: Textos<'classisex'> }) {
  return (
    <span className="type-label rounded-full border border-line px-2 py-0.5 font-normal text-muted">
      <TextoRico valor={t.comentarioMarcadorVisitante} linha />
    </span>
  )
}

function Comentario({
  c,
  adId,
  pode,
  apelido,
  visitante,
  textos: t,
  resposta = false,
}: {
  c: ComentarioDTO
  adId: number
  pode: boolean
  apelido: string
  visitante: boolean
  textos: Textos<'classisex'>
  resposta?: boolean
}) {
  return (
    <li id={`comentario-${c.id}`} className={resposta ? '' : 'py-5 first:pt-0'}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="type-label text-text">{c.apelido}</span>
        {c.doAnunciante && <Selo t={t} />}
        {c.semConta && <Visitante t={t} />}
        <time className="type-label font-normal text-muted">{c.quando}</time>
      </div>
      <p className="mt-1 whitespace-pre-line break-words text-body">{c.texto}</p>
      {(pode || c.meu) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-4">
          {pode && !resposta && <ResponderComentario adId={adId} comentarioId={c.id} apelidoInicial={apelido} textos={formTextosDe(t)} visitante={visitante} />}
          {c.meu && <ApagarComentario adId={adId} comentarioId={c.id} textos={apagarTextosDe(t)} />}
        </div>
      )}
      {c.respostas.length > 0 && (
        <ul className="mt-3 flex flex-col gap-4 border-l border-line pl-4 sm:pl-6">
          {c.respostas.map((r) => (
            <Comentario key={r.id} c={r} adId={adId} pode={pode} apelido={apelido} visitante={visitante} textos={t} resposta />
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * The conversation of one ad (pedido do cliente 2026-11-03), used on the open page and on the full ad
 * of the members area. `comentarios` already comes redacted for anyone who is not an active
 * subscriber (the server decides, never this component). Everyone reads; who may write depends on
 * QUEM_COMENTA and on the account (blocked accounts only see the notice).
 */
export function Comentarios({
  adId,
  comentarios,
  viewer,
  verContatos,
  entrarHref,
  textos: t,
}: {
  adId: number
  comentarios: ComentarioDTO[]
  viewer: ComentariosViewer
  /** Active subscriber: contacts written in the comments are shown as written. */
  verContatos: boolean
  /** `/entrar?next=…` back to this ad. */
  entrarHref: string
  textos: Textos<'classisex'>
}) {
  const total = comentarios.reduce((n, c) => n + 1 + c.respostas.length, 0)
  const visitante = viewer.tipo === 'visitante'
  // Anyone may write with QUEM_COMENTA = 'todos'; the other values need an account (or a subscription)
  const podeComentar = visitante
    ? QUEM_COMENTA === 'todos'
    : !viewer.bloqueado && (QUEM_COMENTA !== 'assinante' || viewer.assinanteAtivo)
  const apelido = viewer.tipo === 'conta' ? viewer.apelido : ''
  return (
    <section id="comentarios" aria-labelledby="titulo-comentarios" className="mt-10 max-w-[720px] scroll-mt-20">
      <h2 id="titulo-comentarios" className="type-heading">
        <TextoRico valor={t.comentariosTitulo} linha />
        {total > 0 && (
          <span className="ml-2 text-muted" data-numeric>
            ({total})
          </span>
        )}
      </h2>

      {comentarios.length === 0 ? (
        <TextoRico valor={t.comentariosVazio} className="mt-4 text-body text-muted" />
      ) : (
        <ul className="mt-5 flex flex-col divide-y divide-line">
          {comentarios.map((c) => (
            <Comentario key={c.id} c={c} adId={adId} pode={podeComentar} apelido={apelido} visitante={visitante} textos={t} />
          ))}
        </ul>
      )}

      {!verContatos && comentarios.length > 0 && (
        <p className="type-label mt-4 font-normal text-muted">
          <TextoRico valor={t.comentariosAvisoContato} linha />{' '}
          <Link href="/assine-ja" className="font-semibold text-accent underline underline-offset-4">
            <TextoRico valor={t.comentariosAssineLink} linha />
          </Link>
        </p>
      )}

      <div className="mt-8 border-t border-line pt-6">
        {visitante && !podeComentar ? (
          <p>
            <Link href={entrarHref} className="btn-primary">
              <TextoRico valor={t.comentarioTemContaLink} linha />
            </Link>
          </p>
        ) : viewer.tipo === 'conta' && viewer.bloqueado ? (
          <TextoRico valor={t.comentarioBloqueado} className="text-body text-muted" role="status" />
        ) : !podeComentar ? (
          <div className="flex flex-col gap-4">
            <TextoRico valor={t.comentarioSoAssinantes} className="text-body" />
            <div>
              <Link href="/assine-ja" className="btn-primary">
                <TextoRico valor={t.comentariosAssineLink} linha />
              </Link>
            </div>
          </div>
        ) : (
          <ComentarioForm adId={adId} apelidoInicial={apelido} textos={formTextosDe(t)} entrarHref={visitante ? entrarHref : undefined} />
        )}
      </div>
    </section>
  )
}

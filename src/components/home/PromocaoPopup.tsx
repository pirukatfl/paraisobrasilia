import Image from 'next/image'
import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import { ENVIO_PROMOCAO_HREF } from '@/lib/site/links'
import { promocaoNoAr } from '@/lib/site/promocao'
import { getPromocao } from '@/lib/site/promocao-queries'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'

import { PromocaoDialog } from './PromocaoDialog'

/**
 * The staff-edited promotion as a modal, rendered site-wide by the frontend layout; nothing when it is off or outside
 * its period. Opens by itself only on the home page (once per session); the "Promoção" menu item opens it anywhere.
 */
export async function PromocaoPopup() {
  const promocao = await getPromocao()
  if (!promocaoNoAr(promocao, new Date())) return null
  const t = await getTextos('inicio')
  return (
    <PromocaoDialog
      versao={promocao.versao}
      titulo={promocao.titulo}
      imagem={promocao.imagem}
      textoFechar={textoPuro(t.promocaoFechar)}
      participar={
        promocao.participarAtivo ? (
          <Link href={ENVIO_PROMOCAO_HREF} className="btn-primary flex-1 text-center">
            {promocao.botaoParticipar}
          </Link>
        ) : null
      }
      botaoFechar={<TextoRico valor={t.promocaoBotaoFechar} linha />}
    >
      {promocao.texto && (
        <TextoRico
          valor={promocao.texto}
          className="text-body"
        />
      )}
    </PromocaoDialog>
  )
}

/**
 * No-JavaScript fallback of the "Promoção" menu item: the home page, loaded as `/?promocao=abrir`, shows the promotion
 * as a plain block at the top. Inside <noscript>, so with JavaScript it is never rendered (the modal opens instead).
 */
export async function PromocaoSemJs() {
  const promocao = await getPromocao()
  if (!promocaoNoAr(promocao, new Date())) return null
  const { imagem } = promocao
  return (
    <noscript>
      <section
        data-promocao-sem-js
        aria-label={promocao.titulo ? undefined : promocao.botaoParticipar}
        aria-labelledby={promocao.titulo ? 'promocao-sem-js-titulo' : undefined}
        className="card-glow mx-auto mb-10 w-full max-w-[520px] rounded-xl border border-gold/20 bg-surface"
      >
        {imagem && (
          <Image
            src={imagem.url}
            alt={imagem.alt}
            width={imagem.width}
            height={imagem.height}
            sizes="520px"
            className="h-auto max-h-[40vh] w-full rounded-t-xl object-cover"
          />
        )}
        <div className="px-6 py-6 lg:px-8 lg:py-8">
          {promocao.titulo && (
            <h2 id="promocao-sem-js-titulo" className="type-heading">
              {promocao.titulo}
            </h2>
          )}
          {promocao.texto && <TextoRico valor={promocao.texto} className={promocao.titulo ? 'mt-4 text-body' : 'text-body'} />}
          {promocao.participarAtivo && (
            <Link href={ENVIO_PROMOCAO_HREF} className="btn-primary mt-6 block text-center">
              {promocao.botaoParticipar}
            </Link>
          )}
        </div>
      </section>
    </noscript>
  )
}

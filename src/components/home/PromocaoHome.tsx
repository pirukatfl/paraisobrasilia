import Image from 'next/image'
import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import { ENVIO_PROMOCAO_HREF } from '@/lib/site/links'
import { estaOculto } from '@/lib/site/menu'
import { promocaoNoAr } from '@/lib/site/promocao'
import { getPromocao } from '@/lib/site/promocao-queries'
import { getTextos } from '@/lib/textos/queries'

/**
 * Home section "Promoção", directly above "Como chegar": the staff-edited promotion (Configurações → Promoção).
 * Nothing while it is off, outside its period, or hidden in "Menu do site" (option "Promoção (seção da página inicial)").
 * Participar leads to the submission form with the promotion on top; without the button the section only informs.
 */
export async function PromocaoHome({ ocultos }: { ocultos: readonly string[] }) {
  if (estaOculto('promocao', ocultos)) return null
  const promocao = await getPromocao()
  if (!promocaoNoAr(promocao, new Date())) return null
  const t = await getTextos('geral')
  const { imagem } = promocao
  return (
    <section
      aria-labelledby="titulo-promocao-home"
      data-promocao-home
      className="reveal mt-12 overflow-hidden rounded-xl border border-line bg-surface lg:flex"
    >
      {imagem && (
        <Image
          src={imagem.url}
          alt={imagem.alt}
          width={imagem.width}
          height={imagem.height}
          sizes="(min-width: 1024px) 40vw, 100vw"
          className="h-auto max-h-[360px] w-full object-cover lg:max-h-none lg:w-2/5 lg:shrink-0"
        />
      )}
      <div className="flex flex-col p-4 lg:flex-1 lg:justify-center lg:p-6">
        <h2 id="titulo-promocao-home" className="type-heading">
          {promocao.titulo || <TextoRico valor={t.menuPromocao} linha />}
        </h2>
        {promocao.texto && <TextoRico valor={promocao.texto} className="mt-4 max-w-prose text-body" />}
        {promocao.participarAtivo && (
          <Link href={ENVIO_PROMOCAO_HREF} className="btn-primary mt-6 self-start">
            {promocao.botaoParticipar}
          </Link>
        )}
      </div>
    </section>
  )
}

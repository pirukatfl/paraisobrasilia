import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import { ENVIO_CONTOS_HREF, ENVIO_MIDIA_HREF, linkarEstado } from '@/lib/site/links'
import { promocaoNoAr } from '@/lib/site/promocao'
import { getPromocao } from '@/lib/site/promocao-queries'
import { getTextos } from '@/lib/textos/queries'
import { textoPuro } from '@/lib/textos/rico'

import { PromocaoDialog } from './PromocaoDialog'

/** The staff-edited promotion as a pop-up on the home page; nothing when it is off or outside its period. */
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
      botoes={
        <>
          <Link href={ENVIO_CONTOS_HREF} className="btn-primary flex-1 text-center">
            <TextoRico valor={t.promocaoBotaoContos} linha />
          </Link>
          <Link href={ENVIO_MIDIA_HREF} className="btn-secondary flex-1 text-center">
            <TextoRico valor={t.promocaoBotaoMidia} linha />
          </Link>
        </>
      }
    >
      {promocao.texto && (
        <TextoRico
          valor={linkarEstado(promocao.texto)}
          className="text-body [&_a]:font-bold [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2"
        />
      )}
    </PromocaoDialog>
  )
}

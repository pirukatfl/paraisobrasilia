import Link from 'next/link'

import { TextoRico } from '@/components/TextoRico'
import { ENVIO_PROMOCAO_HREF } from '@/lib/site/links'
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

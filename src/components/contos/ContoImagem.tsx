import Image from 'next/image'

import type { ContoImageDTO } from '@/lib/contos/dto'

/** Altura do quadro da foto do conto (px): o cliente pediu 460 px, sempre. */
export const CONTO_IMAGEM_ALTURA = 460
const COLUNA_PAGINA = 720
/** Coluna do card na lista: 2 colunas dentro de main (1200 px, 32 px de margem, 16 px de vão) = 560 px */
const COLUNA_CARD = 560

/**
 * Foto do conto, sempre em um quadro de 460 px de altura que ela preenche inteiro (object-fit: cover, centralizada ou
 * no ponto de foco da mídia, se houver). Sem barras e sem distorção; o excedente é cortado, como o cliente aceitou.
 * - página (card=false): quadro com a largura da coluna do texto.
 * - card da lista (card=true): quadro com a largura do card, acima do texto.
 * A fonte é a maior derivada (1600 px de largura) ou o original, então 460 px a 2x continua nítido.
 */
export function ContoImagem({ imagem, card = false }: { imagem: ContoImageDTO; card?: boolean }) {
  const { url, alt, focalX, focalY } = imagem
  return (
    <div
      data-testid="conto-imagem"
      className={
        card
          ? 'relative h-[460px] w-full overflow-hidden border-b border-line bg-surface'
          : 'relative mt-6 h-[460px] w-full overflow-hidden rounded-xl border border-line bg-surface'
      }
    >
      <Image
        src={url}
        alt={alt}
        fill
        sizes={card ? `(min-width: 1200px) ${COLUNA_CARD}px, (min-width: 768px) 50vw, 100vw` : `(min-width: 768px) ${COLUNA_PAGINA}px, 100vw`}
        quality={85}
        {...(card ? { loading: 'lazy' as const } : { priority: true })}
        className="object-cover"
        style={focalX !== undefined && focalY !== undefined ? { objectPosition: `${focalX}% ${focalY}%` } : undefined}
      />
    </div>
  )
}

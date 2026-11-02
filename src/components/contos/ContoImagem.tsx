import Image from 'next/image'

import type { ContoImageDTO } from '@/lib/contos/dto'

/** Alturas do quadro da foto do conto (px): o cliente pediu 460 px, sempre. */
export const CONTO_IMAGEM_ALTURA = 460
const COLUNA_PAGINA = 720
/** Coluna do card na lista (2 colunas, até ~480 px) */
const COLUNA_CARD = 480

/**
 * Foto do conto, em dois formatos de quadro com 460 px de altura:
 * - página (card=false): a foto preenche o quadro inteiro (largura total da coluna, object-fit: cover, centralizada ou no
 *   ponto de foco da mídia, se houver). Sem distorção; o excedente é cortado, como o cliente aceitou.
 * - card da lista (card=true): foto inteira (object-contain), sem corte.
 * A fonte é a maior derivada (1600 px de largura) ou o original, então 460 px a 2x continua nítido.
 */
export function ContoImagem({ imagem, card = false }: { imagem: ContoImageDTO; card?: boolean }) {
  const { url, width, height, alt, focalX, focalY } = imagem
  if (!card) {
    return (
      <div data-testid="conto-imagem" className="relative mt-6 h-[460px] w-full overflow-hidden rounded-xl border border-line bg-surface">
        <Image
          src={url}
          alt={alt}
          fill
          sizes={`(min-width: 768px) ${COLUNA_PAGINA}px, 100vw`}
          quality={85}
          priority
          className="object-cover"
          style={focalX !== undefined && focalY !== undefined ? { objectPosition: `${focalX}% ${focalY}%` } : undefined}
        />
      </div>
    )
  }
  const ratio = width > 0 && height > 0 ? width / height : 4 / 3
  // largura exibida: altura fixa x proporção, limitada pela coluna e pelo tamanho natural
  const exibida = Math.max(1, Math.round(Math.min(COLUNA_CARD, CONTO_IMAGEM_ALTURA * ratio, width || Infinity)))
  return (
    <div data-testid="conto-imagem" className="flex h-[460px] w-full items-center justify-center overflow-hidden border-b border-line bg-surface">
      <Image
        src={url}
        alt={alt}
        width={width || 1600}
        height={height || Math.round(1600 / ratio)}
        sizes={`(min-width: 768px) ${exibida}px, min(100vw, ${exibida}px)`}
        quality={85}
        loading="lazy"
        className="h-auto max-h-full w-auto max-w-full object-contain"
      />
    </div>
  )
}

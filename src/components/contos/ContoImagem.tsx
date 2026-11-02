import Image from 'next/image'

import type { ContoImageDTO } from '@/lib/contos/dto'

/** Alturas do quadro da foto do conto (px): o cliente pediu 460 px, sempre. */
export const CONTO_IMAGEM_ALTURA = 460
const COLUNA_PAGINA = 720
/** Coluna do card na lista (2 colunas, até ~480 px) */
const COLUNA_CARD = 480

/**
 * Foto do conto na página e no card da lista: quadro de 460 px de altura, foto inteira (sem corte e sem distorção, object-contain)
 * centralizada. A fonte é a maior derivada (1600 px de largura) ou o original, então 460 px a 2x continua nítido;
 * fotos pequenas não são ampliadas (o tamanho natural limita o quadro).
 */
export function ContoImagem({ imagem, card = false }: { imagem: ContoImageDTO; card?: boolean }) {
  const { url, width, height, alt } = imagem
  const ratio = width > 0 && height > 0 ? width / height : 4 / 3
  // largura exibida: altura fixa x proporção, limitada pela coluna e pelo tamanho natural
  const exibida = Math.max(1, Math.round(Math.min(card ? COLUNA_CARD : COLUNA_PAGINA, CONTO_IMAGEM_ALTURA * ratio, width || Infinity)))
  return (
    <div
      data-testid="conto-imagem"
      className={`flex h-[460px] w-full items-center justify-center overflow-hidden bg-surface ${card ? 'border-b border-line' : 'mt-6 rounded-xl border border-line'}`}
    >
      <Image
        src={url}
        alt={alt}
        width={width || 1600}
        height={height || Math.round(1600 / ratio)}
        sizes={`(min-width: 768px) ${exibida}px, min(100vw, ${exibida}px)`}
        quality={85}
        priority={!card}
        loading={card ? 'lazy' : undefined}
        className="h-auto max-h-full w-auto max-w-full object-contain"
      />
    </div>
  )
}

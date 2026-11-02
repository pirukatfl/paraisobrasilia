import Image from 'next/image'

import type { ContoImageDTO } from '@/lib/contos/dto'

/** Altura do quadro da foto do conto (px): o cliente pediu 460 px, sempre. */
export const CONTO_IMAGEM_ALTURA = 460
const COLUNA_PAGINA = 720

/**
 * Foto do conto, mostrada só dentro do conto, logo depois do texto (nunca na lista). Fica em um quadro de 460 px de
 * altura que ela preenche inteiro (object-fit: cover, centralizada ou no ponto de foco da mídia, se houver). Sem
 * barras e sem distorção; o excedente é cortado, como o cliente aceitou. O quadro tem a largura da coluna do texto.
 * Fica abaixo da dobra, então carrega sob demanda (lazy, sem priority).
 * A fonte é a maior derivada (1600 px de largura) ou o original, então 460 px a 2x continua nítido.
 */
export function ContoImagem({ imagem }: { imagem: ContoImageDTO }) {
  const { url, alt, focalX, focalY } = imagem
  return (
    <div data-testid="conto-imagem" className="relative mt-10 h-[460px] w-full overflow-hidden rounded-xl border border-line bg-surface">
      <Image
        src={url}
        alt={alt}
        fill
        sizes={`(min-width: 768px) ${COLUNA_PAGINA}px, 100vw`}
        quality={85}
        loading="lazy"
        className="object-cover"
        style={focalX !== undefined && focalY !== undefined ? { objectPosition: `${focalX}% ${focalY}%` } : undefined}
      />
    </div>
  )
}

import Image from 'next/image'

import { flyerBoxRatio } from '@/lib/parties/flyer-frame'
import type { FlyerImage } from '@/lib/parties/types'

interface Props {
  flyer: FlyerImage
  sizes: string
  priority?: boolean
  /** Narrowest box proportion (width/height); taller flyers are letterboxed (object-contain). */
  minRatio?: number
  /** Tailwind max-height class for very tall flyers, e.g. `max-h-[80vh]` */
  maxHeightClass?: string
  className?: string
  imageClassName?: string
}

/**
 * Shows the flyer whole, at the proportions of the uploaded file (never cropped):
 * the box takes the image ratio, object-contain letterboxes only what exceeds the caps.
 */
export function FlyerFrame({
  flyer,
  sizes,
  priority = false,
  minRatio,
  maxHeightClass = '',
  className = '',
  imageClassName = '',
}: Props) {
  const ratio = flyerBoxRatio(flyer, minRatio)
  return (
    <div
      data-flyer-ratio={ratio.toFixed(4)}
      style={{ aspectRatio: String(ratio) }}
      className={`relative w-full overflow-hidden bg-bg ${maxHeightClass} ${className}`}
    >
      <Image
        src={flyer.url}
        alt={flyer.alt}
        width={flyer.width}
        height={flyer.height}
        sizes={sizes}
        priority={priority}
        className={`h-full w-full object-contain ${imageClassName}`}
      />
    </div>
  )
}

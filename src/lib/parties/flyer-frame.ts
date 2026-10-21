/** Smallest width/height allowed for a flyer box in the card grid (3:4). Taller flyers (4:5 is
 *  kept whole; stories 9:16 are letterboxed on the brand background instead of dominating). */
export const CARD_MIN_RATIO = 3 / 4

/** Real proportion of the uploaded flyer (width / height); 4:5 when the data is unusable. */
export function flyerRatio(flyer: { width: number; height: number }): number {
  return flyer.width > 0 && flyer.height > 0 ? flyer.width / flyer.height : 4 / 5
}

/** CSS aspect-ratio of the box: the flyer's own proportion, never narrower than `minRatio`. */
export function flyerBoxRatio(flyer: { width: number; height: number }, minRatio = CARD_MIN_RATIO): number {
  return Math.max(flyerRatio(flyer), minRatio)
}

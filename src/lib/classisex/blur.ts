import sharp from 'sharp'

/**
 * Blurred twin of a ClassiSex photo for the public preview (D-04).
 * T-04-11: the image is first reduced to at most 16×16 px, so no detail survives; it is then
 * scaled back to 480 px wide and blurred so it reads as a soft colour field.
 */
export async function makeBlurredPreview(input: Buffer): Promise<Buffer> {
  const tiny = await sharp(input).rotate().resize(16, 16, { fit: 'inside' }).png().toBuffer()
  return sharp(tiny).resize({ width: 480 }).blur(8).webp({ quality: 60 }).toBuffer()
}

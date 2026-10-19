import path from 'path'

/**
 * Private storage for ClassiSex photos and videos (CLAS-06).
 *
 * T-04-03: Payload serves any file under a public collection's staticDir
 * (uploads/endpoints/getFile.js: no DB lookup when read access is `true`), and Media's staticDir
 * is MEDIA_DIR itself. Private files must therefore never live under MEDIA_DIR (or public/):
 * they get their own directory, on their own Docker volume (`private_media`).
 *
 * No 'server-only' import: loaded by payload.config.ts in plain Node (CLI, migrations).
 */
export function privateMediaDir(): string {
  return path.resolve(/* turbopackIgnore: true */ process.env.PRIVATE_MEDIA_DIR || 'private-media')
}

const inside = (child: string, parent: string) => {
  const rel = path.relative(parent, child)
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))
}

/** Throws when the private dir equals, contains or sits inside the public media dir or public/. */
export function assertOutsidePublicMedia(mediaDir: string, privateDir: string): void {
  const media = path.resolve(mediaDir)
  const priv = path.resolve(privateDir)
  const publicDir = path.resolve(/* turbopackIgnore: true */ process.cwd(), 'public')
  if (inside(priv, media) || inside(media, priv) || inside(priv, publicDir)) {
    throw new Error(
      `PRIVATE_MEDIA_DIR must not be inside MEDIA_DIR or public/ (media: ${media}, private: ${priv})`,
    )
  }
}

/**
 * T-04-16: in production the compose file sets PRIVATE_MEDIA_DIR together with the
 * `private_media` volume. Without it (VPS compose not refreshed) uploads are refused instead of
 * being written into the container layer and lost on the next restart.
 */
export function privateStorageConfigured(): boolean {
  return !(process.env.NODE_ENV === 'production' && !process.env.PRIVATE_MEDIA_DIR)
}

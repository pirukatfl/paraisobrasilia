import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { expire } from '../cache/expire'

/** Tag 'space': /espaco grid and the home "Conheça o espaço" teaser. */
export const revalidateSpace: CollectionAfterChangeHook = ({ doc }) => {
  expire(['space'])
  return doc
}
export const revalidateSpaceAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  expire(['space'])
  return doc
}

/** Tag 'models': /modelos, nav/footer/sitemap visibility of the section. */
export const revalidateModels: CollectionAfterChangeHook = ({ doc }) => {
  expire(['models'])
  return doc
}
export const revalidateModelsAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  expire(['models'])
  return doc
}

/** Media/videos used by galleries: an edited alt text or a deleted file must show at once. */
export const revalidateGalleries: CollectionAfterChangeHook = ({ doc }) => {
  expire(['space', 'models'])
  return doc
}
export const revalidateGalleriesAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  expire(['space', 'models'])
  return doc
}

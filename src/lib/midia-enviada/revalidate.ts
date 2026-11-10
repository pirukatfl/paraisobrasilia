import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { expire } from '../cache/expire'

/** Tag 'amadores': photos in Galeria → Amadoras and the list of /videos-amadores. */
export const revalidateAmadores: CollectionAfterChangeHook = ({ doc }) => {
  expire(['amadores'])
  return doc
}
export const revalidateAmadoresAfterDelete: CollectionAfterDeleteHook = ({ doc }) => {
  expire(['amadores'])
  return doc
}

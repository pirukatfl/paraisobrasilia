'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/** false during SSR and hydration, true afterwards (no effect + setState). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}

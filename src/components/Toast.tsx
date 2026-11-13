'use client'

import { useEffect } from 'react'

/**
 * Small notice pinned to the bottom of the screen: says what happened and goes away by itself.
 * Announced to screen readers (role="alert"); the close button is a real 44 px target.
 * Used for upload failures, where the inline message can be out of sight (long form, phone).
 */
export function Toast({ message, onClose, seconds = 10 }: { message: string | null; onClose: () => void; seconds?: number }) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onClose, seconds * 1000)
    return () => window.clearTimeout(timer)
  }, [message, onClose, seconds])

  if (!message) return null
  return (
    <div
      role="alert"
      className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-start gap-3 rounded-lg border border-danger bg-surface-2 py-3 pl-4 pr-2 shadow-lg shadow-black/50"
    >
      <p className="flex-1 py-2 text-body text-text">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Fechar aviso"
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span aria-hidden="true" className="text-xl leading-none">×</span>
      </button>
    </div>
  )
}

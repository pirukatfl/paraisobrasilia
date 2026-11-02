'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { buildAgeCookie, isAgeCookieValid, readAgeCookie } from './cookie'
import { type AgeGateTextos, getActiveVerifier } from './index'

const { Prompt } = getActiveVerifier()

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Owned by the component: returning visitors (html[data-age-ok], set by the head script)
// never see the overlay. The overlay markup is always in the SSR HTML; content is never removed.
const GATE_CSS = `html[data-age-ok] [data-age-gate]{display:none}`

/**
 * 18+ overlay over the fully rendered page (INST-04). No redirect and no browser sniffing:
 * crawlers and link previews receive the same complete HTML as everyone else.
 */
export function AgeGate({ textos }: { textos: AgeGateTextos }) {
  const [state, setState] = useState<'open' | 'closing' | 'closed'>('open')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAgeCookieValid(readAgeCookie(document.cookie))) {
      // Already confirmed: CSS keeps the overlay hidden (display:none), nothing to do.
      document.documentElement.dataset.ageOk = '1'
      return
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector<HTMLElement>('[data-age-primary]')?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      const root = ref.current
      if (!root) return
      if (event.key === 'Escape') {
        event.preventDefault() // the decision must be explicit
        return
      }
      if (event.key !== 'Tab') return
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey && (active === first || !root.contains(active))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !root.contains(active))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [])

  const onVerified = useCallback(() => {
    document.cookie = buildAgeCookie({ secure: window.location.protocol === 'https:' })
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const finish = () => {
      document.documentElement.dataset.ageOk = '1'
      document.body.style.overflow = ''
      setState('closed')
    }
    if (reduceMotion) {
      finish()
    } else {
      setState('closing')
      window.setTimeout(finish, 420)
    }
  }, [])

  if (state === 'closed') return null

  return (
    <>
      <style>{GATE_CSS}</style>
      <div
        ref={ref}
        data-age-gate
        // Closing: a curtain draws in from both sides (clip-path) while it fades; the markup is untouched until it ends
        className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-bg/75 px-4 py-8 backdrop-blur-[24px] transition-[clip-path,opacity] duration-[420ms] ease-[var(--ease-in-quick,cubic-bezier(.4,0,1,1))] ${
          state === 'closing' ? 'pointer-events-none opacity-0 [clip-path:inset(0_50%_0_50%)]' : 'opacity-100 [clip-path:inset(0)]'
        }`}
      >
        <Prompt onVerified={onVerified} textos={textos} />
      </div>
    </>
  )
}

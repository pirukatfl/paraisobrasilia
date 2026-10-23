'use client'

import { useState, type ComponentProps } from 'react'

const inputClass = 'min-h-11 w-full rounded-lg border border-line bg-surface px-4 pr-12 text-body text-text focus:border-accent'

/** Password input with an eye button that shows/hides the typed value. Falls back to a plain password field without JS. */
export function PasswordInput(props: Omit<ComponentProps<'input'>, 'type' | 'className'>) {
  const [visible, setVisible] = useState(false)
  const label = visible ? 'Ocultar senha' : 'Mostrar senha'
  return (
    <div className="relative">
      <input {...props} type={visible ? 'text' : 'password'} className={inputClass} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted hover:text-text"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="M3 3l18 18" />}
        </svg>
      </button>
    </div>
  )
}

import type { ReactNode } from 'react'

import { PasswordInput } from '@/components/assinantes/PasswordInput'

/** Labelled input for the subscriber forms (/entrar, senha pages).  */
export function FormField({
  id,
  label,
  name,
  type,
  autoComplete,
  required = true,
  minLength,
  maxLength,
  defaultValue,
  error,
  hint,
}: {
  id: string
  label: ReactNode
  name: string
  type: 'email' | 'password' | 'text'
  autoComplete: string
  required?: boolean
  minLength?: number
  maxLength?: number
  defaultValue?: string
  /** Field-level message (rendered under the input, linked with aria-describedby) */
  error?: string
  hint?: ReactNode
}) {
  const inputProps = {
    id,
    name,
    autoComplete,
    required,
    minLength,
    maxLength,
    defaultValue,
    'aria-invalid': error ? (true as const) : undefined,
    'aria-describedby': error ? `${id}-erro` : hint ? `${id}-dica` : undefined,
  }
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="type-label text-text">
        {label}
      </label>
      {type === 'password' ? (
        <PasswordInput {...inputProps} />
      ) : (
        <input
          {...inputProps}
          type={type}
          className="w-full"
        />
      )}
      {hint && !error && (
        <p id={`${id}-dica`} className="type-label text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} role="alert" className="type-label text-danger motion-safe:animate-[overlay-in_var(--duration-fast)_ease_both]">
          {error}
        </p>
      )}
    </div>
  )
}

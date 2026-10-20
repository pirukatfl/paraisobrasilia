/** Labelled input for the subscriber forms (/entrar, senha pages). Server component, no JS. */
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
  label: string
  name: string
  type: 'email' | 'password' | 'text'
  autoComplete: string
  required?: boolean
  minLength?: number
  maxLength?: number
  defaultValue?: string
  /** Field-level message (rendered under the input, linked with aria-describedby) */
  error?: string
  hint?: string
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="type-label text-text">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : hint ? `${id}-dica` : undefined}
        className="min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent"
      />
      {hint && !error && (
        <p id={`${id}-dica`} className="type-label text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} role="alert" className="type-label text-danger">
          {error}
        </p>
      )}
    </div>
  )
}

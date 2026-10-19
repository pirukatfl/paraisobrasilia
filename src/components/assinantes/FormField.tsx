/** Labelled input for the subscriber forms (/entrar, senha pages). Server component, no JS. */
export function FormField({
  id,
  label,
  name,
  type,
  autoComplete,
  required = true,
  minLength,
}: {
  id: string
  label: string
  name: string
  type: 'email' | 'password' | 'text'
  autoComplete: string
  required?: boolean
  minLength?: number
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
        className="min-h-11 rounded-lg border border-line bg-surface px-4 text-body text-text focus:border-accent"
      />
    </div>
  )
}

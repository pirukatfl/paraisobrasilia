import type { ServerProps } from 'payload'

/** Button above the subscriber list: the one-step form is the normal way to add someone. */
export function NovoAssinanteLink({ payload }: Pick<ServerProps, 'payload'>) {
  const href = `${payload.config.routes.admin}/novo-assinante`
  return (
    <p style={{ margin: '0 0 calc(var(--base) * 0.75)' }}>
      <a
        href={href}
        style={{
          display: 'inline-block',
          padding: '8px 16px',
          borderRadius: 'var(--style-radius-s, 3px)',
          background: 'var(--theme-elevation-1000)',
          color: 'var(--theme-elevation-0)',
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        Novo assinante (conta, plano e link de senha)
      </a>
    </p>
  )
}

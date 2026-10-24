'use client'

// Last resort when the root layout itself fails: it replaces the whole page, so it brings its own
// <html> and inline styles (globals.css is not loaded here). Same text and rules as (frontend)/error.tsx.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, background: '#14090d', color: '#f4eceb', fontFamily: 'system-ui, sans-serif' }}>
        <main role="alert" style={{ maxWidth: 480, margin: '0 auto', padding: '96px 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, margin: 0 }}>Algo deu errado ao abrir esta página.</h1>
          <p style={{ marginTop: 16, lineHeight: 1.5 }}>
            Pode ser uma instabilidade momentânea. Tente de novo em alguns instantes. Se continuar, avise a equipe informando o
            código abaixo.
          </p>
          {error.digest && <p style={{ marginTop: 16, opacity: 0.7 }}>Código: {error.digest}</p>}
          <p style={{ marginTop: 32 }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{ padding: '12px 24px', borderRadius: 8, border: 0, background: '#c8123c', color: '#fff', fontSize: 16, cursor: 'pointer' }}
            >
              Tentar de novo
            </button>
          </p>
          <p style={{ marginTop: 16 }}>
            {/* Plain reload to "/": the router may be broken together with the layout */}
            <button
              type="button"
              onClick={() => {
                // eslint-disable-next-line @next/next/no-location-assign-relative-destination
                window.location.href = '/'
              }}
              style={{ background: 'none', border: 0, color: 'inherit', textDecoration: 'underline', fontSize: 16, cursor: 'pointer' }}
            >
              Voltar ao início
            </button>
          </p>
        </main>
      </body>
    </html>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-16 border-t border-line bg-bg">
      <p className="type-label mx-auto max-w-[1200px] px-4 py-8 text-muted lg:px-8">
        © {year} Paraíso Brasília · Proibido para menores de 18 anos
      </p>
    </footer>
  )
}

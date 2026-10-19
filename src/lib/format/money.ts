const whole = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const cents = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

/** 30 → 'R$ 30'; 29.9 → 'R$ 29,90' (no-break spaces from Intl normalised to a plain space). */
export function formatBRL(value: number): string {
  const text = Number.isInteger(value) ? whole.format(value) : cents.format(value)
  return text.replace(/\s/g, ' ')
}

'use client'

import type { ReactNode } from 'react'

import { PROMOCAO_ABRIR_QUERY } from '@/lib/site/nav'
import { abrirPromocao } from '@/lib/site/promocao-evento'

/**
 * Menu item "Promoção": a button that opens the promotion modal on the page the visitor is on (no navigation).
 * It is a real <button> inside a GET form to `/?promocao=abrir`, so without JavaScript the browser still goes
 * to the home page, which opens the modal as a block at the top (see PromocaoDialog). With JavaScript the
 * submit is cancelled and the modal opens in place.
 */
export function PromocaoMenuButton({
  className,
  retorno,
  aoAbrir,
  children,
}: {
  className: string
  /** Element to return focus to on close, when the button itself disappears (mobile panel) */
  retorno?: () => HTMLElement | null
  aoAbrir?: () => void
  children: ReactNode
}) {
  const [nome, valor] = PROMOCAO_ABRIR_QUERY.split('=')
  return (
    <form
      action="/"
      method="get"
      onSubmit={(event) => {
        event.preventDefault()
        const botao = event.currentTarget.querySelector('button')
        aoAbrir?.()
        abrirPromocao(retorno?.() ?? botao)
      }}
    >
      <input type="hidden" name={nome} value={valor} />
      <button type="submit" aria-haspopup="dialog" className={className}>
        {children}
      </button>
    </form>
  )
}

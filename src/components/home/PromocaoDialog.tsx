'use client'

import Image from 'next/image'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

import type { GalleryImage } from '@/lib/gallery/types'

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
const STORAGE_KEY = 'pb_promo_vista'

// Fallback when sessionStorage is blocked: once per page load is the best we can do
let vistaNestaCarga: string | null = null

function jaVista(chave: string): boolean {
  if (vistaNestaCarga === chave) return true
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === chave
  } catch {
    return false
  }
}

function marcarVista(chave: string) {
  vistaNestaCarga = chave
  try {
    window.sessionStorage.setItem(STORAGE_KEY, chave)
  } catch {
    // storage blocked: the module variable above covers this page load
  }
}

/**
 * Home promotion pop-up. Renders nothing on the server (no JS: no pop-up) and nothing until the 18+
 * confirmation exists (html[data-age-ok], set by the head script or by the age gate when the visitor
 * confirms), so it is never on top of the age notice. Once per session per version of the promotion.
 * Closes on the X, the "Fechar" button, the backdrop and Esc; focus is trapped inside and returned on close.
 */
export function PromocaoDialog({
  versao,
  titulo,
  imagem,
  textoFechar,
  participar,
  botaoFechar,
  children,
}: {
  versao: string
  titulo: string
  imagem: GalleryImage | null
  textoFechar: string
  /** The "Participar" link (primary), or null when the promotion is informative only */
  participar: ReactNode
  /** Label of the secondary "Fechar" button */
  botaoFechar: ReactNode
  children: ReactNode
}) {
  const [aberta, setAberta] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)

  // Wait for the age confirmation, then open once
  useEffect(() => {
    const chave = versao || 'v0'
    const html = document.documentElement
    const tentar = () => {
      if (!html.dataset.ageOk || jaVista(chave)) return false
      opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      marcarVista(chave)
      setAberta(true)
      return true
    }
    if (html.dataset.ageOk) {
      tentar()
      return
    }
    const observer = new MutationObserver(() => {
      if (tentar()) observer.disconnect()
    })
    observer.observe(html, { attributes: true, attributeFilter: ['data-age-ok'] })
    return () => observer.disconnect()
  }, [versao])

  const fechar = useCallback(() => {
    setAberta(false)
    const alvo = opener.current
    if (alvo && document.contains(alvo)) alvo.focus()
  }, [])

  useEffect(() => {
    if (!aberta) return
    const anterior = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    rootRef.current?.querySelector<HTMLElement>('[data-promo-fechar]')?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current
      if (!root) return
      if (event.key === 'Escape') {
        event.preventDefault()
        fechar()
        return
      }
      if (event.key !== 'Tab') return
      const itens = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (itens.length === 0) return
      const primeiro = itens[0]
      const ultimo = itens[itens.length - 1]
      const ativo = document.activeElement
      if (event.shiftKey && (ativo === primeiro || !root.contains(ativo))) {
        event.preventDefault()
        ultimo.focus()
      } else if (!event.shiftKey && (ativo === ultimo || !root.contains(ativo))) {
        event.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = anterior
    }
  }, [aberta, fechar])

  if (!aberta) return null

  return (
    <div
      ref={rootRef}
      data-promocao
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-bg/80 px-4 py-8 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) fechar()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titulo ? 'promocao-titulo' : undefined}
        aria-label={titulo ? undefined : textoFechar}
        className="card-glow relative w-full max-w-[520px] rounded-xl border border-gold/20 bg-surface"
      >
        <button
          type="button"
          data-promo-fechar
          onClick={fechar}
          aria-label={textoFechar}
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-bg/80 text-text hover:border-accent focus-visible:border-accent"
        >
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 4l10 10M14 4 4 14" />
          </svg>
        </button>
        {imagem && (
          <Image
            src={imagem.url}
            alt={imagem.alt}
            width={imagem.width}
            height={imagem.height}
            sizes="520px"
            className="h-auto max-h-[40vh] w-full rounded-t-xl object-cover"
          />
        )}
        <div className="px-6 py-6 lg:px-8 lg:py-8">
          {titulo && (
            <h2 id="promocao-titulo" className="type-heading pr-10">
              {titulo}
            </h2>
          )}
          <div className={titulo ? 'mt-4' : ''}>{children}</div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            {participar}
            <button type="button" data-promo-botao-fechar onClick={fechar} className="btn-secondary flex-1 text-center">
              {botaoFechar}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


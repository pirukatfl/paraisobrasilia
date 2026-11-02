'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

import { PWA_SEM_AVISO } from '@/lib/pwa/rotas'

const CHAVE = 'pb_pwa_dispensado'
const SILENCIO_MS = 30 * 24 * 60 * 60 * 1000
const ATRASO_MS = 30_000

type EventoInstalar = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

const lerDispensado = (): boolean => {
  try {
    const t = Number(window.localStorage.getItem(CHAVE))
    return t > 0 && Date.now() - t < SILENCIO_MS
  } catch {
    return false
  }
}

const jaInstalado = () =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true

const ehIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent)

const rotaSemAviso = (p: string) =>
  PWA_SEM_AVISO.some((r) => (r === '/' ? p === '/' : p === r || p.startsWith(r + '/')))

/** Convite discreto para instalar o site. Nunca disputa com a confirmação 18+ nem com a promoção. */
export function AvisoInstalacao() {
  const pathname = usePathname()
  const [evento, setEvento] = useState<EventoInstalar | null>(null)
  const [ios, setIos] = useState(false)
  const [pronto, setPronto] = useState(false)
  const [livre, setLivre] = useState(false)
  const [fechado, setFechado] = useState(false)

  // Candidato à instalação
  useEffect(() => {
    if (jaInstalado() || lerDispensado()) return
    const aoOferecer = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalar)
    }
    const aoInstalar = () => setFechado(true)
    window.addEventListener('beforeinstallprompt', aoOferecer)
    window.addEventListener('appinstalled', aoInstalar)
    const timer = window.setTimeout(() => {
      setIos(ehIos())
      setPronto(true)
    }, ATRASO_MS)
    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecer)
      window.removeEventListener('appinstalled', aoInstalar)
      window.clearTimeout(timer)
    }
  }, [])

  // Só mostra com a idade confirmada e sem promoção aberta
  useEffect(() => {
    const checar = () =>
      setLivre(document.documentElement.dataset.ageOk === '1' && !document.querySelector('[data-promocao]'))
    checar()
    const obs = new MutationObserver(checar)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-age-ok'] })
    obs.observe(document.body, { childList: true })
    return () => obs.disconnect()
  }, [])

  const dispensar = () => {
    try {
      window.localStorage.setItem(CHAVE, String(Date.now()))
    } catch {}
    setFechado(true)
  }

  const instalar = async () => {
    if (!evento) return
    await evento.prompt()
    await evento.userChoice.catch(() => undefined)
    setEvento(null)
    setFechado(true)
  }

  const oferta = evento !== null || ios
  if (fechado || !pronto || !livre || !oferta || rotaSemAviso(pathname)) return null

  return (
    <section
      role="region"
      aria-label="Instalar o site"
      data-aviso-instalacao
      className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-[460px] items-center gap-3 rounded-xl border border-gold/20 bg-surface px-4 py-3 shadow-lg animate-[dialog-in_var(--duration-overlay)_var(--ease-out-expo)_both] motion-reduce:animate-none"
    >
      <p className="flex-1 text-sm leading-snug text-text">
        {evento
          ? 'Instale o Paraíso Brasília no seu celular e abra as festas com um toque.'
          : 'Para instalar: toque em Compartilhar e depois em “Adicionar à Tela de Início”.'}
      </p>
      {evento && (
        <button type="button" onClick={() => void instalar()} className="btn-primary min-h-11 shrink-0 px-4">
          Instalar
        </button>
      )}
      <button
        type="button"
        onClick={dispensar}
        className="btn-secondary min-h-11 shrink-0 px-4"
      >
        Agora não
      </button>
    </section>
  )
}

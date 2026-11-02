'use client'

import { useEffect } from 'react'

const UMA_HORA = 60 * 60 * 1000

/** Registra o service worker (só em produção/staging). Em desenvolvimento, remove qualquer um que sobrou. */
export function RegistrarSW({ ativo }: { ativo: boolean }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    if (!ativo) {
      void navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => void r.unregister()))
      return
    }
    let registro: ServiceWorkerRegistration | undefined
    void navigator.serviceWorker
      .register('/sw.js', { scope: '/', updateViaCache: 'none' })
      .then((r) => {
        registro = r
      })
      .catch(() => {})
    const atualizar = () => void registro?.update().catch(() => {})
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') atualizar()
    }
    document.addEventListener('visibilitychange', aoVoltar)
    const timer = window.setInterval(atualizar, UMA_HORA)
    return () => {
      document.removeEventListener('visibilitychange', aoVoltar)
      window.clearInterval(timer)
    }
  }, [ativo])
  return null
}

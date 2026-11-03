'use client'

import { useEffect } from 'react'

const BUTTON_ATTR = 'data-mostrar-senha'

const EYE = '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>'
const EYE_OFF = EYE + '<path d="M3 3l18 18"/>'

const icon = (inner: string) =>
  `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`

function attach(input: HTMLInputElement) {
  const host = input.parentElement
  if (!host || host.querySelector(`[${BUTTON_ATTR}]`)) return

  host.style.position = 'relative'
  input.style.paddingInlineEnd = '3rem'

  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute(BUTTON_ATTR, '')
  Object.assign(button.style, {
    position: 'absolute',
    top: '0',
    bottom: '0',
    right: '0',
    width: '2.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    border: '0',
    cursor: 'pointer',
    color: 'var(--theme-elevation-500)',
  })

  const sync = () => {
    const visible = input.type === 'text'
    const label = visible ? 'Ocultar senha' : 'Mostrar senha'
    button.setAttribute('aria-label', label)
    button.setAttribute('aria-pressed', String(visible))
    button.title = label
    button.innerHTML = icon(visible ? EYE_OFF : EYE)
  }
  button.addEventListener('click', () => {
    input.type = input.type === 'password' ? 'text' : 'password'
    sync()
    input.focus()
  })
  sync()
  host.appendChild(button)
}

/**
 * Eye button on the admin login password field. Payload's login form has no
 * built-in toggle, so this is attached to the rendered field (afterLogin slot).
 */
export default function MostrarSenhaLogin() {
  useEffect(() => {
    const run = () => {
      document
        .querySelectorAll<HTMLInputElement>('form input[name="password"]')
        .forEach(attach)
    }
    run()
    const observer = new MutationObserver(run)
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  return null
}

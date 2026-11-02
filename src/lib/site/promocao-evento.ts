/**
 * "Promoção" menu item → promotion modal. The modal lives in the frontend layout (PromocaoPopup); the menu
 * (desktop or mobile) asks it to open with a window event, so no shared context is needed between the two.
 */
export const PROMOCAO_ABRIR_EVENTO = 'pb:promocao-abrir'

/** `retorno`: where focus goes back to when the modal closes (the mobile menu closes its panel, so it passes its toggle). */
export type PromocaoAbrirDetalhe = { retorno?: HTMLElement | null }

export function abrirPromocao(retorno?: HTMLElement | null) {
  window.dispatchEvent(new CustomEvent<PromocaoAbrirDetalhe>(PROMOCAO_ABRIR_EVENTO, { detail: { retorno } }))
}

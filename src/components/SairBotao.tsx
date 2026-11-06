import { LogOutIcon } from '@/components/icons'
import { TextoRico } from '@/components/TextoRico'
import { sair } from '@/lib/assinantes/actions'
import type { TextoRico as EstadoRico } from '@/lib/textos/rico'

/**
 * Sair always in reach for a logged-in subscriber: a button in the header bar itself (desktop and mobile),
 * outside the menus, so logging out never takes opening a menu first. A plain form: works without JavaScript.
 * On narrow screens only the icon shows (the accessible name stays "Sair").
 */
export function SairBotao({ rotulo }: { rotulo: EstadoRico }) {
  return (
    <form action={sair}>
      <button
        type="submit"
        className="type-label inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line px-3 text-text transition-colors duration-200 hover:border-accent hover:text-accent focus-visible:border-accent focus-visible:text-accent"
      >
        <LogOutIcon />
        <span className="max-sm:sr-only">
          <TextoRico valor={rotulo} linha />
        </span>
      </button>
    </form>
  )
}

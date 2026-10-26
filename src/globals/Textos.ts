import type { Field, GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isStaff } from '../access/roles'
import { expire } from '../lib/cache/expire'
import { AREAS } from '../lib/textos/areas'
import { type AreaTextos, campoEhLongo } from '../lib/textos/tipos'

/**
 * One global per area of editable site texts (PAINEL-10, 06.2). Fields are never required and start
 * filled with the original text; the reader falls back to it when a field is emptied (T-03).
 */
/** 'textos-area-assinante' -> 'areaAssinante': the key used by getTextos and its cache tag. */
const chaveDoSlug = (slug: string) =>
  slug.replace(/^textos-/, '').replace(/-([a-z])/g, (_, letra: string) => letra.toUpperCase())

export function criarGlobalDeTextos(area: AreaTextos, chave: string = chaveDoSlug(area.slug)): GlobalConfig {
  const revalidar: GlobalAfterChangeHook = ({ doc }) => {
    expire([`textos:${chave}`])
    return doc
  }

  // Fields keep their order; sections group them in collapsibles in order of first appearance
  const fields: Field[] = []
  const secoes = new Map<string, Field[]>()
  for (const [name, campo] of Object.entries(area.campos)) {
    const base = {
      name,
      label: campo.rotulo,
      defaultValue: campo.padrao,
      admin: campo.ajuda ? { description: campo.ajuda } : {},
    }
    const field: Field = campoEhLongo(campo) ? { ...base, type: 'textarea' } : { ...base, type: 'text' }
    if (!campo.secao) {
      fields.push(field)
      continue
    }
    let grupo = secoes.get(campo.secao)
    if (!grupo) {
      grupo = []
      secoes.set(campo.secao, grupo)
      fields.push({ type: 'collapsible', label: campo.secao, fields: grupo })
    }
    grupo.push(field)
  }

  return {
    slug: area.slug,
    label: area.rotulo,
    admin: {
      group: 'Textos do site',
      hidden: area.ocultaNoPainel ?? false,
      description: `${area.descricao} Para voltar ao texto original, apague o campo e salve.`,
    },
    access: {
      // Public site copy, nothing sensitive
      read: () => true,
      update: isStaff,
    },
    hooks: { afterChange: [revalidar] },
    fields,
  }
}

export const TextosGlobals: GlobalConfig[] = Object.entries(AREAS)
  .filter(([, area]) => Object.keys(area.campos).length > 0)
  .map(([chave, area]) => criarGlobalDeTextos(area, chave))

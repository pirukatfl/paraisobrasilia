import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isStaff } from '../access/roles'
import { expire } from '../lib/cache/expire'
import { LINK_EXTERNO_PADRAO, MENU_ITENS, urlExternaSegura } from '../lib/site/menu'

const revalidateMenu: GlobalAfterChangeHook = ({ doc }) => {
  expire(['menu'])
  return doc
}

/**
 * Menu do site (novo planejamento 2026-11-01): hide items of the header menu, the mobile menu and the
 * footer without touching code, and set the external link that only logged-in subscribers see.
 */
export const MenuDoSite: GlobalConfig = {
  slug: 'menu-do-site',
  label: 'Menu do site',
  admin: {
    group: 'Configurações',
    description: 'Esconda itens do menu e escolha o link externo que só os assinantes veem.',
  },
  access: {
    read: () => true,
    // Where subscribers are sent is a staff decision
    update: isStaff,
  },
  hooks: {
    afterChange: [revalidateMenu],
  },
  fields: [
    {
      name: 'itensOcultos',
      type: 'select',
      hasMany: true,
      label: 'Itens escondidos',
      options: MENU_ITENS.map((i) => ({ label: i.label, value: i.value })),
      admin: {
        description:
          'Itens marcados somem do menu do topo, do menu do celular e do rodapé. A página continua existindo. Para mostrar de novo, tire a marca.',
      },
    },
    {
      name: 'linkExterno',
      type: 'group',
      label: 'Link externo para assinantes',
      admin: {
        description:
          'Aparece só no menu de quem está logado como assinante, por último (abre em outra aba). Nunca aparece para visitantes, no rodapé nem no mapa do site.',
      },
      fields: [
        {
          name: 'ativo',
          type: 'checkbox',
          defaultValue: LINK_EXTERNO_PADRAO.ativo,
          label: 'Mostrar o link',
        },
        {
          name: 'rotulo',
          type: 'text',
          defaultValue: LINK_EXTERNO_PADRAO.rotulo,
          label: 'Texto do link',
        },
        {
          name: 'url',
          type: 'text',
          defaultValue: LINK_EXTERNO_PADRAO.url,
          label: 'Endereço (começa com https://)',
          validate: (value: unknown) =>
            value === undefined || value === null || value === '' || urlExternaSegura(value)
              ? true
              : 'Use um endereço completo que comece com http:// ou https://.',
        },
      ],
    },
  ],
}

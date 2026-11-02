import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isStaff } from '../access/roles'
import { expire } from '../lib/cache/expire'
import { editorBloco } from '../lib/textos/editor'

const revalidatePromocao: GlobalAfterChangeHook = ({ doc }) => {
  expire(['promocao'])
  return doc
}

/**
 * Promoção (novo planejamento 2026-11-01): the pop-up of the home page. Staff turn it on and off, write
 * it, set an optional period and image. Public by nature (it is shown to every visitor).
 */
export const Promocao: GlobalConfig = {
  slug: 'promocao',
  label: 'Promoção',
  admin: {
    group: 'Configurações',
    description:
      'Pop-up da página inicial. Marque "Promoção ligada" para mostrar e desmarque para tirar do site. Aparece uma vez por visita, depois da confirmação de 18 anos.',
  },
  access: {
    read: () => true,
    update: isStaff,
  },
  hooks: {
    afterChange: [revalidatePromocao],
  },
  fields: [
    {
      name: 'ativa',
      type: 'checkbox',
      defaultValue: false,
      label: 'Promoção ligada',
      admin: { description: 'Desmarque para tirar o pop-up do site sem apagar o texto.' },
    },
    {
      name: 'titulo',
      type: 'text',
      label: 'Título',
      admin: { description: 'Ex.: Promoção de aniversário.' },
    },
    {
      name: 'texto',
      type: 'richText',
      editor: editorBloco,
      label: 'Texto',
      admin: {
        description:
          'As palavras "contos" e "fotos e vídeos" viram links sozinhas (para enviar contos e para enviar fotos e vídeos), em destaque. No fim do pop-up já aparecem os botões "Enviar contos" e "Enviar fotos e vídeos".',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'inicio',
          type: 'date',
          label: 'Começa em (opcional)',
          admin: {
            description: 'Horário de Brasília. Em branco: vale desde já.',
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
          },
        },
        {
          name: 'fim',
          type: 'date',
          label: 'Termina em (opcional)',
          admin: {
            description: 'Depois dessa hora o pop-up some sozinho. Em branco: fica até você desligar.',
            date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
          },
          validate: (value: unknown, { siblingData }: { siblingData?: { inicio?: string | null } }) => {
            if (!value || !siblingData?.inicio) return true
            const fim = new Date(value as string).getTime()
            const inicio = new Date(siblingData.inicio).getTime()
            return Number.isFinite(fim) && Number.isFinite(inicio) && fim < inicio
              ? 'O término precisa ser depois do começo.'
              : true
          },
        },
      ],
    },
    {
      name: 'imagem',
      type: 'upload',
      relationTo: 'media',
      label: 'Imagem (opcional)',
      admin: { description: 'Sem nudez explícita: o pop-up aparece na área aberta do site.' },
    },
  ],
}

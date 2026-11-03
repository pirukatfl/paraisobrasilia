import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isStaff } from '../access/roles'
import { expire } from '../lib/cache/expire'
import { editorBloco } from '../lib/textos/editor'

const revalidatePromocao: GlobalAfterChangeHook = ({ doc }) => {
  expire(['promocao'])
  return doc
}

/**
 * Promoção (novo planejamento 2026-11-01): the section of the home page, directly above "Como chegar". Staff turn it on and off, write
 * it, set an optional period and image. Public by nature (it is shown to every visitor).
 */
export const Promocao: GlobalConfig = {
  slug: 'promocao',
  label: 'Promoção',
  admin: {
    group: 'Configurações',
    description:
      'Seção da página inicial, logo acima de "Como chegar" (não é mais pop-up nem item do menu). Marque "Promoção ligada" para mostrar e desmarque para tirar do site. Quem quiser entrar na promoção clica em Participar e preenche o formulário.',
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
      admin: { description: 'Desmarque para tirar a seção do site sem apagar o texto.' },
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
          'Aparece abaixo do título. No fim da seção já aparece o botão "Participar" (se estiver marcado).',
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'participarAtivo',
          type: 'checkbox',
          defaultValue: true,
          label: 'Mostrar o botão Participar',
          admin: {
            description:
              'Marcado: quem clicar em Participar vai para o formulário (dados, fotos e vídeos). Desmarcado: a seção só informa, sem botão.',
          },
        },
        {
          name: 'botaoParticipar',
          type: 'text',
          defaultValue: 'Participar',
          label: 'Texto do botão Participar',
        },
      ],
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
            description: 'Depois dessa hora a seção some sozinha. Em branco: fica até você desligar.',
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
      admin: { description: 'Sem nudez explícita: a seção aparece na área aberta do site.' },
    },
  ],
}

import type { GlobalAfterChangeHook, GlobalConfig } from 'payload'

import { isStaff, staffOnlyField } from '../access/roles'
import { expire } from '../lib/cache/expire'


const revalidateContact: GlobalAfterChangeHook = ({ doc }) => {
  expire(['contact'])
  return doc
}

const isEmpty = (value: unknown) => value === undefined || value === null || value === ''

/**
 * Contact and address shown in the footer, on /contato and on the home (INST-02, INST-03, PAINEL-04).
 * Validation keeps staff input inside the shapes the link builders expect (T-02-02).
 */
export const Contact: GlobalConfig = {
  slug: 'contact',
  label: 'Contato e endereço',
  admin: {
    group: 'Configurações',
    description: 'Dados exibidos no rodapé, na página Contato e na página inicial.',
  },
  access: {
    read: () => true,
    // T-02-01: only staff can change where visitors are sent (WhatsApp, maps)
    update: isStaff,
  },
  hooks: {
    afterChange: [revalidateContact],
  },
  fields: [
    {
      name: 'addressLine',
      type: 'text',
      required: true,
      label: 'Endereço',
      admin: { description: 'Rua, travessa e número (ex.: Rua 15, Travessa 01, Chácara 02).' },
    },
    {
      name: 'addressDetail',
      type: 'text',
      required: true,
      label: 'Complemento',
      admin: { description: 'Bairro, cidade e UF.' },
    },
    {
      name: 'postalCode',
      type: 'text',
      label: 'CEP',
      validate: (value: unknown) =>
        isEmpty(value) || /^\d{5}-?\d{3}$/.test(String(value)) ? true : 'Use o formato 00000-000.',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'lat',
          type: 'number',
          label: 'Latitude',
          min: -90,
          max: 90,
          admin: {
            description:
              'Opcional. Para acertar o pino do mapa: no Google Maps, clique com o botão direito no portão da chácara e copie os números.',
          },
        },
        {
          name: 'lng',
          type: 'number',
          label: 'Longitude',
          min: -180,
          max: 180,
          admin: {
            description:
              'Opcional. Para acertar o pino do mapa: no Google Maps, clique com o botão direito no portão da chácara e copie os números.',
          },
        },
      ],
    },
    {
      name: 'whatsapp',
      type: 'text',
      required: true,
      label: 'WhatsApp',
      admin: { description: 'Só números, com 55 e DDD (ex.: 5561999889772).' },
      validate: (value: unknown) =>
        /^55\d{10,11}$/.test(String(value ?? '')) ? true : 'Use só números, com 55 e DDD (ex.: 5561999889772).',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Telefone (exibição)',
      admin: { description: 'Como aparece no site (ex.: (61) 99988-9772).' },
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      label: 'E-mail',
    },
    {
      name: 'avisoNovoCadastroEmail',
      type: 'email',
      label: 'E-mail que recebe aviso de novo cadastro',
      // Contact is public-read: this address must never leave the panel (field-level, staff only)
      access: staffOnlyField,
      admin: {
        description:
          'A cada conta nova criada pelo site (/cadastro), a equipe recebe um aviso neste e-mail. Se ficar vazio, o aviso vai para o e-mail de envio do site (suporte@swingbrasilia.com.br).',
      },
    },
    {
      name: 'instagram',
      type: 'text',
      label: 'Instagram',
      admin: {
        description: 'Opcional. Só o nome do perfil, sem @. Se ficar vazio, o Instagram não aparece no site.',
      },
      validate: (value: unknown) =>
        isEmpty(value) || /^[A-Za-z0-9._]{1,30}$/.test(String(value))
          ? true
          : 'Use só o nome do perfil, sem @ e sem espaços (letras, números, ponto e _).',
    },
    {
      name: 'hours',
      type: 'textarea',
      label: 'Horário',
      admin: { description: 'Opcional (ex.: Abrimos às 22h e seguimos até por volta das 5h).' },
    },
  ],
}

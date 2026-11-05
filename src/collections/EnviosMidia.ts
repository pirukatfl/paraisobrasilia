import type { CollectionBeforeDeleteHook, CollectionConfig } from 'payload'

import { isStaff } from '../access/roles'

/** Deleting a submission deletes its files too (each one removes its own file from the private disk). */
// (before the delete: the file rows point to the submission and cannot be left without it)
const deleteFiles: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.delete({
    collection: 'envios-midia-arquivos',
    where: { envio: { equals: id } },
    overrideAccess: true,
    req,
  })
}

/**
 * Photos and videos sent by anyone through /enviar-fotos-e-videos (client decision 2026-11-01).
 * Nothing here is ever public: read, create, update and delete are staff only, so neither the REST API
 * nor the contact (e-mail/WhatsApp) can be read without a staff session. The visitor form creates rows
 * with the Local API (overrideAccess) after its own validation.
 * Approving does NOT publish anything: staff use the files to build the galleries.
 */
export const EnviosMidia: CollectionConfig = {
  slug: 'envios-midia',
  labels: { singular: 'Envio de fotos e vídeos', plural: 'Fotos e vídeos enviados' },
  admin: {
    group: 'Envios do público',
    useAsTitle: 'apelido',
    defaultColumns: ['apelido', 'status', 'promocao', 'contato', 'createdAt'],
    listSearchableFields: ['apelido', 'contato'],
    description:
      'Fotos e vídeos que o público mandou pelo site. Nada aparece no site sozinho: veja os arquivos aqui, baixe o que for usar e marque o envio como aprovado ou recusado.',
  },
  access: {
    read: isStaff,
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  hooks: { beforeDelete: [deleteFiles] },
  fields: [
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'novo',
      index: true,
      label: 'Situação',
      options: [
        { label: 'Novo', value: 'novo' },
        { label: 'Aprovado', value: 'aprovado' },
        { label: 'Recusado', value: 'recusado' },
      ],
      admin: { position: 'sidebar', description: 'Aprovar não publica nada: serve só para a equipe se organizar.' },
    },
    { name: 'apelido', type: 'text', required: true, label: 'Apelido' },
    {
      name: 'contato',
      type: 'text',
      required: true,
      label: 'Contato (e-mail ou WhatsApp)',
      admin: { description: 'Só a equipe vê.' },
    },
    { name: 'mensagem', type: 'textarea', label: 'Mensagem' },
    {
      name: 'promocao',
      type: 'text',
      index: true,
      label: 'Promoção',
      admin: {
        readOnly: true,
        description:
          'Preenchido pelo site quando a pessoa enviou pela promoção da página inicial: é o título da promoção no momento do envio. Em branco: envio comum. Use o filtro da lista para ver só quem participou.',
      },
    },
    {
      name: 'dataFesta',
      type: 'text',
      label: 'Festa / data que pretende ir',
      admin: {
        readOnly: true,
        // The form no longer asks for it; only older promotion submissions have it
        condition: (data) => Boolean(data?.dataFesta),
        description: 'Preenchido só em envios antigos da promoção: o formulário não pergunta mais.',
      },
    },
    {
      name: 'consentAt',
      type: 'date',
      label: 'Autorização de uso de imagem registrada em',
      admin: {
        readOnly: true,
        date: { pickerAppearance: 'dayAndTime', displayFormat: 'dd/MM/yyyy HH:mm' },
        description: 'Data e hora em que a pessoa confirmou ter 18 anos e autorizar o uso das imagens.',
      },
    },
    {
      name: 'observacao',
      type: 'textarea',
      label: 'Observação da equipe',
      admin: { description: 'Anotação interna (ex.: "usar na galeria de dezembro").' },
    },
    {
      name: 'arquivos',
      type: 'join',
      collection: 'envios-midia-arquivos',
      on: 'envio',
      label: 'Arquivos',
      admin: { description: 'Clique em um arquivo para ver a prévia e baixar o original.', defaultColumns: ['filename', 'kind', 'createdAt'] },
    },
  ],
}

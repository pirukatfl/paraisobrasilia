import { ValidationError, type CollectionBeforeValidateHook, type CollectionConfig } from 'payload'

import { isStaff, staffOrPublished } from '../access/roles'
import { imageAuthorization } from '../fields/imageAuthorization'
import { withRequestState } from '../lib/assinantes/context'
import { redactContacts } from '../lib/classisex/redact'
import { SLUG_MAX, SLUG_RE, slugify } from '../lib/contos/excerpt'
import { uniqueSlug } from '../lib/gallery/model-slug'
import { revalidateModels, revalidateModelsAfterDelete } from '../lib/gallery/revalidate'

export const MAX_MODEL_PHOTOS = 30
export const MAX_MODEL_VIDEOS = 3

export const MODEL_MESSAGES = {
  maxPhotos: 'Cada modelo pode ter no máximo 30 fotos.',
  minPhotos: 'Envie pelo menos 1 foto.',
  maxVideos: 'Cada modelo pode ter no máximo 3 vídeos.',
  slugInvalid: 'Use só letras minúsculas, números e hífens.',
  slugTaken: 'Já existe uma modelo com este endereço.',
  contact: 'Tire telefone, WhatsApp, e-mail, @ e links: esta página é aberta ao público.',
} as const

const noContact = (value: unknown) =>
  typeof value === 'string' && redactContacts(value).removed > 0 ? MODEL_MESSAGES.contact : true

const fail = (req: Parameters<CollectionBeforeValidateHook>[0]['req'], path: string, message: string): never => {
  throw new ValidationError({ collection: 'models', errors: [{ path, message }], req }, req.t)
}

/** Name/slug hygiene, slug created from the name (suffixed when taken) and pt slug errors. */
const prepareModel: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data
  if (typeof data.name === 'string') data.name = data.name.replace(/\s+/g, ' ').trim()
  if (typeof data.slug === 'string') data.slug = data.slug.trim()
  const others = originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []
  const find = (slug: Record<string, string>, limit: number) =>
    withRequestState(req, () =>
      req.payload.find({
        collection: 'models',
        where: { and: [{ slug }, ...others] },
        limit,
        depth: 0,
        pagination: false,
        overrideAccess: true,
        draft: true,
        req,
      }),
    )

  const typed = typeof data.slug === 'string' ? data.slug : ''
  if (typed) {
    if (typed.length > SLUG_MAX || !SLUG_RE.test(typed)) fail(req, 'slug', MODEL_MESSAGES.slugInvalid)
    if ((await find({ equals: typed }, 1)).docs.length) fail(req, 'slug', MODEL_MESSAGES.slugTaken)
    return data
  }

  const current = data.slug ?? originalDoc?.slug
  const name = typeof data.name === 'string' ? data.name : originalDoc?.name
  if (!current && typeof name === 'string' && name) {
    const base = slugify(name).slice(0, SLUG_MAX - 6)
    const { docs } = await find({ like: base }, 0)
    data.slug = uniqueSlug(base, new Set(docs.map((d) => d.slug).filter((v): v is string => !!v)))
  }
  return data
}

/**
 * House models (MIDIA-02, MIDIA-06/07, G-01..G-06): artistic name, short description and 1–30 photos,
 * one public page per model, no contact. Videos are off for now (client, 2026-10-23).
 * Image authorization is recommended, never required to publish (D-09).
 */
export const Models: CollectionConfig = {
  slug: 'models',
  labels: { singular: 'Modelo', plural: 'Modelos' },
  admin: {
    group: 'Site',
    useAsTitle: 'name',
    defaultColumns: ['name', 'slug', 'photos', 'imageAuthorization.date', '_status'],
    listSearchableFields: ['name', 'slug'],
    description:
      'Nome artístico, descrição curta e de 1 a 30 fotos (a primeira é a capa). Sem nudez explícita e sem contato: esta galeria é aberta ao público.',
  },
  versions: { drafts: true, maxPerDoc: 20 },
  access: {
    // T-02-10: visitors see published models only
    read: staffOrPublished,
    // T-06.1-01: drafts and version history stay with the staff
    readVersions: isStaff,
    // T-02-11: writes are staff-only
    create: isStaff,
    update: isStaff,
    delete: isStaff,
  },
  defaultSort: 'order',
  hooks: {
    beforeValidate: [prepareModel],
    afterChange: [revalidateModels],
    afterDelete: [revalidateModelsAfterDelete],
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'Nome artístico',
      validate: (value: unknown, { data }: { data?: { _status?: string } }) => {
        if (typeof value !== 'string' || !value.trim()) return data?._status === 'published' ? 'Informe o nome artístico.' : true
        return noContact(value)
      },
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      maxLength: SLUG_MAX,
      label: 'Endereço',
      admin: {
        position: 'sidebar',
        description:
          'Endereço da página: /modelos/…  Se ficar vazio, é criado a partir do nome. Mudar o endereço quebra links já compartilhados.',
      },
      validate: (value: unknown, { data }: { data?: { _status?: string } }) => {
        if (!value && data?._status !== 'published') return true
        return typeof value === 'string' && value.length <= SLUG_MAX && SLUG_RE.test(value)
          ? true
          : MODEL_MESSAGES.slugInvalid
      },
    },
    {
      name: 'description',
      type: 'textarea',
      maxLength: 300,
      label: 'Descrição curta',
      admin: {
        description:
          'Até 300 caracteres. Aparece na página da modelo e nas prévias do Google e do WhatsApp. Sem telefone, WhatsApp, e-mail, @ ou links.',
      },
      validate: (value: unknown) => {
        if (typeof value === 'string' && value.length > 300) return 'Use no máximo 300 caracteres.'
        return noContact(value)
      },
    },
    {
      name: 'photos',
      type: 'array',
      label: 'Fotos',
      labels: { singular: 'Foto', plural: 'Fotos' },
      minRows: 1,
      maxRows: 30, // MAX_MODEL_PHOTOS
      admin: { description: 'De 1 a 30 fotos. A primeira é a capa: arraste para mudar a ordem.' },
      validate: (value: unknown) => {
        const count = Array.isArray(value) ? value.length : 0
        if (count > MAX_MODEL_PHOTOS) return MODEL_MESSAGES.maxPhotos
        if (count < 1) return MODEL_MESSAGES.minPhotos
        return true
      },
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
          label: 'Foto',
        },
      ],
    },
    {
      name: 'videos',
      type: 'array',
      label: 'Vídeos',
      labels: { singular: 'Vídeo', plural: 'Vídeos' },
      maxRows: 3, // MAX_MODEL_VIDEOS
      // Temporarily off per client (2026-10-23): hidden in the panel and not shown on the site
      // (MODEL_VIDEOS_ENABLED in src/lib/gallery/flags.ts). Field and columns kept so stored data survives.
      admin: { hidden: true, description: 'Até 3 vídeos (MP4). Envie antes em Arquivos → Vídeos, com a imagem de capa.' },
      validate: (value: unknown) =>
        Array.isArray(value) && value.length > MAX_MODEL_VIDEOS ? MODEL_MESSAGES.maxVideos : true,
      fields: [
        {
          name: 'video',
          type: 'upload',
          relationTo: 'videos',
          required: true,
          label: 'Vídeo',
        },
      ],
    },
    {
      name: 'order',
      type: 'number',
      defaultValue: 0,
      label: 'Ordem',
      admin: { description: 'Números menores aparecem primeiro.', position: 'sidebar' },
    },
    imageAuthorization,
  ],
}

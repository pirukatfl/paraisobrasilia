import { definirArea } from '../tipos'

export const contato = definirArea({
  slug: 'textos-contato',
  rotulo: 'Contato',
  descricao: 'Textos fixos da página de contato (endereço, telefone e horário são editados em Contato e endereço).',
  campos: {
    // Topo
    titulo: {
      rotulo: 'Título da página',
      padrao: 'Contato e como chegar',
      secao: 'Topo da página',
      ajuda: 'Também é o título que aparece no Google (lá, sem formatação).',
    },
    intro: {
      bloco: true,
      rotulo: 'Texto de abertura',
      padrao: 'Estamos no Núcleo Rural Lago Oeste, em Sobradinho. Fale com a gente pelo WhatsApp para reservas e dúvidas.',
      secao: 'Topo da página',
    },
    descricaoGoogle: {
      bloco: true,
      soTexto: true,
      rotulo: 'Descrição no Google',
      padrao: 'Endereço, mapa e WhatsApp do Paraíso Brasília, no Núcleo Rural Lago Oeste, Sobradinho – DF.',
      secao: 'Topo da página',
    },

    // Cartão de endereço
    cep: {
      rotulo: 'CEP',
      padrao: 'CEP {cep}',
      secao: 'Cartão de endereço',
      ajuda: 'Use {cep} para o número do CEP.',
    },
    botaoGoogleMaps: { rotulo: 'Botão: Google Maps', padrao: 'Como chegar — Google Maps', secao: 'Cartão de endereço' },
    botaoWaze: { rotulo: 'Botão: Waze', padrao: 'Como chegar — Waze', secao: 'Cartão de endereço' },
    botaoWhatsapp: { rotulo: 'Botão: WhatsApp', padrao: 'Chamar no WhatsApp', secao: 'Cartão de endereço' },
    instagram: {
      rotulo: 'Link do Instagram',
      padrao: 'Instagram @{usuario}',
      secao: 'Cartão de endereço',
      ajuda: 'Use {usuario} para o nome de usuário do Instagram.',
    },

    // Mapa
    mapaAmpliado: { rotulo: 'Link do mapa ampliado', padrao: 'Ver mapa ampliado', secao: 'Mapa' },
  },
})

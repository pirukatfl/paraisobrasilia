import { definirArea } from '../tipos'

export const festas = definirArea({
  slug: 'textos-festas',
  rotulo: 'Festas',
  descricao: 'Textos fixos da página de cada festa (o conteúdo da festa em si é editado em Festas).',
  campos: {
    // Topo
    voltar: { rotulo: 'Link para voltar', padrao: '← Ver todas as festas', secao: 'Topo da festa' },
    horario: {
      rotulo: 'Frase do horário',
      padrao: 'A partir das {hora}',
      secao: 'Topo da festa',
      ajuda: 'Use {hora} para o horário de início da festa.',
    },
    jaAconteceu: { rotulo: 'Aviso de festa que já passou', padrao: 'Esta festa já aconteceu', secao: 'Topo da festa' },

    // Seções
    tituloValores: { rotulo: 'Título: valores', padrao: 'Valores', secao: 'Seções da festa' },
    tituloDressCode: { rotulo: 'Título: dress code', padrao: 'Dress code', secao: 'Seções da festa' },
    tituloAtracoes: { rotulo: 'Título: atrações', padrao: 'Atrações', secao: 'Seções da festa' },
    tituloSobre: { rotulo: 'Título: sobre a festa', padrao: 'Sobre a festa', secao: 'Seções da festa' },
    atracaoDj: { rotulo: 'Tipo de atração: DJ', padrao: 'DJ', secao: 'Tipos de atração' },
    atracaoShow: { rotulo: 'Tipo de atração: show', padrao: 'Show', secao: 'Tipos de atração' },
    atracaoModelo: { rotulo: 'Tipo de atração: modelo', padrao: 'Modelo', secao: 'Tipos de atração' },
    atracaoOutro: { rotulo: 'Tipo de atração: outro', padrao: 'Outro', secao: 'Tipos de atração' },

    // Rodapé da festa
    botaoProximas: {
      rotulo: 'Botão no fim de uma festa passada',
      padrao: 'Ver próximas festas',
      secao: 'Fim da página',
    },
  },
})

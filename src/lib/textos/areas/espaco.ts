import { definirArea } from '../tipos'

export const espaco = definirArea({
  slug: 'textos-espaco',
  rotulo: 'Espaço',
  descricao: 'Textos fixos da página do espaço (as fotos são editadas em Galeria do espaço).',
  campos: {
    // Topo
    chamadaTopo: { rotulo: 'Frase pequena acima do título', padrao: 'Nosso espaço', secao: 'Topo da página' },
    titulo: {
      rotulo: 'Título da página',
      padrao: 'Conheça o Paraíso',
      secao: 'Topo da página',
      ajuda: 'Também é o título que aparece no Google.',
    },
    intro: {
      formatado: true,
      rotulo: 'Texto de abertura',
      padrao: 'Conheça os ambientes do Paraíso: pista, bar, jardim e piscina numa chácara reservada no Lago Oeste.',
      secao: 'Topo da página',
      ajuda: 'Também é a descrição que aparece no Google.',
    },

    // Sem fotos
    vazioTitulo: { rotulo: 'Título quando não há fotos', padrao: 'Fotos do espaço em breve', secao: 'Quando não há fotos' },
    vazioTexto: {
      formatado: true,
      rotulo: 'Texto quando não há fotos',
      padrao: 'Estamos preparando novas fotos e vídeos dos ambientes. Enquanto isso, venha conhecer pessoalmente.',
      secao: 'Quando não há fotos',
    },
    vazioBotaoComoChegar: { rotulo: 'Botão verde', padrao: 'Como chegar', secao: 'Quando não há fotos' },
    vazioBotaoFestas: { rotulo: 'Botão secundário', padrao: 'Ver próximas festas', secao: 'Quando não há fotos' },
  },
})

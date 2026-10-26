import { definirArea } from '../tipos'

export const modelos = definirArea({
  slug: 'textos-modelos',
  rotulo: 'Profissionais e amadoras',
  descricao: 'Textos fixos da lista de modelos e da página de cada modelo (as modelos em si são editadas em Modelos).',
  campos: {
    // Lista
    chamadaTopo: { rotulo: 'Frase pequena acima do título', padrao: 'Modelos da casa', secao: 'Lista de modelos' },
    titulo: {
      rotulo: 'Título da página',
      padrao: 'Modelos',
      secao: 'Lista de modelos',
      ajuda: 'Também é o título que aparece no Google.',
    },
    intro: {
      rotulo: 'Texto de abertura',
      padrao: 'As modelos que animam as noites do Paraíso.',
      secao: 'Lista de modelos',
      ajuda: 'Também é a descrição que aparece no Google.',
    },

    // Sem modelos
    vazioTitulo: {
      rotulo: 'Título quando não há modelos',
      padrao: 'Em breve, as modelos da casa aqui.',
      secao: 'Quando não há modelos',
    },
    vazioTexto: {
      rotulo: 'Texto quando não há modelos',
      padrao: 'Estamos preparando esta galeria. Enquanto isso, veja as próximas festas ou conheça o espaço.',
      secao: 'Quando não há modelos',
    },
    vazioBotaoFestas: { rotulo: 'Botão verde', padrao: 'Ver as festas', secao: 'Quando não há modelos' },
    vazioBotaoEspaco: { rotulo: 'Botão secundário', padrao: 'Conhecer o espaço', secao: 'Quando não há modelos' },

    // Contagens
    umaFoto: { rotulo: 'Contagem: uma foto', padrao: '1 foto', secao: 'Contagem de fotos e vídeos' },
    variasFotos: {
      rotulo: 'Contagem: várias fotos',
      padrao: '{n} fotos',
      secao: 'Contagem de fotos e vídeos',
      ajuda: 'Use {n} para o número de fotos.',
    },
    umVideo: { rotulo: 'Contagem: um vídeo', padrao: '1 vídeo', secao: 'Contagem de fotos e vídeos' },
    variosVideos: {
      rotulo: 'Contagem: vários vídeos',
      padrao: '{n} vídeos',
      secao: 'Contagem de fotos e vídeos',
      ajuda: 'Use {n} para o número de vídeos.',
    },

    // Página da modelo
    linkLista: { rotulo: 'Link acima do nome', padrao: 'Modelos', secao: 'Página de cada modelo' },
    descricaoReserva: {
      rotulo: 'Descrição no Google (modelo sem descrição)',
      padrao: '{nome}, modelo do Paraíso Brasília: fotos e vídeos.',
      secao: 'Página de cada modelo',
      ajuda: 'Use {nome} para o nome da modelo. Só vale quando a modelo não tem descrição própria.',
    },
    linkVerTodas: { rotulo: 'Link no fim da página', padrao: 'Ver todas as modelos', secao: 'Página de cada modelo' },
  },
})

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
      ajuda: 'Também é o título que aparece no Google (lá, sem formatação).',
    },
    intro: {
      rotulo: 'Texto de abertura',
      padrao: 'As modelos que animam as noites do Paraíso.',
      secao: 'Lista de modelos',
      ajuda: 'Também é a descrição que aparece no Google (lá, sem formatação).',
    },

    // Submenus da Galeria (/modelos?tipo=...)
    tituloProfissionais: {
      rotulo: 'Título: só profissionais',
      padrao: 'Profissionais',
      secao: 'Galeria: Profissionais',
      ajuda: 'Título da página quando o visitante abre Galeria → Profissionais. Também aparece no Google (lá, sem formatação).',
    },
    introProfissionais: {
      rotulo: 'Texto de abertura: só profissionais',
      padrao: 'As modelos profissionais que animam as noites do Paraíso.',
      secao: 'Galeria: Profissionais',
      ajuda: 'Também é a descrição que aparece no Google (lá, sem formatação).',
    },
    tituloAmadoras: {
      rotulo: 'Título: só amadoras',
      padrao: 'Amadoras',
      secao: 'Galeria: Amadoras',
      ajuda: 'Título da página quando o visitante abre Galeria → Amadoras. Também aparece no Google (lá, sem formatação).',
    },
    introAmadoras: {
      rotulo: 'Texto de abertura: só amadoras',
      padrao: 'As amadoras que frequentam e encantam as noites do Paraíso.',
      secao: 'Galeria: Amadoras',
      ajuda: 'Também é a descrição que aparece no Google (lá, sem formatação).',
    },

    // Página Vídeos amadores (/videos-amadores)
    videosTitulo: {
      rotulo: 'Título da página',
      padrao: 'Vídeos amadores',
      secao: 'Vídeos amadores',
      ajuda: 'Também é o título que aparece no Google (lá, sem formatação).',
    },
    videosIntro: {
      rotulo: 'Texto de abertura',
      padrao: 'Vídeos amadores aprovados pela equipe. Só assinantes dão o play.',
      secao: 'Vídeos amadores',
      ajuda: 'Também é a descrição que aparece no Google (lá, sem formatação).',
    },
    videosConviteTitulo: { rotulo: 'Aviso para quem não é assinante: título', padrao: 'Só assinantes dão o play', secao: 'Vídeos amadores' },
    videosConviteTexto: {
      rotulo: 'Aviso para visitantes: texto',
      padrao: 'Assine para assistir aos vídeos amadores. Já é assinante? Entre na sua conta.',
      secao: 'Vídeos amadores',
    },
    videosConviteTextoLogado: {
      rotulo: 'Aviso para conta sem assinatura ativa: texto',
      padrao: 'A sua conta não tem assinatura ativa. Assine ou renove para assistir aos vídeos amadores.',
      secao: 'Vídeos amadores',
    },
    videosConviteAssine: { rotulo: 'Botão Assine já', padrao: 'Assine já', secao: 'Vídeos amadores' },
    videosConviteEntrar: { rotulo: 'Botão Entrar', padrao: 'Entrar', secao: 'Vídeos amadores' },
    videosVazioTitulo: { rotulo: 'Título quando não há vídeos', padrao: 'Ainda não há vídeos por aqui.', secao: 'Vídeos amadores' },
    videosVazioTexto: {
      bloco: true,
      rotulo: 'Texto quando não há vídeos',
      padrao: 'Novos vídeos amadores aparecem aqui assim que a equipe aprova.',
      secao: 'Vídeos amadores',
    },
    videosVazioBotao: { rotulo: 'Botão quando não há vídeos', padrao: 'Enviar o meu vídeo', secao: 'Vídeos amadores' },

    // Sem modelos
    vazioTitulo: {
      rotulo: 'Título quando não há modelos',
      padrao: 'Em breve, as modelos da casa aqui.',
      secao: 'Quando não há modelos',
    },
    vazioTexto: {
      bloco: true,
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
      soTexto: true,
      rotulo: 'Descrição no Google (modelo sem descrição)',
      padrao: '{nome}, modelo do Paraíso Brasília: fotos e vídeos.',
      secao: 'Página de cada modelo',
      ajuda: 'Use {nome} para o nome da modelo. Só vale quando a modelo não tem descrição própria.',
    },
    linkVerTodas: { rotulo: 'Link no fim da página', padrao: 'Ver todas as modelos', secao: 'Página de cada modelo' },
  },
})

import { definirArea } from '../tipos'

export const inicio = definirArea({
  slug: 'textos-inicio',
  rotulo: 'Página inicial',
  descricao: 'Textos fixos da página inicial: próximas festas, espaço, quem somos, dicas e como chegar.',
  campos: {
    // Topo
    chamadaTopo: {
      rotulo: 'Frase pequena acima do título',
      padrao: 'Casa de festas liberais em Brasília',
      secao: 'Topo da página',
    },
    tituloProximasFestas: {
      rotulo: 'Título da lista de próximas festas',
      padrao: 'Próximas festas',
      secao: 'Topo da página',
    },
    tituloSemFestas: {
      rotulo: 'Título grande quando não há festas',
      padrao: 'Paraíso Brasília',
      secao: 'Topo da página',
      ajuda: 'Aparece no lugar da lista de festas quando nenhuma festa está agendada.',
    },
    semFestasTitulo: {
      rotulo: 'Aviso quando não há festas',
      padrao: 'Nenhuma festa agendada no momento',
      secao: 'Topo da página',
    },
    semFestasTexto: {
      rotulo: 'Texto quando não há festas',
      padrao: 'A próxima programação será publicada aqui em breve. Volte nos próximos dias.',
      secao: 'Topo da página',
    },

    // Espaço
    espacoTitulo: { rotulo: 'Título da seção do espaço', padrao: 'Conheça o espaço', secao: 'Seção do espaço' },
    espacoBotao: { rotulo: 'Botão da galeria', padrao: 'Ver galeria completa', secao: 'Seção do espaço' },
    espacoCarrossel: {
      soTexto: true,
      rotulo: 'Nome do carrossel (leitores de tela)',
      padrao: 'Fotos do espaço',
      secao: 'Seção do espaço',
      ajuda: 'Não aparece na tela: é lido por leitores de tela.',
    },
    espacoAnterior: {
      soTexto: true,
      rotulo: 'Seta: foto anterior (leitores de tela)',
      padrao: 'Foto anterior',
      secao: 'Seção do espaço',
    },
    espacoProxima: {
      soTexto: true,
      rotulo: 'Seta: próxima foto (leitores de tela)',
      padrao: 'Próxima foto',
      secao: 'Seção do espaço',
    },
    espacoIrPara: {
      soTexto: true,
      rotulo: 'Pontinho: ir para a foto (leitores de tela)',
      padrao: 'Ir para a foto {n} de {total}',
      secao: 'Seção do espaço',
      ajuda: 'Use {n} para o número da foto e {total} para a quantidade de fotos.',
    },
    espacoPausar: {
      soTexto: true,
      rotulo: 'Botão: pausar a troca automática (leitores de tela)',
      padrao: 'Pausar a troca automática das fotos',
      secao: 'Seção do espaço',
    },
    espacoRetomar: {
      soTexto: true,
      rotulo: 'Botão: retomar a troca automática (leitores de tela)',
      padrao: 'Retomar a troca automática das fotos',
      secao: 'Seção do espaço',
    },

    // Quem somos
    quemSomosTitulo: { rotulo: 'Título da seção Quem somos', padrao: 'Quem somos', secao: 'Seção Quem somos' },
    quemSomosTextoReserva: {
      rotulo: 'Texto de reserva de Quem somos',
      padrao: 'Uma casa de festas liberais com discrição, respeito e liberdade. Conheça o Paraíso.',
      secao: 'Seção Quem somos',
      ajuda: 'Só aparece se a página Quem somos estiver sem texto de abertura.',
    },
    quemSomosBotao: { rotulo: 'Botão da seção', padrao: 'Conheça a casa', secao: 'Seção Quem somos' },

    // ClassiSex, Contos e Dicas Hot (3 quadros lado a lado)
    classisexTitulo: { rotulo: 'Título do quadro ClassiSex', padrao: 'ClassiSex', secao: 'Quadros ClassiSex, Contos e Dicas Hot' },
    classisexTexto: {
      bloco: true,
      rotulo: 'Texto do quadro ClassiSex',
      padrao: 'Anúncios de casais, mulheres, homens e trans do Paraíso. Leia os recados e anuncie também.',
      secao: 'Quadros ClassiSex, Contos e Dicas Hot',
    },
    classisexBotao: { rotulo: 'Botão do quadro ClassiSex', padrao: 'Ver o ClassiSex', secao: 'Quadros ClassiSex, Contos e Dicas Hot' },
    contosTitulo: { rotulo: 'Título do quadro Contos', padrao: 'Contos', secao: 'Quadros ClassiSex, Contos e Dicas Hot' },
    contosBotao: { rotulo: 'Botão do quadro Contos', padrao: 'Ler todos os contos', secao: 'Quadros ClassiSex, Contos e Dicas Hot' },

    // Dicas Hot
    dicasTitulo: { rotulo: 'Título da seção de dicas', padrao: 'Dicas Hot', secao: 'Quadros ClassiSex, Contos e Dicas Hot' },
    dicasBotao: { rotulo: 'Botão das dicas', padrao: 'Ver todas as Dicas Hot', secao: 'Quadros ClassiSex, Contos e Dicas Hot' },

    // Pop-up da promoção (o texto da promoção fica em Configurações → Promoção)
    promocaoBotaoContos: { rotulo: 'Pop-up: botão para enviar contos', padrao: 'Enviar contos', secao: 'Pop-up da promoção' },
    promocaoBotaoMidia: {
      rotulo: 'Pop-up: botão para enviar fotos e vídeos',
      padrao: 'Enviar fotos e vídeos',
      secao: 'Pop-up da promoção',
    },
    promocaoFechar: {
      soTexto: true,
      rotulo: 'Pop-up: botão de fechar (leitores de tela)',
      padrao: 'Fechar a promoção',
      secao: 'Pop-up da promoção',
    },

    // Como chegar
    comoChegarTitulo: { rotulo: 'Título da seção Como chegar', padrao: 'Como chegar', secao: 'Seção Como chegar' },
    comoChegarBotao: { rotulo: 'Botão para a página de contato', padrao: 'Como chegar', secao: 'Seção Como chegar' },
    comoChegarWhatsapp: {
      rotulo: 'Link do WhatsApp',
      padrao: 'Chamar no WhatsApp',
      secao: 'Seção Como chegar',
    },
  },
})

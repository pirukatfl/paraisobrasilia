import { definirArea } from '../tipos'

export const classisex = definirArea({
  slug: 'textos-classisex',
  rotulo: 'ClassiSex',
  descricao:
    'Anúncios abertos ao público, anúncio sem conta, quadro e anúncio completo da área do assinante, filtros, cartões e denúncia.',
  campos: {
    // Página pública /classisex
    publicoGoogleTitulo: { rotulo: 'Título no Google (ClassiSex aberto)', padrao: 'ClassiSex', secao: 'ClassiSex aberto (/classisex)' },
    publicoGoogleDescricao: {
      formatado: false,
      rotulo: 'Descrição no Google (ClassiSex aberto)',
      padrao:
        'Anúncios de casais, mulheres, homens e trans do Paraíso Brasília. Leia os anúncios; assine para ver os contatos e as fotos.',
      secao: 'ClassiSex aberto (/classisex)',
    },
    publicoTopo: { rotulo: 'Linha pequena acima do título', padrao: 'Anúncios', secao: 'ClassiSex aberto (/classisex)' },
    publicoTitulo: { rotulo: 'Título da página', padrao: 'ClassiSex', secao: 'ClassiSex aberto (/classisex)' },
    publicoIntro: {
      formatado: true,
      rotulo: 'Texto de abertura',
      padrao:
        'Anúncios do Paraíso: qualquer pessoa pode anunciar, com ou sem conta. Leia os recados na íntegra; os contatos (WhatsApp, Telegram, telefone, e-mail e links), as demais fotos e os vídeos ficam para assinantes.',
      secao: 'ClassiSex aberto (/classisex)',
    },
    publicoBotaoAnunciar: { rotulo: 'Botão Anunciar', padrao: 'Anunciar', secao: 'ClassiSex aberto (/classisex)' },
    publicoLinkAssinante: {
      rotulo: 'Link para quem já é assinante',
      padrao: 'Já é assinante? Ver anúncios completos',
      secao: 'ClassiSex aberto (/classisex)',
    },
    publicoAssineTitulo: {
      rotulo: 'Chamada para assinar: título',
      padrao: 'Assine para ver o contato, todas as fotos e os vídeos',
      secao: 'ClassiSex aberto (/classisex)',
    },
    publicoAssineTexto: {
      formatado: true,
      rotulo: 'Chamada para assinar: texto',
      padrao: 'Assinantes veem os contatos, as fotos e os vídeos, mandam recados privados e anunciam também.',
      secao: 'ClassiSex aberto (/classisex)',
    },

    // Filtros
    filtroEuSou: { rotulo: 'Filtro: Eu sou', padrao: 'Eu sou', secao: 'Filtros dos anúncios' },
    filtroTodos: { rotulo: 'Filtro: opção Todos', padrao: 'Todos', secao: 'Filtros dos anúncios' },
    filtroCidade: { rotulo: 'Filtro: Cidade', padrao: 'Cidade', secao: 'Filtros dos anúncios' },
    filtroBotao: { rotulo: 'Filtro: botão Filtrar', padrao: 'Filtrar', secao: 'Filtros dos anúncios' },
    filtroLimpar: { rotulo: 'Filtro: Limpar filtros', padrao: 'Limpar filtros', secao: 'Filtros dos anúncios' },

    // Quando não há anúncios
    vazioFiltroTitulo: { rotulo: 'Nada encontrado: título', padrao: 'Nenhum anúncio encontrado.', secao: 'Quando não há anúncios' },
    vazioFiltroPublicoTexto: {
      rotulo: 'Nada encontrado: texto (área aberta)',
      padrao: 'Tente outra opção em Eu sou.',
      secao: 'Quando não há anúncios',
    },
    vazioFiltroMembrosTexto: {
      rotulo: 'Nada encontrado: texto (área do assinante)',
      padrao: 'Tente outra opção em Eu sou ou outra cidade.',
      secao: 'Quando não há anúncios',
    },
    vazioVerTodos: { rotulo: 'Nada encontrado: botão', padrao: 'Ver todos os anúncios', secao: 'Quando não há anúncios' },
    vazioTitulo: { rotulo: 'Sem anúncios publicados: título', padrao: 'Ainda não há anúncios publicados.', secao: 'Quando não há anúncios' },
    vazioPublicoTexto: {
      rotulo: 'Sem anúncios publicados: texto (área aberta)',
      padrao: 'Assinantes publicam anúncios com fotos, vídeo e contato. Assine para anunciar e ver tudo.',
      secao: 'Quando não há anúncios',
    },
    vazioPublicoBotao: { rotulo: 'Sem anúncios publicados: botão (área aberta)', padrao: 'Assine Já', secao: 'Quando não há anúncios' },
    vazioMembrosTexto: {
      rotulo: 'Sem anúncios publicados: texto (área do assinante)',
      padrao: 'Seja o primeiro: o seu anúncio aparece aqui depois que a equipe aprovar.',
      secao: 'Quando não há anúncios',
    },
    vazioMembrosBotao: {
      rotulo: 'Sem anúncios publicados: botão (área do assinante)',
      padrao: 'Novo anúncio',
      secao: 'Quando não há anúncios',
    },

    // Cartões dos anúncios
    cardSemFoto: { rotulo: 'Cartão: sem foto', padrao: 'Sem foto', secao: 'Cartões dos anúncios' },
    cardPublicoAssine: {
      rotulo: 'Cartão aberto: botão para assinar',
      padrao: 'Assine para ver o contato, todas as fotos e os vídeos',
      secao: 'Cartões dos anúncios',
    },
    cardEnviarRecado: { rotulo: 'Cartão aberto: botão Enviar recado', padrao: 'Enviar recado', secao: 'Cartões dos anúncios' },
    cardRecadosNota: {
      rotulo: 'Cartão aberto: nota sobre recados',
      padrao: 'Recados privados só entre assinantes.',
      secao: 'Cartões dos anúncios',
    },
    cardPublicadoEm: {
      rotulo: 'Cartão: data de publicação',
      padrao: 'Publicado em {data}',
      secao: 'Cartões dos anúncios',
      ajuda: 'Use {data} para a data.',
    },
    cardVerAnuncio: { rotulo: 'Cartão: botão Ver anúncio', padrao: 'Ver anúncio', secao: 'Cartões dos anúncios' },
    cardUmaFoto: { rotulo: 'Cartão: uma foto', padrao: '1 foto', secao: 'Cartões dos anúncios' },
    cardFotos: {
      rotulo: 'Cartão: várias fotos',
      padrao: '{n} fotos',
      secao: 'Cartões dos anúncios',
      ajuda: 'Use {n} para a quantidade.',
    },
    cardUmVideo: { rotulo: 'Cartão: um vídeo', padrao: '1 vídeo', secao: 'Cartões dos anúncios' },
    cardVideos: {
      rotulo: 'Cartão: vários vídeos',
      padrao: '{n} vídeos',
      secao: 'Cartões dos anúncios',
      ajuda: 'Use {n} para a quantidade.',
    },
    carregando: { rotulo: 'Lista: carregando mais', padrao: 'Carregando mais anúncios…', secao: 'Cartões dos anúncios' },
    carregarMais: { rotulo: 'Lista: botão Carregar mais', padrao: 'Carregar mais', secao: 'Cartões dos anúncios' },
    fimDaLista: { rotulo: 'Lista: fim dos anúncios', padrao: 'Você chegou ao fim dos anúncios.', secao: 'Cartões dos anúncios' },

    // Quadro do assinante
    membrosGoogleTitulo: { rotulo: 'Título no Google (quadro do assinante)', padrao: 'ClassiSex', secao: 'Quadro do assinante' },
    membrosTopo: { rotulo: 'Linha pequena acima do título', padrao: 'Área do assinante', secao: 'Quadro do assinante' },
    membrosTitulo: { rotulo: 'Título do quadro', padrao: 'ClassiSex', secao: 'Quadro do assinante' },
    membrosIntro: {
      rotulo: 'Texto de abertura',
      padrao: 'Anúncios publicados pelos assinantes do Paraíso. Os contatos aparecem ao abrir o anúncio.',
      secao: 'Quadro do assinante',
    },
    membrosDenunciaEnviada: {
      rotulo: 'Aviso depois de denunciar',
      padrao: 'Denúncia enviada. A equipe vai analisar.',
      secao: 'Quadro do assinante',
    },
    membrosPublicadosTitulo: {
      rotulo: 'Conta gratuita: título da lista',
      padrao: 'Anúncios publicados',
      secao: 'Quadro do assinante',
    },
    membrosGratisTexto: {
      formatado: true,
      rotulo: 'Conta gratuita: texto da lista',
      padrao: 'Você lê os recados na íntegra. Os contatos, as demais fotos e os vídeos aparecem para assinantes.',
      secao: 'Quadro do assinante',
    },

    // Anúncio completo
    anuncioGoogleTitulo: { rotulo: 'Título no Google (anúncio completo)', padrao: 'Anúncio do ClassiSex', secao: 'Anúncio completo' },
    anuncioTopo: { rotulo: 'Linha pequena acima do título', padrao: 'ClassiSex', secao: 'Anúncio completo' },
    anuncioPublicadoEm: {
      rotulo: 'Data de publicação',
      padrao: 'Publicado em {data}',
      secao: 'Anúncio completo',
      ajuda: 'Use {data} para a data.',
    },
    galeriaVideoUm: {
      rotulo: 'Legenda do vídeo (um só)',
      padrao: 'Vídeo · {duracao}',
      secao: 'Anúncio completo',
      ajuda: 'Use {duracao} para a duração.',
    },
    galeriaVideoVarios: {
      rotulo: 'Legenda do vídeo (vários)',
      padrao: 'Vídeo {n} · {duracao}',
      secao: 'Anúncio completo',
      ajuda: 'Use {n} para o número do vídeo e {duracao} para a duração.',
    },
    anuncioContato: { rotulo: 'Título dos contatos', padrao: 'Contato', secao: 'Anúncio completo' },
    contatoWhatsapp: { rotulo: 'Botão WhatsApp', padrao: 'WhatsApp', secao: 'Anúncio completo' },
    contatoEmail: { rotulo: 'Botão e-mail', padrao: 'E-mail', secao: 'Anúncio completo' },
    contatoLinksTitulo: { rotulo: 'Título dos links de outras plataformas', padrao: 'Outras plataformas', secao: 'Anúncio completo' },
    contatoObservacao: { rotulo: 'Título de como prefere o contato', padrao: 'Como prefere o contato', secao: 'Anúncio completo' },
    contatoTelegram: {
      rotulo: 'Botão Telegram',
      padrao: 'Telegram {contato}',
      secao: 'Anúncio completo',
      ajuda: 'Use {contato} para o usuário do Telegram.',
    },
    anuncioRecadoGratuito: {
      rotulo: 'Aviso: anunciante de conta gratuita não recebe recados',
      padrao: 'Este anúncio é de uma conta gratuita e não recebe recados. Use os contatos do anúncio.',
      secao: 'Anúncio completo',
    },
    anuncioVoltar: { rotulo: 'Link Voltar', padrao: 'Voltar para o ClassiSex', secao: 'Anúncio completo' },

    // Denúncia
    denunciarResumo: { rotulo: 'Denúncia: texto que abre o formulário', padrao: 'Denunciar este anúncio', secao: 'Denúncia' },
    denunciarMotivo: { rotulo: 'Denúncia: título dos motivos', padrao: 'Motivo', secao: 'Denúncia' },
    motivoContatoFalso: { rotulo: 'Motivo: contato falso', padrao: 'Contato falso', secao: 'Denúncia' },
    motivoGolpe: { rotulo: 'Motivo: golpe ou cobrança', padrao: 'Golpe ou cobrança', secao: 'Denúncia' },
    motivoOfensivo: { rotulo: 'Motivo: conteúdo ofensivo', padrao: 'Conteúdo ofensivo', secao: 'Denúncia' },
    motivoMenor: { rotulo: 'Motivo: menor de idade', padrao: 'Pessoa menor de idade', secao: 'Denúncia' },
    motivoSemAutorizacao: {
      rotulo: 'Motivo: sem autorização de imagem',
      padrao: 'Foto ou vídeo sem autorização',
      secao: 'Denúncia',
    },
    motivoOutro: { rotulo: 'Motivo: outro', padrao: 'Outro', secao: 'Denúncia' },
    denunciarDetalhes: { rotulo: 'Denúncia: campo de detalhes', padrao: 'Detalhes (opcional)', secao: 'Denúncia' },
    denunciarBotao: { rotulo: 'Denúncia: botão de envio', padrao: 'Enviar denúncia', secao: 'Denúncia' },

    // Anunciar sem conta
    anunciarGoogleTitulo: { rotulo: 'Título no Google (anunciar sem conta)', padrao: 'Anunciar no ClassiSex', secao: 'Anunciar sem conta' },
    anunciarTopo: { rotulo: 'Linha pequena acima do título', padrao: 'ClassiSex', secao: 'Anunciar sem conta' },
    anunciarTitulo: { rotulo: 'Título da página', padrao: 'Anunciar no ClassiSex', secao: 'Anunciar sem conta' },
    anunciarIntro: {
      formatado: true,
      rotulo: 'Texto de abertura',
      padrao:
        'Qualquer pessoa pode anunciar, sem cadastro. O anúncio aparece depois da análise da equipe: todo mundo vê o texto e a foto; o contato (WhatsApp, Telegram, e-mail e links) só os assinantes veem.',
      secao: 'Anunciar sem conta',
    },
    visitanteEmailRotulo: { rotulo: 'Campo e-mail', padrao: 'Seu e-mail (opcional)', secao: 'Anunciar sem conta' },
    visitanteEmailAjuda: {
      rotulo: 'Ajuda do e-mail',
      padrao: 'Opcional, para avisarmos quando o anúncio for publicado ou recusado. Só a equipe vê.',
      secao: 'Anunciar sem conta',
    },
    fotoRotulo: { rotulo: 'Foto: título do campo', padrao: 'Foto (opcional)', secao: 'Anunciar sem conta' },
    fotoAjuda: {
      formatado: true,
      rotulo: 'Foto: ajuda',
      padrao:
        '1 foto JPG, PNG ou WebP, até 15 MB, sem vídeo. No iPhone, a foto em HEIC é convertida para JPG ao escolher. Assinantes enviam até 10 fotos e 2 vídeos.',
      secao: 'Anunciar sem conta',
    },
    fotoEscolher: { rotulo: 'Foto: botão Escolher', padrao: 'Escolher foto', secao: 'Anunciar sem conta' },
    fotoTrocar: { rotulo: 'Foto: botão Trocar', padrao: 'Trocar foto', secao: 'Anunciar sem conta' },
    fotoTirar: { rotulo: 'Foto: botão Tirar', padrao: 'Tirar foto', secao: 'Anunciar sem conta' },
    visitanteTermosAntes: { rotulo: 'Termos: início da frase', padrao: 'Li e aceito os', secao: 'Anunciar sem conta' },
    visitanteTermosLink: { rotulo: 'Termos: link dos Termos de Uso', padrao: 'Termos de Uso', secao: 'Anunciar sem conta' },
    visitanteTermosE: { rotulo: 'Termos: palavra entre os links', padrao: 'e a', secao: 'Anunciar sem conta' },
    visitanteTermosPolitica: {
      rotulo: 'Termos: link da Política de Privacidade',
      padrao: 'Política de Privacidade',
      secao: 'Anunciar sem conta',
    },
    visitanteObrigatorio: { rotulo: 'Marca de campo obrigatório', padrao: '(obrigatório)', secao: 'Anunciar sem conta' },
    visitanteAvisoAntes: {
      rotulo: 'Aviso final: antes do link',
      padrao: 'Depois de enviar, não dá para editar nem apagar este anúncio.',
      secao: 'Anunciar sem conta',
    },
    visitanteAvisoLink: { rotulo: 'Aviso final: texto do link', padrao: 'Crie uma conta gratuita', secao: 'Anunciar sem conta' },
    visitanteAvisoDepois: {
      rotulo: 'Aviso final: depois do link',
      padrao: 'para editar e apagar seus anúncios.',
      secao: 'Anunciar sem conta',
    },
    visitanteBotao: { rotulo: 'Botão de envio', padrao: 'Enviar para aprovação', secao: 'Anunciar sem conta' },
    visitanteBotaoEnviando: { rotulo: 'Botão de envio: enquanto envia', padrao: 'Enviando…', secao: 'Anunciar sem conta' },

    // Anúncio recebido
    recebidoGoogleTitulo: { rotulo: 'Título no Google (anúncio recebido)', padrao: 'Anúncio recebido', secao: 'Anúncio recebido' },
    recebidoTopo: { rotulo: 'Linha pequena acima do título', padrao: 'ClassiSex', secao: 'Anúncio recebido' },
    recebidoTitulo: { rotulo: 'Título da página', padrao: 'Recebemos seu anúncio', secao: 'Anúncio recebido' },
    recebidoTexto: {
      rotulo: 'Texto',
      padrao: 'Ele aparece no ClassiSex depois da análise da equipe. Avisamos no e-mail informado.',
      secao: 'Anúncio recebido',
    },
    recebidoBotaoVer: { rotulo: 'Botão Ver o ClassiSex', padrao: 'Ver o ClassiSex', secao: 'Anúncio recebido' },
    recebidoBotaoConta: { rotulo: 'Botão Criar conta', padrao: 'Criar conta gratuita', secao: 'Anúncio recebido' },
  },
})

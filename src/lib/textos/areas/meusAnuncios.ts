import { definirArea } from '../tipos'

const LISTA = 'Lista Meus anúncios'
const NOVO = 'Novo anúncio'
const EDITAR = 'Editar anúncio'
const CAMPOS = 'Campos do anúncio (também no anúncio sem conta)'
const MIDIA = 'Escolher fotos e vídeos (Novo anúncio)'
const GERENCIAR = 'Fotos e vídeos (Editar anúncio)'

export const meusAnuncios = definirArea({
  slug: 'textos-meus-anuncios',
  rotulo: 'Meus anúncios',
  descricao: 'Lista dos anúncios do assinante, Novo anúncio, Editar anúncio, os campos do formulário e o envio de fotos e vídeos.',
  campos: {
    // Lista
    listaGoogleTitulo: { rotulo: 'Título no Google', padrao: 'Meus anúncios', secao: LISTA },
    topo: {
      rotulo: 'Linha pequena acima do título',
      padrao: 'Área do assinante',
      secao: LISTA,
      ajuda: 'Também usada em Novo anúncio e Editar anúncio.',
    },
    listaTitulo: { rotulo: 'Título da página', padrao: 'Meus anúncios', secao: LISTA },
    listaIntro: {
      formatado: true,
      rotulo: 'Texto de abertura',
      padrao:
        'Você pode ter até 3 anúncios ativos (em análise ou publicados). Todo anúncio novo ou editado passa pela equipe antes de aparecer no ClassiSex.',
      secao: LISTA,
    },
    listaAvisoAntigo: {
      formatado: true,
      rotulo: 'Aviso dos anúncios do site antigo',
      padrao: 'Seus anúncios do site antigo já estão publicados. Você pode editar ou apagar cada um aqui em Meus anúncios.',
      secao: LISTA,
    },
    listaBotaoNovo: { rotulo: 'Botão Novo anúncio', padrao: 'Novo anúncio', secao: LISTA },
    listaVazio: { rotulo: 'Texto quando não há anúncios', padrao: 'Você ainda não tem anúncios.', secao: LISTA },
    listaOkEnviado: {
      rotulo: 'Aviso: anúncio enviado',
      padrao: 'Anúncio enviado. Ele aparece no ClassiSex depois que a equipe aprovar.',
      secao: LISTA,
    },
    listaOkApagado: { rotulo: 'Aviso: anúncio apagado', padrao: 'Anúncio apagado.', secao: LISTA },

    // Cartão do anúncio
    donoAtualizadoEm: {
      rotulo: 'Cartão: data de atualização',
      padrao: 'Atualizado em {data}',
      secao: LISTA,
      ajuda: 'Use {data} para a data.',
    },
    donoRascunho: {
      rotulo: 'Cartão: anúncio trazido do site antigo',
      padrao: 'Trazido do site antigo. Revise antes de enviar.',
      secao: LISTA,
    },
    donoCorrigir: {
      rotulo: 'Cartão: anúncio recusado',
      padrao: 'Corrija o que a equipe pediu e salve de novo para nova análise.',
      secao: LISTA,
    },
    donoSemFotos: { rotulo: 'Cartão: sem fotos', padrao: 'Sem fotos', secao: LISTA },
    donoUmaFoto: { rotulo: 'Cartão: uma foto', padrao: '1 foto', secao: LISTA },
    donoFotos: { rotulo: 'Cartão: várias fotos', padrao: '{n} fotos', secao: LISTA, ajuda: 'Use {n} para a quantidade.' },
    donoUmVideo: { rotulo: 'Cartão: um vídeo', padrao: '1 vídeo', secao: LISTA },
    donoVideos: { rotulo: 'Cartão: vários vídeos', padrao: '{n} vídeos', secao: LISTA, ajuda: 'Use {n} para a quantidade.' },
    donoWhatsapp: { rotulo: 'Cartão: rótulo do WhatsApp', padrao: 'WhatsApp', secao: LISTA },
    donoTelegram: { rotulo: 'Cartão: rótulo do Telegram', padrao: 'Telegram', secao: LISTA },
    donoEmail: { rotulo: 'Cartão: rótulo do e-mail de contato', padrao: 'E-mail', secao: LISTA },
    donoLinks: { rotulo: 'Cartão: rótulo dos links', padrao: 'Links', secao: LISTA },
    donoObservacao: { rotulo: 'Cartão: rótulo de como prefere o contato', padrao: 'Como prefere o contato', secao: LISTA },
    donoRevisar: { rotulo: 'Cartão: botão Revisar e enviar', padrao: 'Revisar e enviar', secao: LISTA },
    donoEditar: { rotulo: 'Cartão: botão Editar', padrao: 'Editar', secao: LISTA },
    donoApagar: { rotulo: 'Cartão: botão Apagar', padrao: 'Apagar', secao: LISTA },
    donoApagarConfirma: {
      rotulo: 'Cartão: pergunta antes de apagar',
      padrao: 'Apagar este anúncio de vez? Fotos e vídeos também saem.',
      secao: LISTA,
    },
    donoApagarSim: { rotulo: 'Cartão: botão de confirmar', padrao: 'Sim, apagar', secao: LISTA },

    // Novo anúncio
    novoGoogleTitulo: { rotulo: 'Título no Google', padrao: 'Novo anúncio', secao: NOVO },
    novoTitulo: { rotulo: 'Título da página', padrao: 'Novo anúncio', secao: NOVO },
    novoIntro: {
      formatado: true,
      rotulo: 'Texto de abertura',
      padrao:
        'O anúncio aparece no ClassiSex depois que a equipe aprovar. Na área aberta, aparecem só o apelido, o tipo, o texto sem contatos e a foto de capa.',
      secao: NOVO,
    },
    novoAvisoGratis: {
      rotulo: 'Aviso para conta gratuita',
      padrao: 'Conta gratuita: 1 foto e nenhum vídeo. Assinantes enviam até 10 fotos e 2 vídeos.',
      secao: NOVO,
    },

    // Editar anúncio
    editarGoogleTitulo: { rotulo: 'Título no Google', padrao: 'Editar anúncio', secao: EDITAR },
    editarTitulo: { rotulo: 'Título da página', padrao: 'Editar anúncio', secao: EDITAR },
    editarAvisoAntigo: {
      formatado: true,
      rotulo: 'Aviso: anúncio do site antigo',
      padrao:
        'Este anúncio veio do site antigo. Não há limite de texto nem é preciso preencher WhatsApp ou Telegram. Quem não é assinante vê o texto sem telefones, links e @.',
      secao: EDITAR,
    },
    editarAvisoRascunho: {
      formatado: true,
      rotulo: 'Aviso: rascunho do site antigo',
      padrao:
        'Este anúncio veio do site antigo. Os contatos que estavam no texto não aparecem para ninguém enquanto for rascunho; coloque WhatsApp ou Telegram nos campos e tire-os do texto.',
      secao: EDITAR,
    },
    editarAvisoPublicado: {
      rotulo: 'Aviso: anúncio publicado',
      padrao: 'Ao salvar, o anúncio sai do ar até a equipe aprovar de novo.',
      secao: EDITAR,
    },
    editarAvisoSalvar: {
      rotulo: 'Aviso: anúncio ainda não publicado',
      padrao: 'Ao salvar, o anúncio vai para a análise da equipe.',
      secao: EDITAR,
    },
    midiaFotoOk: {
      rotulo: 'Aviso: foto enviada',
      padrao: 'Foto enviada. O anúncio volta para análise da equipe.',
      secao: EDITAR,
    },
    midiaVideoOk: {
      rotulo: 'Aviso: vídeo enviado',
      padrao: 'Vídeo enviado. O anúncio volta para análise da equipe.',
      secao: EDITAR,
    },
    midiaCapaOk: {
      rotulo: 'Aviso: capa alterada',
      padrao: 'Capa alterada. O anúncio volta para análise da equipe.',
      secao: EDITAR,
    },
    midiaRemovidaOk: {
      rotulo: 'Aviso: mídia removida',
      padrao: 'Mídia removida. O anúncio volta para análise da equipe.',
      secao: EDITAR,
    },

    // Campos do formulário
    campoObrigatorio: { rotulo: 'Marca de campo obrigatório', padrao: '(obrigatório)', secao: CAMPOS },
    apelidoRotulo: { rotulo: 'Campo: Apelido', padrao: 'Apelido', secao: CAMPOS },
    apelidoAjuda: {
      rotulo: 'Ajuda do Apelido',
      padrao: 'Aparece para todo mundo. Até 40 caracteres, sem telefone, e-mail, @ ou link.',
      secao: CAMPOS,
    },
    euSouRotulo: { rotulo: 'Campo: Eu sou', padrao: 'Eu sou', secao: CAMPOS },
    cidadeRotulo: { rotulo: 'Campo: Cidade', padrao: 'Cidade (opcional, só assinantes veem)', secao: CAMPOS },
    textoRotulo: { rotulo: 'Campo: Texto do anúncio', padrao: 'Texto do anúncio', secao: CAMPOS },
    textoAjuda: {
      formatado: true,
      rotulo: 'Ajuda do texto',
      padrao: 'Até 600 caracteres. Coloque o contato nos campos abaixo: só assinantes veem.',
      secao: CAMPOS,
    },
    textoAjudaAntigo: {
      formatado: true,
      rotulo: 'Ajuda do texto (anúncio do site antigo)',
      padrao:
        'Anúncio do site antigo: sem limite de 600 caracteres. Se quiser, coloque o contato nos campos abaixo: só assinantes veem.',
      secao: CAMPOS,
    },
    contatoLegenda: {
      rotulo: 'Título do grupo de contatos',
      padrao: 'Contato (opcional; só assinantes veem)',
      secao: CAMPOS,
    },
    whatsappRotulo: { rotulo: 'Campo: WhatsApp', padrao: 'WhatsApp', secao: CAMPOS },
    telegramRotulo: { rotulo: 'Campo: Telegram', padrao: 'Telegram', secao: CAMPOS },
    emailContatoRotulo: { rotulo: 'Campo: e-mail de contato', padrao: 'E-mail', secao: CAMPOS },
    linksRotulo: { rotulo: 'Campo: links de outras plataformas', padrao: 'Links de outras plataformas', secao: CAMPOS },
    linksAjuda: {
      rotulo: 'Ajuda dos links',
      padrao: 'Instagram, X, OnlyFans, Privacy, Linktree… Até 5 links. Só assinantes veem.',
      secao: CAMPOS,
    },
    linksMais: { rotulo: 'Links: botão para mostrar mais campos', padrao: 'Adicionar mais links', secao: CAMPOS },
    observacaoRotulo: { rotulo: 'Campo: como prefere o contato', padrao: 'Como prefere o contato', secao: CAMPOS },
    observacaoAjuda: { rotulo: 'Ajuda de como prefere o contato', padrao: 'Ex.: só mensagem, depois das 18h.', secao: CAMPOS },
    declaracao: {
      formatado: false,
      rotulo: 'Declaração (caixa de marcar)',
      padrao:
        'Declaro que tenho 18 anos ou mais, que as informações são verdadeiras e que todas as pessoas das fotos e do vídeo são maiores de idade e autorizaram a publicação.',
      secao: CAMPOS,
    },
    formBotao: { rotulo: 'Botão de envio', padrao: 'Enviar para aprovação', secao: CAMPOS },
    formBotaoEnviando: { rotulo: 'Botão de envio: enquanto envia', padrao: 'Enviando…', secao: CAMPOS },
    formBotaoArquivos: { rotulo: 'Botão de envio: enviando fotos e vídeos', padrao: 'Enviando arquivos…', secao: CAMPOS },
    formProgresso: {
      rotulo: 'Progresso do envio dos arquivos',
      padrao: 'Enviando arquivo {atual} de {total} ({percentual}%). Não feche esta página.',
      secao: CAMPOS,
      ajuda: 'Use {atual}, {total} e {percentual}.',
    },

    // Escolher fotos e vídeos (Novo anúncio)
    midiaLegenda: { rotulo: 'Título do grupo', padrao: 'Fotos e vídeos (opcional)', secao: MIDIA },
    midiaAjudaComVideo: {
      formatado: true,
      rotulo: 'Ajuda (assinante)',
      padrao:
        'Até {fotos} fotos JPG, PNG ou WebP (15 MB cada) e até {videos} vídeos MP4 ou MOV (100 MB e {segundos} segundos cada). A primeira foto é a capa. Na área aberta, só a foto de capa aparece. Você também pode adicionar depois, editando o anúncio.',
      secao: MIDIA,
      ajuda: 'Use {fotos}, {videos} e {segundos} para os limites.',
    },
    midiaAjudaSoFoto: {
      formatado: true,
      rotulo: 'Ajuda (conta gratuita)',
      padrao:
        '{fotos} foto JPG, PNG ou WebP (15 MB). Ela é a capa. Na área aberta, só a foto de capa aparece. Você também pode trocar depois, editando o anúncio.',
      secao: MIDIA,
      ajuda: 'Use {fotos} para o limite de fotos.',
    },
    midiaEscolherFotos: {
      rotulo: 'Campo: Escolher fotos',
      padrao: 'Escolher fotos ({n} de {max})',
      secao: MIDIA,
      ajuda: 'Use {n} para quantas já foram escolhidas e {max} para o limite.',
    },
    midiaEscolherVideos: {
      rotulo: 'Campo: Escolher vídeos',
      padrao: 'Escolher vídeos ({n} de {max})',
      secao: MIDIA,
      ajuda: 'Use {n} para quantos já foram escolhidos e {max} para o limite.',
    },
    midiaTirarFoto: { rotulo: 'Botão Tirar foto', padrao: 'Tirar foto {n}', secao: MIDIA, ajuda: 'Use {n} para o número da foto.' },
    midiaTirarVideo: { rotulo: 'Botão Tirar vídeo', padrao: 'Tirar vídeo {n}', secao: MIDIA, ajuda: 'Use {n} para o número do vídeo.' },

    // Fotos e vídeos (Editar anúncio)
    gerTitulo: { rotulo: 'Título da seção', padrao: 'Fotos e vídeos', secao: GERENCIAR },
    gerDicaAssinante: {
      formatado: true,
      rotulo: 'Dica (assinante)',
      padrao: 'Fotos JPG, PNG ou WebP até 15 MB (até 10). Até 2 vídeos MP4 ou MOV, cada um com até 100 MB e 60 segundos.',
      secao: GERENCIAR,
    },
    gerDicaGratis: {
      formatado: true,
      rotulo: 'Dica (conta gratuita)',
      padrao: 'Conta gratuita: 1 foto JPG, PNG ou WebP até 15 MB e nenhum vídeo.',
      secao: GERENCIAR,
    },
    gerCapaNota: {
      rotulo: 'Nota sobre a capa',
      padrao: 'A primeira foto é a capa. Toda mudança manda o anúncio de volta para a análise da equipe.',
      secao: GERENCIAR,
    },
    gerSemFotos: { rotulo: 'Texto quando não há fotos', padrao: 'Nenhuma foto ainda.', secao: GERENCIAR },
    gerGuardada: {
      rotulo: 'Aviso de mídia guardada',
      padrao: 'Guardada: volta a aparecer quando você assinar',
      secao: GERENCIAR,
    },
    gerCapa: { rotulo: 'Marca Capa', padrao: 'Capa', secao: GERENCIAR },
    gerUsarCapa: { rotulo: 'Botão Usar como capa', padrao: 'Usar como capa', secao: GERENCIAR },
    gerRemover: { rotulo: 'Botão Remover (foto)', padrao: 'Remover', secao: GERENCIAR },
    gerVideo: {
      rotulo: 'Linha do vídeo',
      padrao: 'Vídeo {n} · {duracao}',
      secao: GERENCIAR,
      ajuda: 'Use {n} para o número do vídeo e {duracao} para a duração.',
    },
    gerRemoverVideo: { rotulo: 'Botão Remover vídeo', padrao: 'Remover vídeo {n}', secao: GERENCIAR, ajuda: 'Use {n} para o número do vídeo.' },
    gerAdicionarFoto: { rotulo: 'Campo: Adicionar foto', padrao: 'Adicionar foto', secao: GERENCIAR },
    gerEnviarFoto: { rotulo: 'Botão Enviar foto', padrao: 'Enviar foto', secao: GERENCIAR },
    gerGratisUmaFoto: {
      rotulo: 'Aviso: conta gratuita só 1 foto',
      padrao: 'Conta gratuita: 1 foto por anúncio.',
      secao: GERENCIAR,
    },
    gerAdicionarVideo: { rotulo: 'Campo: Adicionar vídeo', padrao: 'Adicionar vídeo', secao: GERENCIAR },
    gerEnviarVideo: { rotulo: 'Botão Enviar vídeo', padrao: 'Enviar vídeo', secao: GERENCIAR },
    gerVideosAssinantes: { rotulo: 'Aviso: vídeos só para assinantes', padrao: 'Vídeos só para assinantes', secao: GERENCIAR },
    gerAssineJa: { rotulo: 'Botão Assine Já', padrao: 'Assine Já', secao: GERENCIAR },
  },
})

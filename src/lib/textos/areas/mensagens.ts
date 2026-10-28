import { definirArea } from '../tipos'

export const mensagens = definirArea({
  slug: 'textos-mensagens',
  rotulo: 'Recados',
  descricao: 'Caixa de recados dos assinantes: lista, novo recado, conversa, bloquear e denunciar.',
  // Client request 2026-10-26: Recados left the site menu, so the area leaves the admin too
  ocultaNoPainel: true,
  campos: {
    // Lista
    googleLista: { rotulo: 'Título no Google (lista)', padrao: 'Recados', secao: 'Lista de recados' },
    eyebrow: {
      rotulo: 'Palavrinha acima do título',
      padrao: 'Área do assinante',
      secao: 'Lista de recados',
    },
    titulo: { rotulo: 'Título da página', padrao: 'Recados', secao: 'Lista de recados', ajuda: 'Também usado na página da conversa.' },
    intro: { rotulo: 'Texto sobre privacidade', padrao: 'Só você e a outra pessoa veem cada conversa.', secao: 'Lista de recados' },
    vazioTitulo: { rotulo: 'Título quando não há recados', padrao: 'Nenhum recado ainda.', secao: 'Lista de recados' },
    vazioTexto: {
      formatado: true,
      rotulo: 'Texto quando não há recados',
      padrao:
        'Para mandar um recado, abra um anúncio do ClassiSex e toque em Enviar recado. Aqui aparecem só os recados que você mandou ou recebeu.',
      secao: 'Lista de recados',
      longo: true,
    },
    vazioBotao: { rotulo: 'Botão quando não há recados', padrao: 'Ver ClassiSex', secao: 'Lista de recados' },
    novaMarca: { rotulo: 'Marca de recado novo', padrao: 'Nova', secao: 'Lista de recados' },
    enviarRecadoLink: {
      rotulo: 'Botão "Enviar recado" no anúncio',
      padrao: 'Enviar recado',
      secao: 'Lista de recados',
      ajuda: 'Aparece nos anúncios do ClassiSex.',
    },

    // Novo recado
    googleNovo: { rotulo: 'Título no Google (novo recado)', padrao: 'Novo recado', secao: 'Novo recado' },
    novoEyebrow: { rotulo: 'Palavrinha acima do título', padrao: 'Recados', secao: 'Novo recado', ajuda: 'Também usada na conversa.' },
    novoTitulo: { rotulo: 'Título quando não há destinatário', padrao: 'Novo recado', secao: 'Novo recado' },
    novoTituloPara: {
      rotulo: 'Título do novo recado',
      padrao: 'Recado para {nome}',
      secao: 'Novo recado',
      ajuda: 'Use {nome} para o apelido de quem vai receber.',
    },
    voltar: { rotulo: 'Link de voltar', padrao: 'Voltar para Recados', secao: 'Novo recado', ajuda: 'Também usado na conversa.' },
    formApelido: { rotulo: 'Campo: seu apelido', padrao: 'Seu apelido', secao: 'Formulário do recado' },
    formApelidoAjuda: {
      formatado: true,
      rotulo: 'Ajuda do apelido',
      padrao: 'É o nome que a outra pessoa vê. Até 40 caracteres, sem telefone, e-mail, @ ou link.',
      secao: 'Formulário do recado',
      longo: true,
    },
    formRecado: { rotulo: 'Campo: recado', padrao: 'Recado', secao: 'Formulário do recado' },
    formEnviar: { rotulo: 'Botão de enviar', padrao: 'Enviar', secao: 'Formulário do recado' },
    formEnviando: { rotulo: 'Botão enquanto envia', padrao: 'Enviando…', secao: 'Formulário do recado' },

    // Conversa
    googleConversa: { rotulo: 'Título no Google (conversa)', padrao: 'Conversa', secao: 'Conversa' },
    conversaTitulo: {
      rotulo: 'Título da conversa',
      padrao: 'Conversa com {nome}',
      secao: 'Conversa',
      ajuda: 'Use {nome} para o apelido da outra pessoa.',
    },
    anteriores: { rotulo: 'Link para recados anteriores', padrao: 'Ver recados anteriores', secao: 'Conversa' },
    voce: { rotulo: 'Nome dos seus recados', padrao: 'Você', secao: 'Conversa' },
    responderTitulo: { rotulo: 'Título de responder', padrao: 'Responder', secao: 'Conversa' },

    // Bloquear e denunciar
    bloqueado: { rotulo: 'Aviso de pessoa bloqueada', padrao: 'Você bloqueou esta pessoa.', secao: 'Bloquear e denunciar' },
    desbloquear: { rotulo: 'Botão desbloquear', padrao: 'Desbloquear', secao: 'Bloquear e denunciar' },
    bloquearResumo: { rotulo: 'Título de bloquear', padrao: 'Bloquear', secao: 'Bloquear e denunciar' },
    bloquearAviso: {
      formatado: true,
      rotulo: 'Explicação do bloqueio',
      padrao: 'A pessoa não poderá mais mandar recados para você. Você pode desbloquear quando quiser.',
      secao: 'Bloquear e denunciar',
      longo: true,
    },
    bloquearConfirmar: { rotulo: 'Botão confirmar bloqueio', padrao: 'Sim, bloquear', secao: 'Bloquear e denunciar' },
    denunciarResumo: { rotulo: 'Título de denunciar', padrao: 'Denunciar', secao: 'Bloquear e denunciar' },
    denunciarMotivo: { rotulo: 'Título da lista de motivos', padrao: 'Motivo', secao: 'Bloquear e denunciar' },
    denunciarDetalhes: { rotulo: 'Campo de detalhes', padrao: 'Detalhes (opcional)', secao: 'Bloquear e denunciar' },
    denunciarTambemBloquear: {
      rotulo: 'Opção de bloquear junto',
      padrao: 'Também bloquear esta pessoa',
      secao: 'Bloquear e denunciar',
    },
    denunciarEnviar: { rotulo: 'Botão enviar denúncia', padrao: 'Enviar denúncia', secao: 'Bloquear e denunciar' },
  },
})

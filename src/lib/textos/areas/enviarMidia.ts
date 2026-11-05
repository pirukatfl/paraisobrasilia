import { definirArea } from '../tipos'

const PAGINA = 'Página Enviar fotos e vídeos'
const FORM = 'Formulário'
const RECEBIDO = 'Envio recebido'
const PROMO = 'Participação na promoção'

export const enviarMidia = definirArea({
  slug: 'textos-enviar-midia',
  rotulo: 'Enviar fotos e vídeos',
  descricao: 'Página e formulário para qualquer pessoa enviar fotos e vídeos, e a confirmação de envio.',
  campos: {
    // Página
    googleTitulo: { soTexto: true, rotulo: 'Título no Google', padrao: 'Enviar fotos e vídeos', secao: PAGINA },
    googleDescricao: {
      bloco: true,
      soTexto: true,
      rotulo: 'Descrição no Google',
      padrao:
        'Envie suas fotos e vídeos do Paraíso Brasília para a equipe. Sem cadastro; só para maiores de 18 anos, com autorização de uso de imagem.',
      secao: PAGINA,
    },
    topo: { rotulo: 'Linha pequena acima do título', padrao: 'Participe', secao: PAGINA },
    titulo: { rotulo: 'Título da página', padrao: 'Enviar fotos e vídeos', secao: PAGINA },
    intro: {
      bloco: true,
      rotulo: 'Texto de abertura',
      padrao:
        'Qualquer pessoa pode enviar, sem cadastro. Só a equipe vê o que você mandar; nada vai para o site sozinho. A equipe pode usar as imagens na galeria depois de conferir, e só com a sua autorização.',
      secao: PAGINA,
    },

    // Participação na promoção (quando a pessoa chega pelo botão Participar da seção na página inicial)
    promocaoQuadro: {
      rotulo: 'Quadro no topo da página',
      padrao: 'Participando da promoção: {titulo}',
      secao: PROMO,
      ajuda: 'Use {titulo} para o título da promoção (Configurações → Promoção).',
    },
    promocaoIntro: {
      bloco: true,
      rotulo: 'Texto de abertura (no lugar do texto comum)',
      padrao:
        'Preencha os dados, escolha as suas fotos e vídeos e envie. A equipe confere tudo e entra em contato. Nada vai para o site sem a sua autorização.',
      secao: PROMO,
    },
    promocaoContatoRotulo: { rotulo: 'Campo: e-mail (obrigatório na promoção)', padrao: 'Seu e-mail', secao: PROMO },
    promocaoContatoAjuda: {
      rotulo: 'Ajuda do e-mail na promoção',
      padrao: 'Obrigatório na promoção: é por ele que a equipe fala com você e libera o acesso à plataforma se você ganhar. Só a equipe vê.',
      secao: PROMO,
    },
    promocaoBotao: { rotulo: 'Botão de envio', padrao: 'Participar da promoção', secao: PROMO },
    promocaoEnviadoTitulo: { rotulo: 'Envio recebido: título', padrao: 'Recebemos a sua participação', secao: PROMO },
    promocaoEnviadoTexto: {
      rotulo: 'Envio recebido: texto',
      padrao: 'Obrigado por participar! A equipe vai olhar os seus dados, fotos e vídeos e falar com você. Nada vai para o site sem a sua autorização.',
      secao: PROMO,
    },

    // Formulário
    obrigatorio: { rotulo: 'Marca de campo obrigatório', padrao: '(obrigatório)', secao: FORM },
    apelidoRotulo: { rotulo: 'Campo: Apelido', padrao: 'Apelido', secao: FORM },
    apelidoAjuda: { rotulo: 'Ajuda do apelido', padrao: 'Como a equipe deve chamar você.', secao: FORM },
    contatoRotulo: { rotulo: 'Campo: Contato', padrao: 'Seu e-mail ou WhatsApp', secao: FORM },
    contatoAjuda: {
      rotulo: 'Ajuda do contato',
      padrao: 'Para a equipe falar com você se precisar. Só a equipe vê.',
      secao: FORM,
    },
    mensagemRotulo: { rotulo: 'Campo: Mensagem', padrao: 'Mensagem (opcional)', secao: FORM },
    mensagemAjuda: {
      rotulo: 'Ajuda da mensagem',
      padrao: 'Conte de que festa são as imagens, ou qualquer recado para a equipe.',
      secao: FORM,
    },
    arquivosRotulo: { rotulo: 'Campo: Fotos e vídeos', padrao: 'Fotos e vídeos', secao: FORM },
    arquivosAjuda: {
      bloco: true,
      rotulo: 'Ajuda de Fotos e vídeos',
      padrao:
        'Até {fotos} fotos (JPG, PNG ou WebP, até 15 MB cada) e até {videos} vídeos (MP4 ou MOV, até 100 MB e 60 segundos cada).',
      secao: FORM,
      ajuda: 'Use {fotos} e {videos} para as quantidades máximas.',
    },
    arquivosEscolher: { rotulo: 'Botão: Escolher arquivos', padrao: 'Escolher fotos e vídeos', secao: FORM },
    arquivosTirar: { rotulo: 'Botão: Tirar arquivo', padrao: 'Tirar', secao: FORM },
    maior18: {
      rotulo: 'Caixa de marcar: 18 anos',
      padrao: 'Tenho 18 anos ou mais.',
      secao: FORM,
    },
    autorizacao: {
      rotulo: 'Autorização de uso de imagem (caixa de marcar)',
      padrao:
        'Autorizo o Paraíso Brasília a usar estas fotos e vídeos na divulgação da casa. As imagens são minhas ou foram feitas com autorização de todas as pessoas que aparecem.',
      secao: FORM,
      ajuda: 'A data e a hora em que a pessoa marcou ficam registradas no envio.',
    },
    aviso: {
      bloco: true,
      rotulo: 'Aviso antes de enviar',
      padrao:
        'Depois de enviar, não dá para editar nem apagar pelo site. Para retirar uma imagem, fale com a equipe pela página Contato.',
      secao: FORM,
    },
    botao: { rotulo: 'Botão de envio', padrao: 'Enviar para a equipe', secao: FORM },
    botaoEnviando: { rotulo: 'Botão de envio: enquanto envia', padrao: 'Enviando…', secao: FORM },
    progresso: {
      soTexto: true,
      rotulo: 'Progresso do envio',
      padrao: 'Enviando arquivo {n} de {total}…',
      secao: FORM,
      ajuda: 'Use {n} para o arquivo atual e {total} para a quantidade de arquivos.',
    },

    // Recebido
    enviadoGoogleTitulo: { soTexto: true, rotulo: 'Título no Google (envio recebido)', padrao: 'Envio recebido', secao: RECEBIDO },
    enviadoTopo: { rotulo: 'Linha pequena acima do título', padrao: 'Participe', secao: RECEBIDO },
    enviadoTitulo: { rotulo: 'Título da página', padrao: 'Recebemos seu envio', secao: RECEBIDO },
    enviadoTexto: {
      rotulo: 'Texto',
      padrao: 'Obrigado! A equipe vai olhar as suas fotos e vídeos. Nada vai para o site sem a sua autorização.',
      secao: RECEBIDO,
    },
    enviadoFalhas: {
      rotulo: 'Aviso: arquivos não aceitos',
      padrao: '{n} arquivo(s) não foram aceitos (tipo, tamanho ou duração fora do limite). Você pode enviar de novo.',
      secao: RECEBIDO,
      ajuda: 'Use {n} para a quantidade de arquivos que não foram aceitos. Só aparece quando houve falha.',
    },
    enviadoBotaoInicio: { rotulo: 'Botão para a página inicial', padrao: 'Voltar à página inicial', secao: RECEBIDO },
  },
})

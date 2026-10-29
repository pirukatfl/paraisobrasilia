import { definirArea } from '../tipos'

export const institucional = definirArea({
  slug: 'textos-institucional',
  rotulo: 'Quem somos e páginas legais',
  descricao:
    'Abas de Quem somos, botões do fim da página e "Atualizado em". Os títulos e textos das páginas são editados em Páginas.',
  campos: {
    // Abas
    abaQuemSomos: { rotulo: 'Aba: Quem somos', padrao: 'Quem somos', secao: 'Abas de Quem somos', ajuda: 'Também aparece no botão "Próximo" (lá, sem formatação).' },
    abaNormas: { rotulo: 'Aba: Normas', padrao: 'Normas', secao: 'Abas de Quem somos', ajuda: 'Também aparece no botão "Próximo" (lá, sem formatação).' },
    abaRegras: { rotulo: 'Aba: Regras', padrao: 'Regras', secao: 'Abas de Quem somos', ajuda: 'Também aparece no botão "Próximo" (lá, sem formatação).' },
    abaDicas: { rotulo: 'Aba: Dicas', padrao: 'Dicas', secao: 'Abas de Quem somos', ajuda: 'Também aparece no botão "Próximo" (lá, sem formatação).' },

    // Fim da página
    botaoProximo: {
      rotulo: 'Botão para a próxima aba',
      padrao: 'Próximo: {aba} →',
      secao: 'Fim das páginas de Quem somos',
      ajuda: 'Use {aba} para o nome da próxima aba.',
    },
    botaoFestas: {
      rotulo: 'Botão da última aba',
      padrao: 'Ver próximas festas',
      secao: 'Fim das páginas de Quem somos',
    },

    // Páginas legais
    atualizadoEm: {
      rotulo: 'Texto antes da data de atualização',
      padrao: 'Atualizado em',
      secao: 'Termos de Uso e Política de Privacidade',
      ajuda: 'A data aparece logo depois deste texto.',
    },
  },
})

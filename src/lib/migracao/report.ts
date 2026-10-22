/**
 * Aggregate-only reports of the WordPress migration (dry-run and --inspect).
 */
// T-06-05: aggregate only — never e-mails, names, logins, hashes, texts, cities or IDs
import { spDate } from '../assinantes/periods'
import type { AccountDecision, MotivoIgnorada } from './wp-accounts'
import { FONTES, FONTE_LABELS, type AdSkip, type Fonte, type InspectReport, type WpLegacyAd } from './wp-classisex'

export type MigrationReport = {
  contasLidas: number
  ignoradas: Record<MotivoIgnorada, number>
  aImportar: number
  senhas: { wpBcrypt: number; phpass: number; desconhecido: number }
  pagantes: number
  vencimentosPorMes: Record<string, number>
  revisar: number
  vencidas: number
  semData: number
  alertas: { expiradoComDataFutura: number; naoAssinanteComDataFutura: number; apelidoDescartado: number; outroPapel: number }
  anuncios: {
    total: number
    skipped: Record<AdSkip, number>
    euSou: { Casal: number; Homem: number; Mulher: number }
    cidadeDescartada: number
    textoLongo: number
    fotosReferencias: number
    fotosSemArquivo: number
    deContasImportadas: number | null
    /** Per old board (ClassiSex, Mural) */
    deVisitantes: number
    porFonte: Record<Fonte, { total: number; deVisitantes: number; textoLongo: number; fotosReferencias: number; fotosSemArquivo: number }>
  }
}

export function buildMigrationReport(
  decisions: AccountDecision[],
  adsResult: { ads: WpLegacyAd[]; skipped: Record<AdSkip, number> },
  accountIdsImported?: ReadonlySet<number>,
): MigrationReport {
  const ignoradas: Record<MotivoIgnorada, number> = {
    administrador: 0,
    teste: 0,
    'email-invalido': 0,
    'email-duplicado': 0,
    'excluida-pela-equipe': 0,
  }
  const report: MigrationReport = {
    contasLidas: decisions.length,
    ignoradas,
    aImportar: 0,
    senhas: { wpBcrypt: 0, phpass: 0, desconhecido: 0 },
    pagantes: 0,
    vencimentosPorMes: {},
    revisar: 0,
    vencidas: 0,
    semData: 0,
    alertas: { expiradoComDataFutura: 0, naoAssinanteComDataFutura: 0, apelidoDescartado: 0, outroPapel: 0 },
    anuncios: {
      total: adsResult.ads.length,
      skipped: { ...adsResult.skipped },
      euSou: { Casal: 0, Homem: 0, Mulher: 0 },
      cidadeDescartada: 0,
      textoLongo: 0,
      fotosReferencias: 0,
      fotosSemArquivo: 0,
      deContasImportadas: accountIdsImported ? 0 : null,
      deVisitantes: 0,
      porFonte: {
        classisex: { total: 0, deVisitantes: 0, textoLongo: 0, fotosReferencias: 0, fotosSemArquivo: 0 },
        mural: { total: 0, deVisitantes: 0, textoLongo: 0, fotosReferencias: 0, fotosSemArquivo: 0 },
      },
    },
  }

  for (const d of decisions) {
    if (d.kind === 'ignorar') {
      ignoradas[d.motivo]++
      continue
    }
    const a = d.account
    report.aImportar++
    if (a.hashKind === 'wp-bcrypt') report.senhas.wpBcrypt++
    else if (a.hashKind === 'phpass') report.senhas.phpass++
    else report.senhas.desconhecido++
    if (a.assinatura === 'pagante') {
      report.pagantes++
      if (a.endsAt) {
        const month = spDate(new Date(a.endsAt)).slice(0, 7)
        report.vencimentosPorMes[month] = (report.vencimentosPorMes[month] ?? 0) + 1
      }
    } else if (a.assinatura === 'revisar') report.revisar++
    else if (a.assinatura === 'vencida') report.vencidas++
    else report.semData++
    if (a.flags.includes('expirado-com-data-futura')) report.alertas.expiradoComDataFutura++
    if (a.flags.includes('nao-assinante-com-data-futura')) report.alertas.naoAssinanteComDataFutura++
    if (a.flags.includes('apelido-descartado')) report.alertas.apelidoDescartado++
    if (a.flags.includes('outro-papel')) report.alertas.outroPapel++
  }

  for (const ad of adsResult.ads) {
    report.anuncios.euSou[ad.euSou]++
    if (ad.flags.includes('cidade-descartada')) report.anuncios.cidadeDescartada++
    if (ad.flags.includes('texto-longo')) report.anuncios.textoLongo++
    report.anuncios.fotosReferencias += ad.photos.length
    report.anuncios.fotosSemArquivo += ad.photos.filter((p) => p.relPath === null).length
    const fonte = report.anuncios.porFonte[ad.fonte]
    fonte.total++
    if (ad.visitante) {
      fonte.deVisitantes++
      report.anuncios.deVisitantes++
    }
    if (ad.flags.includes('texto-longo')) fonte.textoLongo++
    fonte.fotosReferencias += ad.photos.length
    fonte.fotosSemArquivo += ad.photos.filter((p) => p.relPath === null).length
    if (accountIdsImported?.has(ad.wpUserId)) report.anuncios.deContasImportadas = (report.anuncios.deContasImportadas ?? 0) + 1
  }
  return report
}

export function formatMigrationReport(report: MigrationReport, load: string[] = []): string {
  const ig = report.ignoradas
  const months = Object.entries(report.vencimentosPorMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([m, n]) => `${m}: ${n}`)
    .join(' · ')
  const al = report.alertas
  const an = report.anuncios
  const sk = an.skipped
  const lines = [
    `Contas lidas: ${report.contasLidas}`,
    `Ignoradas: administrador ${ig.administrador} · teste ${ig.teste} · e-mail inválido ${ig['email-invalido']} · e-mail duplicado ${ig['email-duplicado']} · excluídas pela equipe ${ig['excluida-pela-equipe']}`,
    `A importar: ${report.aImportar}`,
    `Senhas: formato novo do WP ${report.senhas.wpBcrypt} · formato antigo do WP ${report.senhas.phpass} · desconhecido ${report.senhas.desconhecido} (só por link de nova senha)`,
    `Pagantes (data futura): ${report.pagantes}`,
    `Vencimentos por mês: ${months || 'nenhum'}`,
    `Revisar (assinante antigo sem data): ${report.revisar}`,
    `Vencidas: ${report.vencidas} · sem data: ${report.semData}`,
    `Alertas: expirado=Y com data futura ${al.expiradoComDataFutura} · não assinante com data futura ${al.naoAssinanteComDataFutura} · apelido descartado ${al.apelidoDescartado} · outro papel ${al.outroPapel}`,
    `Anúncios antigos: ${an.total} · respostas ${sk.resposta} · não aprovados ${sk['nao-aprovado']} · de visitantes (publicados pela equipe) ${an.deVisitantes} · Eu sou desconhecido ${sk['eu-sou-desconhecido']} · outro tipo ${sk['outro-tipo']}${sk['texto-vazio'] ? ` · texto vazio ${sk['texto-vazio']}` : ''}`,
    `Eu sou: Casal ${an.euSou.Casal} · Homem ${an.euSou.Homem} · Mulher ${an.euSou.Mulher}`,
    `Cidade descartada: ${an.cidadeDescartada} · texto acima de 600: ${an.textoLongo}`,
    `Fotos: ${an.fotosReferencias} referências · sem arquivo no dump ${an.fotosSemArquivo}`,
    ...FONTES.map((f) => {
      const x = an.porFonte[f]
      return `  ${FONTE_LABELS[f]}: ${x.total} anúncios · de visitantes (publicados pela equipe) ${x.deVisitantes} · texto acima de 600: ${x.textoLongo} · ${x.fotosReferencias} fotos referenciadas · sem arquivo ${x.fotosSemArquivo}`
    }),
  ]
  if (an.deContasImportadas !== null) lines.push(`Anúncios de contas importadas: ${an.deContasImportadas}`)
  return [...lines, ...load].join('\n')
}

export function formatInspect(report: InspectReport): string {
  const kv = (o: Record<string, number | string>) =>
    Object.entries(o)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ') || 'nenhum'
  const lines = [
    `Tabelas (linhas lidas): ${kv(report.tabelas)}`,
    `Formatos de senha (4 primeiros caracteres): ${kv(report.prefixosHash)}`,
    `Papéis: ${kv(report.papeis)}`,
    'Meta dos anúncios (chave · linhas · valores distintos · todos em Casal/Solteiro/Solteira):',
    ...report.metaAnuncios.map(
      (m) => `  ${m.chave} · ${m.linhas} · ${m.valoresDistintos} · ${m.fracaoEuSou >= 1 ? 'sim' : 'não'} (${Math.round(m.fracaoEuSou * 100)}%)`,
    ),
    `Rótulos do formulário: ${kv(report.rotulosFormulario)}`,
  ]
  return lines.join('\n')
}

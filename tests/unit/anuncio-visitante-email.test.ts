import { describe, expect, it } from 'vitest'

import { buildVisitorAdEmail } from '../../src/lib/email/anuncio-visitante'

const base = 'https://exemplo.test'

describe('visitor ad e-mail (S-07)', () => {
  it.each([
    ['aprovar', 'foi aprovado'],
    ['recusar', 'não foi aprovado'],
    ['despublicar', 'foi retirado'],
  ] as const)('%s: says what happened and links to ClassiSex and the sign-up', (kind, phrase) => {
    const mail = buildVisitorAdEmail({ kind, apelido: 'Casal Teste', motivo: null, siteBase: base })
    expect(mail.text).toContain(phrase)
    expect(mail.text).toContain('"Casal Teste"')
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain(`${base}/classisex`)
      expect(body).toContain(`${base}/cadastro`)
    }
    expect(mail.subject).toBeTruthy()
    expect(mail.text).not.toContain('Motivo:')
  })

  it('includes the reason when there is one', () => {
    const mail = buildVisitorAdEmail({ kind: 'recusar', apelido: 'Casal', motivo: 'Foto sem autorização', siteBase: base })
    expect(mail.text).toContain('Motivo: Foto sem autorização')
    expect(mail.html).toContain('Motivo: Foto sem autorização')
  })

  it('escapes the apelido and the reason in the HTML', () => {
    const mail = buildVisitorAdEmail({ kind: 'recusar', apelido: '<b>Casal</b> & "Cia"', motivo: '<script>x</script>', siteBase: base })
    expect(mail.html).not.toContain('<b>')
    expect(mail.html).not.toContain('<script>')
    expect(mail.html).toContain('&lt;b&gt;Casal&lt;/b&gt; &amp; &quot;Cia&quot;')
  })

  it('never carries contacts or the ad text (it is not even an input)', () => {
    const mail = buildVisitorAdEmail({ kind: 'aprovar', apelido: 'Casal', siteBase: base })
    expect(Object.keys(mail)).toEqual(['subject', 'text', 'html'])
    expect(mail.text + mail.html).not.toMatch(/\d{8,}|whatsapp|telegram/i)
  })
})

import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Plan 01-10: guards on the staging deploy files (no Docker needed).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const read = (file: string) => readFileSync(path.join(root, file), 'utf8')

/** Body of a quoted heredoc (<<'MARKER' ... MARKER) inside a shell script. */
function heredoc(script: string, marker: string): string {
  const start = script.indexOf(`<<'${marker}'\n`)
  expect(start, `heredoc ${marker}`).toBeGreaterThan(-1)
  const bodyStart = start + `<<'${marker}'\n`.length
  const end = script.indexOf(`\n${marker}\n`, bodyStart)
  return script.slice(bodyStart, end + 1)
}

/** Lines of one top-level service block in a compose file. */
function service(compose: string, name: string): string {
  const match = compose.match(new RegExp(`\\n  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z_]+:\\n|\\nvolumes:)`))
  expect(match, `service ${name}`).not.toBeNull()
  return match![1]
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n')
}

describe('staging deploy files', () => {
  const bootstrap = read('scripts/deploy/bootstrap-vps.sh')

  it('bootstrap-vps.sh installs exactly the repo compose (GHCR variant) and Caddyfile', () => {
    expect(heredoc(bootstrap, 'PARAISO_COMPOSE')).toBe(read('docker-compose.staging.ghcr.yml'))
    expect(heredoc(bootstrap, 'PARAISO_CADDY')).toBe(read('Caddyfile'))
  })

  for (const file of ['docker-compose.staging.yml', 'docker-compose.staging.ghcr.yml']) {
    it(`${file}: closed database, media volume at /app/media, only Caddy published`, () => {
      const compose = read(file)
      expect(service(compose, 'db')).not.toMatch(/ports:/)
      expect(service(compose, 'app')).not.toMatch(/ports:/)
      expect(service(compose, 'app')).toContain('- media:/app/media')
      expect(service(compose, 'caddy')).toMatch(/'443:443'/)
      expect(compose).toMatch(/\nvolumes:\n(?:  \w+:\n)*  media:\n/)
    })
  }

  it('media stays on the server disk (no S3 storage plugin)', () => {
    const config = read('src/payload.config.ts')
    expect(config).not.toContain('s3Storage(')
    expect(config).toContain('process.env.MEDIA_DIR')
  })

  it('the staging env example carries no secrets', () => {
    const env = read('.env.staging.example')
    expect(env).toMatch(/^POSTGRES_PASSWORD=$/m)
    expect(env).toMatch(/^PAYLOAD_SECRET=$/m)
    expect(env).not.toMatch(/S3_|B2_/)
    expect(env).toMatch(/^MEDIA_DIR=\/app\/media$/m)
  })
})

describe('Phase 2 runbook and staff guide (plan 02-06)', () => {
  it('the runbook covers videos on the media volume, the size cap and the disk check', () => {
    const runbook = read('docs/deploy/STAGING.md')
    expect(runbook).toContain('/app/media/videos')
    expect(runbook).toContain('100 MB')
    expect(runbook).toContain('df -h')
    expect(runbook).toContain('docker system df -v | grep media')
  })

  it('the staff guide has every Phase 2 section, including image removal with Excluir', () => {
    const guide = read('docs/painel/GUIA-DA-EQUIPE.md')
    for (const heading of [
      'Fotos e vídeos do espaço',
      'Modelos',
      'Textos (Quem Somos, Normas, Regras, Dicas, Termos, Privacidade)',
      'Contato e endereço',
      'Remoção de imagem',
    ]) {
      expect(guide).toMatch(new RegExp(`^## ${heading.replace(/[()]/g, '\\$&')}$`, 'm'))
    }
    expect(guide).toContain('Excluir')
  })

  it.each(['docker-compose.staging.yml', 'docker-compose.staging.ghcr.yml'])(
    '%s still mounts the media volume (photos and videos) into the app',
    (file) => {
      expect(service(read(file), 'app')).toContain('- media:/app/media')
    },
  )
})

describe('Phase 3 staff guide and runbook (plan 03-07)', () => {
  it('the staff guide has every Assinantes section', () => {
    const guide = read('docs/painel/GUIA-DA-EQUIPE.md')
    expect(guide).toMatch(/^## Assinantes$/m)
    for (const heading of [
      'Novo assinante',
      'Liberar ou renovar',
      'Encerrar acesso',
      'Senha provisória e link de nova senha',
      'Vencem nos próximos 7 dias',
      'Registro de ações',
      'Planos e links do PagBank',
      'Testar o login de um assinante',
    ]) {
      expect(guide).toMatch(new RegExp(`^### ${heading}$`, 'm'))
    }
    expect(guide).toContain('janela anônima')
    expect(guide).toContain('48 horas')
  })

  it('the runbook covers the Phase 3 notes', () => {
    const runbook = read('docs/deploy/STAGING.md')
    expect(runbook).toContain('assinantes')
    expect(runbook).toContain('sem e-mail')
    expect(runbook).toContain('janela anônima')
    expect(runbook).toContain('audit_log')
    expect(runbook).toContain('first-register')
  })
})

describe('Phase 4 private media volume (plan 04-05, T-04-03, T-04-09, T-04-16)', () => {
  it.each(['docker-compose.staging.yml', 'docker-compose.staging.ghcr.yml'])(
    '%s mounts private_media at /app/private-media next to media',
    (file) => {
      const compose = read(file)
      const app = service(compose, 'app')
      expect(app).toContain('- private_media:/app/private-media')
      expect(app).toContain('PRIVATE_MEDIA_DIR: /app/private-media')
      expect(app).toContain('- media:/app/media')
      expect(compose).toMatch(/\nvolumes:\n(?:  \w+:\n)*  private_media:\n/)
      // Caddy never sees the private files
      expect(service(compose, 'caddy')).not.toContain('private')
    },
  )

  it('bootstrap still installs the exact compose and Caddyfile', () => {
    const bootstrap = read('scripts/deploy/bootstrap-vps.sh')
    expect(heredoc(bootstrap, 'PARAISO_COMPOSE')).toBe(read('docker-compose.staging.ghcr.yml'))
    expect(heredoc(bootstrap, 'PARAISO_CADDY')).toBe(read('Caddyfile'))
  })

  it('Caddy caps request bodies at 110 MB', () => {
    expect(read('Caddyfile')).toContain('max_size 110MB')
  })

  it('the image creates /app/private-media for node but leaves PRIVATE_MEDIA_DIR to the compose', () => {
    const dockerfile = read('Dockerfile')
    expect(dockerfile).toMatch(/mkdir -p [^\n]*\/app\/private-media/)
    expect(dockerfile).toMatch(/chown node:node [^\n]*\/app\/private-media/)
    expect(dockerfile).not.toMatch(/ENV[^\n]*PRIVATE_MEDIA_DIR|^\s+PRIVATE_MEDIA_DIR=/m)
  })

  it('local private files are never committed nor sent to the image', () => {
    expect(read('.gitignore')).toMatch(/^\/private-media$/m)
    expect(read('.dockerignore')).toMatch(/^private-media$/m)
    expect(read('.env.staging.example')).toMatch(/^PRIVATE_MEDIA_DIR=\/app\/private-media$/m)
  })
})

describe('Phase 4 staff guide, runbook and bootstrap re-run (plan 04-10)', () => {
  it('the staff guide has the ClassiSex section, its headings and the minor rule', () => {
    const guide = read('docs/painel/GUIA-DA-EQUIPE.md')
    expect(guide).toMatch(/^## ClassiSex$/m)
    for (const heading of [
      'Fila de moderação',
      'Aprovar, recusar ou despublicar',
      'O que recusar',
      'Denúncias',
      'Opções "Eu sou"',
      'Fotos e vídeos dos anúncios',
      'Testar como assinante',
    ]) {
      expect(guide).toContain(`### ${heading}`)
    }
    expect(guide).toContain('anúncios')
    expect(guide).toContain('janela anônima')
    expect(guide).toContain('menor de idade')
    expect(guide).toContain('despublica o anúncio sozinho, na mesma hora')
    expect(guide).toContain('Descartar')
  })

  it('the runbook 7.3 documents the volume, the one-time re-run and the checks', () => {
    const runbook = read('docs/deploy/STAGING.md')
    for (const text of [
      '7.3',
      'private_media',
      'bootstrap-vps.sh',
      '/app/private-media',
      'docker system df -v | grep private_media',
      'Envio de fotos indisponível',
      'read -rsp',
      'raw.githubusercontent.com/pirukatfl/paraisobrasilia/main/scripts/deploy/bootstrap-vps.sh',
      'DOMAIN=novo.swingbrasilia.com.br GHCR_USER=pirukatfl GHCR_TOKEN="$GH_TOKEN" bash /root/bootstrap-vps.sh',
    ]) {
      expect(runbook).toContain(text)
    }
  })

  describe('bootstrap-vps.sh is safe to re-run', () => {
    const script = read('scripts/deploy/bootstrap-vps.sh')

    it('never removes volumes, data or the env file', () => {
      expect(script).not.toMatch(/docker volume (rm|prune)|compose[^\n]* down|rm -rf|system prune|\brm .*\.env/)
    })

    it('generates secrets only when .env.staging does not exist yet', () => {
      const ifFile = script.indexOf('if [ -f "$ENV_FILE" ]; then')
      const elseAt = script.indexOf('\nelse\n', ifFile)
      expect(ifFile).toBeGreaterThan(-1)
      for (const m of script.matchAll(/openssl rand/g)) expect(m.index!).toBeGreaterThan(elseAt)
    })

    it('keeps existing secrets and domain, only refreshing the image name', () => {
      const start = script.indexOf('ENV_FILE="$APP_DIR/.env.staging"')
      const end = script.indexOf('chmod 600 "$ENV_FILE"')
      const block = script.slice(start, end)
      const dir = mkdtempSync(path.join(tmpdir(), 'bootstrap-'))
      const envPath = path.join(dir, '.env.staging')
      const original = [
        'POSTGRES_PASSWORD=senha-do-banco-antiga',
        'PAYLOAD_SECRET=segredo-antigo',
        'STAGING_DOMAIN=novo.swingbrasilia.com.br',
        'GHCR_IMAGE=ghcr.io/velho/imagem',
        'IMAGE_TAG=staging',
        '',
      ].join('\n')
      writeFileSync(envPath, original)
      const harness = `set -euo pipefail
APP_DIR='${dir}'
GHCR_IMAGE='ghcr.io/pirukatfl/paraisobrasilia'
ok() { :; }
die() { echo "DIE: $*" >&2; exit 1; }
ask() { echo "ASKED" >&2; exit 9; }
${block}
echo "DOMAIN_OUT=$DOMAIN"`
      for (let run = 0; run < 2; run++) {
        const res = spawnSync('bash', ['-c', harness], { encoding: 'utf8', env: { ...process.env, DOMAIN: 'outro.exemplo.com' } })
        expect(res.status, res.stderr).toBe(0)
        expect(res.stdout).toContain('DOMAIN_OUT=novo.swingbrasilia.com.br')
      }
      const after = readFileSync(envPath, 'utf8')
      expect(after).toContain('POSTGRES_PASSWORD=senha-do-banco-antiga')
      expect(after).toContain('PAYLOAD_SECRET=segredo-antigo')
      expect(after).toContain('STAGING_DOMAIN=novo.swingbrasilia.com.br')
      expect(after).toContain('GHCR_IMAGE=ghcr.io/pirukatfl/paraisobrasilia')
      expect(after.match(/^GHCR_IMAGE=/gm)).toHaveLength(1)
    })

    it('reloads Caddy after the rewritten Caddyfile (bind mount is not recreated by compose)', () => {
      expect(script).toContain('caddy reload --config /etc/caddy/Caddyfile')
      expect(script.indexOf('caddy reload')).toBeGreaterThan(script.indexOf('update.sh" --force'))
    })

    it('re-login to ghcr.io happens when a token is passed, so GHCR_TOKEN on the command line is used', () => {
      expect(script).toContain('if [ -n "${GHCR_TOKEN:-}" ] || ! grep -qs')
    })
  })
})

describe('e-mail settings (ASS-02, 2026-10-20)', () => {
  const vars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'EMAIL_FROM_ADDRESS', 'EMAIL_FROM_NAME']

  it('the staging env example and the bootstrap carry the SMTP variables, user and password empty', () => {
    const env = read('.env.staging.example')
    const bootstrap = read('scripts/deploy/bootstrap-vps.sh')
    for (const name of vars) {
      expect(env).toMatch(new RegExp(`^${name}=`, 'm'))
      expect(bootstrap).toContain(`${name}=`)
    }
    expect(env).toMatch(/^SMTP_USER=$/m)
    expect(env).toMatch(/^SMTP_PASS=$/m)
    expect(bootstrap).toMatch(/^SMTP_PASS=$/m)
  })

  it('the bootstrap only appends missing SMTP lines and never generates or logs the SMTP password', () => {
    const bootstrap = read('scripts/deploy/bootstrap-vps.sh')
    expect(bootstrap).toContain('grep -q "^${pair%%=*}=" "$ENV_FILE" ||')
    expect(bootstrap).not.toMatch(/SMTP_PASS=.*openssl/)
    expect(bootstrap).not.toMatch(/echo[^\n]*SMTP_PASS/)
  })

  it('the app container reads .env.staging; the runbook documents the silent password prompt', () => {
    for (const file of ['docker-compose.staging.yml', 'docker-compose.staging.ghcr.yml']) {
      expect(service(read(file), 'app')).toContain('env_file: .env.staging')
      expect(read(file)).not.toMatch(/SMTP_PASS:/)
    }
    const runbook = read('docs/deploy/STAGING.md')
    expect(runbook).toContain('read -rsp')
    expect(runbook).toContain('update.sh --force')
    expect(runbook).toContain('send-test-email.mjs')
    expect(runbook).toMatch(/SPF/)
    expect(runbook).toMatch(/DKIM/)
  })
})

describe('conta gratuita runbook and staff guide (G-01..G-06, 2026-10-20)', () => {
  it('the runbook documents the migration, the SMTP dependency and the closed sign-up', () => {
    const runbook = read('docs/deploy/STAGING.md')
    expect(runbook).toContain('### 7.5 Conta gratuita')
    expect(runbook).toContain('conta_gratuita')
    expect(runbook).toContain('SMTP_USER')
    expect(runbook).toContain('cadastro fechado')
    expect(runbook).toContain('_verified = true')
  })

  it('the staff guide explains the free account, the e-mail fallback and the expiry rule', () => {
    const guide = read('docs/painel/GUIA-DA-EQUIPE.md')
    expect(guide).toContain('## Contas gratuitas')
    for (const heading of [
      'Grátis e Assinante',
      'Cadastro pelo site',
      'E-mail não chegou',
      'Liberar assinatura de quem já tem conta',
      'Vencimento: o anúncio continua como gratuito',
    ]) {
      expect(guide).toContain(`### ${heading}`)
    }
    expect(guide).toContain('só a capa')
    expect(guide).toContain('Guardada')
    expect(guide).toMatch(/\[VALIDAR/)
    // the old rule must not survive anywhere in the guide
    expect(guide).not.toMatch(/saem do ar até ela renovar/)
  })
})

describe('Phase 5 staff guide and runbook 7.4 (plan 05-12)', () => {
  it('the staff guide has Contos, Recados (placeholder) and Mensagens sections', () => {
    const guide = read('docs/painel/GUIA-DA-EQUIPE.md')
    expect(guide).toMatch(/^## Contos$/m)
    expect(guide).toMatch(/^## Recados$/m)
    expect(guide).toMatch(/^## Mensagens entre assinantes$/m)
    for (const heading of [
      'Publicar um conto',
      'Parágrafos abertos',
      'Contos do site antigo',
      'Denúncias de mensagens',
      'Suspender mensagens',
      'Privacidade das mensagens',
      'Testar com dois assinantes',
    ]) {
      expect(guide).toContain(`### ${heading}`)
    }
    expect(guide).toContain('Recados: em revisão')
    expect(guide).toContain('A equipe não lê as conversas')
    expect(guide).toContain('janela anônima')
    expect(guide).toContain('menor de idade')
    expect(guide).toContain('48 contos')
  })

  it('the runbook 7.4 lists the migrations, the contos bundle and the log check', () => {
    const runbook = read('docs/deploy/STAGING.md')
    for (const text of ['7.4', 'contos_wp_bundle', 'mensagens_seguranca', '20261020_173000_contos_wp_bundle_carga', 'journalctl -u paraiso-update']) {
      expect(runbook).toContain(text)
    }
  })
})

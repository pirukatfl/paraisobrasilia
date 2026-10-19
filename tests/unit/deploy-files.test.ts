import { readFileSync } from 'node:fs'
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

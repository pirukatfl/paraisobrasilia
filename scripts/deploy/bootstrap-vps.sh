#!/usr/bin/env bash
# Paraíso Brasília — preparar o servidor de staging (VPS Hostinger, Ubuntu 24.04).
#
# Roda UMA vez, como root, no Terminal do navegador do hPanel (VPS → Terminal).
# Pode rodar de novo sem estragar nada: segredos e dados existentes são mantidos.
#
# O que faz:
#   1. instala o Docker (se faltar) e libera no firewall (ufw) só as portas 22, 80 e 443
#   2. cria /opt/paraiso-site com docker-compose.yml + Caddyfile
#   3. cria /opt/paraiso-site/.env.staging com senhas geradas aqui mesmo (openssl)
#   4. entra no GitHub Container Registry (ghcr.io) com um token só de leitura
#   5. baixa as imagens, roda as migrações do banco e sobe o site com HTTPS (Caddy)
#   6. instala um timer do systemd que, a cada 5 minutos, baixa a versão nova
#      (se houver), roda as migrações e reinicia o site — publicar = dar push no GitHub
#
# Pergunta só duas coisas: o domínio do staging e o token do GHCR.
# Sem perguntas (opcional): DOMAIN=novo.exemplo.com.br GHCR_TOKEN=ghp_... bash bootstrap-vps.sh
#
# Docs: docs/deploy/STAGING.md. Alternativa por SSH: scripts/deploy/deploy-staging.sh.
set -euo pipefail

# Preenchido pelo desenvolvedor antes de enviar ao cliente (ou passe GHCR_IMAGE=... no ambiente).
GHCR_IMAGE="${GHCR_IMAGE:-ghcr.io/pirukatfl/paraisobrasilia}"
APP_DIR="${APP_DIR:-/opt/paraiso-site}"

say() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }
ok() { printf '\033[1;32m    ok:\033[0m %s\n' "$*"; }
warn() { printf '\033[1;31m    atenção:\033[0m %s\n' "$*" >&2; }
die() {
  printf '\n\033[1;31mERRO:\033[0m %s\n' "$*" >&2
  exit 1
}
# Read from the terminal even when the script itself arrives on stdin (curl ... | bash)
ask() {
  local prompt="$1" secret="${2:-}" answer=""
  if [ -r /dev/tty ]; then
    if [ -n "$secret" ]; then
      read -r -s -p "$prompt" answer </dev/tty
      echo >&2
    else
      read -r -p "$prompt" answer </dev/tty
    fi
  fi
  printf '%s' "$answer"
}

[ "$(id -u)" -eq 0 ] || die "rode como root (no Terminal do hPanel você já é root)."
case "$GHCR_IMAGE" in
  *CHANGE-ME*) die "GHCR_IMAGE não preenchido. Peça ao desenvolvedor o script com a imagem (ex.: ghcr.io/dono/paraiso-site)." ;;
esac
GHCR_IMAGE="$(printf '%s' "$GHCR_IMAGE" | tr '[:upper:]' '[:lower:]')"

# ---------------------------------------------------------------------------
say "1/6 Docker e firewall"
export DEBIAN_FRONTEND=noninteractive
if ! command -v docker >/dev/null 2>&1; then
  command -v curl >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq curl; }
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true
docker compose version >/dev/null 2>&1 || apt-get install -y -qq docker-compose-plugin
ok "$(docker --version)"

command -v ufw >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq ufw; }
command -v openssl >/dev/null 2>&1 || apt-get install -y -qq openssl
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow 22/tcp >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null
ok "ufw: entrada liberada só em 22, 80 e 443 (o banco não tem porta publicada)"

# ---------------------------------------------------------------------------
say "2/6 Arquivos em $APP_DIR"
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# Same content as docker-compose.staging.ghcr.yml in the repo (tests/unit/deploy-files.test.ts)
cat >docker-compose.yml <<'PARAISO_COMPOSE'
# Staging on the client's VPS — pull-based variant: images built by GitHub Actions
# (.github/workflows/deploy-staging.yml) and pulled from GHCR. No source code on the server.
# scripts/deploy/bootstrap-vps.sh installs this file as /opt/paraiso-site/docker-compose.yml
# (keep both in sync: tests/unit/deploy-files.test.ts checks it).
#
#   docker compose --env-file .env.staging pull
#   docker compose --env-file .env.staging run --rm migrate
#   docker compose --env-file .env.staging up -d app caddy
#
# Data lives in named volumes on the server disk: pgdata (database), media (flyers),
# private_media (ClassiSex photos/videos), caddy_data (TLS certificates).
# Backups must copy pgdata, media AND private_media off the server.
name: paraiso-staging

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: paraiso
      POSTGRES_DB: paraiso
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD in .env.staging}
    # No `ports:` on purpose: the database is reachable only on the internal Docker network (T-01-29).
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U paraiso -d paraiso']
      interval: 5s
      timeout: 5s
      retries: 20

  migrate:
    image: ${GHCR_IMAGE:?set GHCR_IMAGE in .env.staging}:migrate-${IMAGE_TAG:-staging}
    profiles: [tools]
    env_file: .env.staging
    environment:
      DATABASE_URI: postgres://paraiso:${POSTGRES_PASSWORD}@db:5432/paraiso
      SITE_ENV: staging
    depends_on:
      db:
        condition: service_healthy

  app:
    image: ${GHCR_IMAGE:?set GHCR_IMAGE in .env.staging}:${IMAGE_TAG:-staging}
    restart: unless-stopped
    env_file: .env.staging
    environment:
      DATABASE_URI: postgres://paraiso:${POSTGRES_PASSWORD}@db:5432/paraiso
      SITE_ENV: staging
      MEDIA_DIR: /app/media
      PRIVATE_MEDIA_DIR: /app/private-media
    volumes:
      # Payload upload staticDir; the image creates /app/media owned by `node`
      - media:/app/media
      # ClassiSex photos/videos: private, served only through the app (never by Caddy)
      - private_media:/app/private-media
    depends_on:
      db:
        condition: service_healthy
    # No published ports: only Caddy talks to the app.

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - '80:80'
      - '443:443'
      - '443:443/udp'
    environment:
      STAGING_DOMAIN: ${STAGING_DOMAIN:?set STAGING_DOMAIN in .env.staging}
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - app

volumes:
  pgdata:
  media:
  private_media:
  caddy_data:
  caddy_config:
PARAISO_COMPOSE

# Same content as Caddyfile in the repo
cat >Caddyfile <<'PARAISO_CADDY'
# Caddy: automatic HTTPS (Let's Encrypt) for the staging domain, proxy to the Next app.
# STAGING_DOMAIN comes from .env.staging (passed to the caddy container by compose).
{$STAGING_DOMAIN} {
	encode zstd gzip
	# Outer guard for uploads (ClassiSex videos up to 100 MB, T-04-09)
	request_body {
		max_size 110MB
	}
	header Strict-Transport-Security "max-age=31536000"
	reverse_proxy app:3000
}
PARAISO_CADDY
ok "docker-compose.yml e Caddyfile"

# ---------------------------------------------------------------------------
say "3/6 Configuração e senhas (.env.staging)"
ENV_FILE="$APP_DIR/.env.staging"
if [ -f "$ENV_FILE" ]; then
  DOMAIN="$(sed -n 's/^STAGING_DOMAIN=//p' "$ENV_FILE" | head -1)"
  ok "já existe; senhas mantidas (domínio: $DOMAIN)"
  # Keep the image name current
  if grep -q '^GHCR_IMAGE=' "$ENV_FILE"; then
    sed -i "s|^GHCR_IMAGE=.*|GHCR_IMAGE=$GHCR_IMAGE|" "$ENV_FILE"
  else
    printf 'GHCR_IMAGE=%s\n' "$GHCR_IMAGE" >>"$ENV_FILE"
  fi
else
  DOMAIN="${DOMAIN:-}"
  while [ -z "$DOMAIN" ]; do
    DOMAIN="$(ask 'Domínio do staging (ex.: novo.swingbrasilia.com.br): ')"
    [ -r /dev/tty ] || break
  done
  DOMAIN="$(printf '%s' "$DOMAIN" | tr '[:upper:]' '[:lower:]' | sed -e 's|^https\?://||' -e 's|/.*$||' -e 's/[[:space:]]//g')"
  printf '%s' "$DOMAIN" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' ||
    die "domínio inválido: '$DOMAIN'"
  umask 077
  cat >"$ENV_FILE" <<EOF
# Gerado por bootstrap-vps.sh em $(date -u +%Y-%m-%dT%H:%M:%SZ). Não compartilhe este arquivo.
POSTGRES_PASSWORD=$(openssl rand -hex 24)
PAYLOAD_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SERVER_URL=https://$DOMAIN
STAGING_DOMAIN=$DOMAIN
SITE_ENV=staging
AGE_GATE_PROVIDER=self-declaration
NEXT_PUBLIC_AGE_GATE_PROVIDER=self-declaration
TZ=America/Sao_Paulo
MEDIA_DIR=/app/media
GHCR_IMAGE=$GHCR_IMAGE
# Voltar versão: troque "staging" por "sha-<commit>" e rode: /opt/paraiso-site/update.sh --force
IMAGE_TAG=staging
EOF
  umask 022
  ok "criado com senhas novas (só neste servidor)"
fi
chmod 600 "$ENV_FILE"

# DNS check (warning only: Caddy keeps retrying the certificate)
SERVER_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1)"
DNS_IP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1 {print $1}')"
if [ -z "$DNS_IP" ]; then
  warn "$DOMAIN ainda não aponta para nenhum IP. Crie o registro A → ${SERVER_IP:-IP deste servidor} no hPanel (Domínios → DNS)."
elif [ -n "$SERVER_IP" ] && [ "$DNS_IP" != "$SERVER_IP" ]; then
  warn "$DOMAIN aponta para $DNS_IP, mas este servidor é $SERVER_IP. O HTTPS só funciona quando apontar para cá."
else
  ok "DNS: $DOMAIN → $DNS_IP"
fi

# ---------------------------------------------------------------------------
say "4/6 Acesso às imagens (ghcr.io)"
REGISTRY_OWNER="$(printf '%s' "$GHCR_IMAGE" | cut -d/ -f2)"
GHCR_USER="${GHCR_USER:-$REGISTRY_OWNER}"
if [ -n "${GHCR_TOKEN:-}" ] || ! grep -qs '"ghcr.io"' /root/.docker/config.json; then
  GHCR_TOKEN="${GHCR_TOKEN:-$(ask 'Token do GitHub só de leitura de pacotes (read:packages). Enter vazio se a imagem for pública: ' secret)}"
  if [ -n "$GHCR_TOKEN" ]; then
    printf '%s' "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin >/dev/null ||
      die "o login no ghcr.io falhou: confira o token (escopo read:packages) e o usuário ($GHCR_USER; mude com GHCR_USER=...)."
    ok "login no ghcr.io como $GHCR_USER"
  else
    ok "sem token: a imagem precisa ser pública"
  fi
  unset GHCR_TOKEN
else
  ok "login no ghcr.io já existe"
fi

# ---------------------------------------------------------------------------
say "5/6 Atualizador automático (a cada 5 minutos)"
cat >"$APP_DIR/update.sh" <<'PARAISO_UPDATE'
#!/usr/bin/env bash
# Baixa a versão nova do site (se houver), roda as migrações e reinicia o app.
# Rodado pelo timer paraiso-update.timer a cada 5 minutos. À mão: /opt/paraiso-site/update.sh --force
set -euo pipefail
cd "$(dirname "$0")"
exec 9>/run/paraiso-update.lock
flock -n 9 || { echo "outra atualização em andamento"; exit 0; }

dc() { docker compose --env-file .env.staging "$@"; }
# Local image IDs of every service (only app and migrate are pulled, so only they change)
image_ids() {
  local ref
  dc --profile tools config --images | sort | while read -r ref; do
    docker image inspect --format '{{.Id}}' "$ref" 2>/dev/null || echo "none"
  done
}

before="$(image_ids)"
dc --profile tools pull --quiet app migrate
after="$(image_ids)"

running=0
dc ps --status running --services 2>/dev/null | grep -qx app && running=1

if [ "${1:-}" = "--force" ] || [ "$before" != "$after" ] || [ "$running" = 0 ]; then
  echo "$(date -Is) nova versão (ou app parado): migrando e reiniciando"
  dc run --rm -T migrate
  dc up -d --remove-orphans app caddy
  docker image prune -f >/dev/null
  echo "$(date -Is) pronto"
else
  echo "$(date -Is) sem versão nova"
fi
PARAISO_UPDATE
chmod 755 "$APP_DIR/update.sh"

cat >/etc/systemd/system/paraiso-update.service <<EOF
[Unit]
Description=Paraíso Brasília: baixa a versão nova do staging e reinicia
After=docker.service network-online.target
Wants=network-online.target
Requires=docker.service

[Service]
Type=oneshot
Environment=HOME=/root
ExecStart=$APP_DIR/update.sh
TimeoutStartSec=900
EOF
cat >/etc/systemd/system/paraiso-update.timer <<'EOF'
[Unit]
Description=Paraíso Brasília: procura versão nova a cada 5 minutos

[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true

[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable paraiso-update.timer >/dev/null 2>&1
ok "timer paraiso-update.timer instalado"

# ---------------------------------------------------------------------------
say "6/6 Primeira publicação (baixar imagens, migrar banco, subir o site)"
"$APP_DIR/update.sh" --force
systemctl start paraiso-update.timer

# The image carries the URL it was built for (GitHub variable STAGING_URL): warn on mismatch
sleep 5
if ! docker compose --env-file "$ENV_FILE" exec -T app node -e \
  "fetch('http://127.0.0.1:3000/').then(r=>r.text()).then(t=>process.exit(t.includes('https://$DOMAIN/')?0:1)).catch(()=>process.exit(2))"; then
  warn "a imagem foi gerada para outro endereço. No GitHub, ajuste a variável STAGING_URL para https://$DOMAIN e rode o workflow deploy-staging de novo."
fi

printf 'Esperando o HTTPS de https://%s ' "$DOMAIN"
code=000
for _ in $(seq 1 24); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "https://$DOMAIN/" || true)"
  [ "$code" = 200 ] && break
  printf '.'
  sleep 5
done
echo
if [ "$code" = 200 ]; then
  ok "site no ar: https://$DOMAIN/"
else
  warn "https://$DOMAIN/ ainda não respondeu 200 (último código: $code). Se o DNS acabou de ser criado, espere alguns minutos."
  warn "Logs: cd $APP_DIR && docker compose --env-file .env.staging logs --tail=100 caddy app"
fi

cat <<EOF

Pronto.
  Site:    https://$DOMAIN/
  Painel:  https://$DOMAIN/admin   (o primeiro acesso cria o usuário da equipe)
  Atualização automática: a cada 5 minutos (journalctl -u paraiso-update -n 50 para ver)
EOF

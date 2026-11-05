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
# Opções (todas opcionais; sem elas, um servidor já configurado continua exatamente como está):
#   DOMAIN         domínio principal. Se mudar em relação ao salvo, o .env.staging é atualizado
#                  (com cópia de segurança .env.staging.bak-<data>) e as senhas são mantidas.
#   ALIAS_DOMAINS  outros endereços que redirecionam (301) para o principal, separados por espaço
#                  ou vírgula (ex.: "www.exemplo.com.br novo.exemplo.com.br"). ALIAS_DOMAINS=""
#                  apaga os apelidos salvos; sem a variável, o valor salvo é mantido.
#   SITE_ENV       staging (Google bloqueado) ou production (páginas públicas liberadas para o Google).
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
      SITE_ENV: ${SITE_ENV:-staging}
    depends_on:
      db:
        condition: service_healthy

  app:
    image: ${GHCR_IMAGE:?set GHCR_IMAGE in .env.staging}:${IMAGE_TAG:-staging}
    restart: unless-stopped
    # SMTP_HOST/PORT/USER/PASS and EMAIL_FROM_* reach the app through this env_file (empty = no e-mail).
    # Never put the SMTP password in this compose file.
    env_file: .env.staging
    environment:
      DATABASE_URI: postgres://paraiso:${POSTGRES_PASSWORD}@db:5432/paraiso
      SITE_ENV: ${SITE_ENV:-staging}
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

ok "docker-compose.yml"

# ---------------------------------------------------------------------------
say "3/6 Configuração e senhas (.env.staging)"
ENV_FILE="$APP_DIR/.env.staging"
HOST_RE='^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'
# "https://Exemplo.com.br/x" -> "exemplo.com.br"
norm_host() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | sed -e 's|^https\?://||' -e 's|/.*$||' -e 's/[[:space:]]//g'
}
# Space/comma separated list -> validated, deduplicated, space separated list
norm_hosts() {
  local out="" h
  for h in $(printf '%s' "$1" | tr ',' ' '); do
    h="$(norm_host "$h")"
    [ -n "$h" ] || continue
    printf '%s' "$h" | grep -Eq "$HOST_RE" || die "domínio inválido: '$h'"
    case " $out " in *" $h "*) ;; *) out="${out:+$out }$h" ;; esac
  done
  printf '%s' "$out"
}
# Set KEY=value in .env.staging (replace the line or append it)
env_set() {
  if grep -q "^$1=" "$ENV_FILE"; then
    sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"
  else
    printf '%s=%s\n' "$1" "$2" >>"$ENV_FILE"
  fi
}
SITE_ENV_IN="$(printf '%s' "${SITE_ENV:-}" | tr '[:upper:]' '[:lower:]')"
case "$SITE_ENV_IN" in
  '' | staging | production) ;;
  *) die "SITE_ENV inválido: '$SITE_ENV' (use staging ou production)." ;;
esac

if [ -f "$ENV_FILE" ]; then
  STORED_DOMAIN="$(sed -n 's/^STAGING_DOMAIN=//p' "$ENV_FILE" | head -1)"
  DOMAIN_IN="$(norm_host "${DOMAIN:-}")"
  if [ -n "$DOMAIN_IN" ] && [ "$DOMAIN_IN" != "$STORED_DOMAIN" ]; then
    printf '%s' "$DOMAIN_IN" | grep -Eq "$HOST_RE" || die "domínio inválido: '$DOMAIN_IN'"
    BACKUP="$ENV_FILE.bak-$(date +%Y%m%d-%H%M%S)"
    cp -p "$ENV_FILE" "$BACKUP"
    chmod 600 "$BACKUP"
    env_set STAGING_DOMAIN "$DOMAIN_IN"
    env_set NEXT_PUBLIC_SERVER_URL "https://$DOMAIN_IN"
    ok "domínio mudou de $STORED_DOMAIN para $DOMAIN_IN (cópia de segurança: $BACKUP)"
    DOMAIN="$DOMAIN_IN"
  else
    DOMAIN="$STORED_DOMAIN"
    ok "já existe; senhas mantidas (domínio: $DOMAIN)"
  fi
  # Aliases: ALIAS_DOMAINS in the environment (even empty) replaces the stored value; unset keeps it
  if [ -n "${ALIAS_DOMAINS+x}" ]; then
    ALIAS_DOMAINS="$(norm_hosts "$ALIAS_DOMAINS")"
    env_set ALIAS_DOMAINS "$ALIAS_DOMAINS"
  else
    ALIAS_DOMAINS="$(sed -n 's/^ALIAS_DOMAINS=//p' "$ENV_FILE" | head -1)"
  fi
  # SITE_ENV: only changes when passed
  if [ -n "$SITE_ENV_IN" ]; then
    env_set SITE_ENV "$SITE_ENV_IN"
  fi
  SITE_ENV="$(sed -n 's/^SITE_ENV=//p' "$ENV_FILE" | head -1)"
  SITE_ENV="${SITE_ENV:-staging}"
  # Keep the image name current
  if grep -q '^GHCR_IMAGE=' "$ENV_FILE"; then
    sed -i "s|^GHCR_IMAGE=.*|GHCR_IMAGE=$GHCR_IMAGE|" "$ENV_FILE"
  else
    printf 'GHCR_IMAGE=%s\n' "$GHCR_IMAGE" >>"$ENV_FILE"
  fi
  # E-mail settings: add only the lines that are missing (empty). Existing values, including
  # SMTP_USER/SMTP_PASS, are never read, changed or printed.
  for pair in 'SMTP_HOST=smtp.hostinger.com' 'SMTP_PORT=465' 'SMTP_USER=' 'SMTP_PASS=' \
    'EMAIL_FROM_ADDRESS=suporte@swingbrasilia.com.br' 'EMAIL_FROM_NAME=Paraíso Brasília'; do
    grep -q "^${pair%%=*}=" "$ENV_FILE" || printf '%s\n' "$pair" >>"$ENV_FILE"
  done
else
  DOMAIN="${DOMAIN:-}"
  while [ -z "$DOMAIN" ]; do
    DOMAIN="$(ask 'Domínio do site (ex.: novo.swingbrasilia.com.br): ')"
    [ -r /dev/tty ] || break
  done
  DOMAIN="$(norm_host "$DOMAIN")"
  printf '%s' "$DOMAIN" | grep -Eq "$HOST_RE" || die "domínio inválido: '$DOMAIN'"
  ALIAS_DOMAINS="$(norm_hosts "${ALIAS_DOMAINS:-}")"
  SITE_ENV="${SITE_ENV_IN:-staging}"
  umask 077
  cat >"$ENV_FILE" <<EOF
# Gerado por bootstrap-vps.sh em $(date -u +%Y-%m-%dT%H:%M:%SZ). Não compartilhe este arquivo.
POSTGRES_PASSWORD=$(openssl rand -hex 24)
PAYLOAD_SECRET=$(openssl rand -hex 32)
NEXT_PUBLIC_SERVER_URL=https://$DOMAIN
STAGING_DOMAIN=$DOMAIN
# Endereços que redirecionam (301) para STAGING_DOMAIN, separados por espaço
ALIAS_DOMAINS=$ALIAS_DOMAINS
# staging = Google bloqueado; production = páginas públicas liberadas para o Google
SITE_ENV=$SITE_ENV
AGE_GATE_PROVIDER=self-declaration
NEXT_PUBLIC_AGE_GATE_PROVIDER=self-declaration
TZ=America/Sao_Paulo
MEDIA_DIR=/app/media
GHCR_IMAGE=$GHCR_IMAGE
# Voltar versão: troque "staging" por "sha-<commit>" e rode: /opt/paraiso-site/update.sh --force
IMAGE_TAG=staging
# E-mail (suporte@swingbrasilia.com.br). Vazio = site sem envio de e-mail. A senha é colocada
# depois, à mão, SEM ecoar: veja docs/deploy/STAGING.md (seção E-mail).
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
EMAIL_FROM_ADDRESS=suporte@swingbrasilia.com.br
EMAIL_FROM_NAME=Paraíso Brasília
EOF
  umask 022
  ok "criado com senhas novas (só neste servidor)"
fi
chmod 600 "$ENV_FILE"

# Caddyfile. Same content as the repo's Caddyfile (the template, with the alias block only as a comment); the real alias block
# (301 to the main domain) is appended only when ALIAS_DOMAINS is not empty.
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

# Other addresses (www, novo, ...) can redirect permanently to the main domain, keeping path and query.
# scripts/deploy/bootstrap-vps.sh writes this block by itself when ALIAS_DOMAINS is set (no need to edit):
# www.exemplo.com.br, novo.exemplo.com.br {
# 	redir https://{$STAGING_DOMAIN}{uri} permanent
# }
PARAISO_CADDY
# Aliases equal to the main domain are dropped
ALIASES=""
for h in $ALIAS_DOMAINS; do
  [ "$h" = "$DOMAIN" ] || ALIASES="${ALIASES:+$ALIASES }$h"
done
ALIAS_DOMAINS="$ALIASES"
if [ -n "$ALIAS_DOMAINS" ]; then
  cat >>Caddyfile <<PARAISO_ALIAS

# Other addresses: permanent redirect to the main domain, keeping path and query
$(printf '%s' "$ALIAS_DOMAINS" | sed 's/ /, /g') {
	redir https://{\$STAGING_DOMAIN}{uri} permanent
}
PARAISO_ALIAS
fi
ok "Caddyfile${ALIAS_DOMAINS:+ (redireciona: $ALIAS_DOMAINS)}"

# DNS check (warning only: Caddy keeps retrying the certificate)
SERVER_IP="$(ip -4 route get 1.1.1.1 2>/dev/null | sed -n 's/.* src \([0-9.]*\).*/\1/p' | head -1)"
SERVER_IP6="$(ip -6 route get 2606:4700:4700::1111 2>/dev/null | sed -n 's/.* src \([0-9a-f:]*\).*/\1/p' | head -1)"
for h in $DOMAIN $ALIAS_DOMAINS; do
  DNS_IP="$(getent ahostsv4 "$h" 2>/dev/null | awk 'NR==1 {print $1}')"
  if [ -z "$DNS_IP" ]; then
    warn "$h ainda não aponta para nenhum IP. Crie o registro A → ${SERVER_IP:-IP deste servidor} no hPanel (Domínios → DNS)."
  elif [ -n "$SERVER_IP" ] && [ "$DNS_IP" != "$SERVER_IP" ]; then
    warn "$h aponta para $DNS_IP, mas este servidor é $SERVER_IP. O HTTPS só funciona quando apontar para cá."
  else
    ok "DNS: $h → $DNS_IP"
  fi
  # AAAA (IPv6): visitors and Let's Encrypt may be sent to another host. ::ffff: = IPv4 mapped, not a real AAAA.
  DNS_IP6="$(getent ahostsv6 "$h" 2>/dev/null | awk '$1 !~ /^::ffff:/ {print $1; exit}')"
  if [ -n "$DNS_IP6" ] && [ "$DNS_IP6" != "$SERVER_IP6" ]; then
    warn "$h tem registro AAAA (IPv6) $DNS_IP6 que não é deste servidor. Apague o AAAA no hPanel, senão parte dos visitantes cai no site antigo."
  fi
done

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

# Re-run: recreate caddy so it picks up both the rewritten Caddyfile (bind mount) and a changed
# STAGING_DOMAIN (container env, fixed at creation; `caddy reload` would keep the old domain).
docker compose --env-file "$ENV_FILE" up -d --force-recreate caddy >/dev/null 2>&1 ||
  warn "não consegui reiniciar o Caddy; rode: cd $APP_DIR && docker compose --env-file .env.staging up -d --force-recreate caddy"

# The image carries the URL it was built for (GitHub variable STAGING_URL): warn on mismatch
sleep 5
if ! docker compose --env-file "$ENV_FILE" exec -T app node -e \
  "fetch('http://127.0.0.1:3000/').then(r=>r.text()).then(t=>process.exit(t.includes('https://$DOMAIN/')?0:1)).catch(()=>process.exit(2))"; then
  warn "a imagem foi gerada para outro endereço. No GitHub (Settings → Secrets and variables → Actions → Variables), ajuste a variável STAGING_URL para https://$DOMAIN (e SITE_ENV=$SITE_ENV) e rode o workflow deploy-staging de novo."
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

# Aliases must answer with a permanent redirect to the main domain (non-fatal)
for h in $ALIAS_DOMAINS; do
  res="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 10 "https://$h/" || true)"
  case "$res" in
    "301 https://$DOMAIN/" | "308 https://$DOMAIN/") ok "https://$h/ → $res" ;;
    *) warn "https://$h/ não redirecionou para https://$DOMAIN/ (resposta: ${res:-nenhuma}). Se o DNS é novo, espere alguns minutos e confira de novo." ;;
  esac
done

cat <<EOF

Pronto.
  Site:    https://$DOMAIN/
  Painel:  https://$DOMAIN/admin   (o primeiro acesso cria o usuário da equipe)
  Redirecionam para o site: ${ALIAS_DOMAINS:-(nenhum)}
  Modo:    $SITE_ENV
  Atualização automática: a cada 5 minutos (journalctl -u paraiso-update -n 50 para ver)
EOF

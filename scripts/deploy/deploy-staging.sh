#!/usr/bin/env bash
# Deploy to staging over SSH (alternative to the GHCR pull flow of bootstrap-vps.sh):
# copies the source to the VPS, builds the images THERE, migrates and restarts.
#
#   STAGING_HOST=203.0.113.10 STAGING_SSH_USER=root scripts/deploy/deploy-staging.sh
#
# Optional: STAGING_DOMAIN (default: read from the server's .env.staging), REMOTE_DIR.
# Idempotent: run it again for every new version. Needs ssh + rsync on this machine.
# Do not mix with the GHCR timer on the same server (bootstrap-vps.sh); pick one flow.
set -euo pipefail

: "${STAGING_HOST:?set STAGING_HOST (VPS IP or hostname)}"
: "${STAGING_SSH_USER:?set STAGING_SSH_USER (user with sudo/docker access)}"
REMOTE_DIR="${REMOTE_DIR:-/opt/paraiso-site}"
TARGET="$STAGING_SSH_USER@$STAGING_HOST"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=15 "$TARGET")
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE="docker compose -f docker-compose.staging.yml --env-file .env.staging"

step() { printf '\n==> %s\n' "$*"; }

step "Checking SSH access to $TARGET"
"${SSH[@]}" true

# sudo only when not root
# shellcheck disable=SC2016 # expands on the server
SUDO="$("${SSH[@]}" '[ "$(id -u)" -eq 0 ] && echo "" || echo "sudo"')"

step "Docker (installed on first run) and firewall (22/80/443 only)"
# shellcheck disable=SC2087 # $SUDO is meant to expand locally
"${SSH[@]}" bash -s <<EOF
set -euo pipefail
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  $SUDO sh /tmp/get-docker.sh
  rm -f /tmp/get-docker.sh
fi
command -v ufw >/dev/null 2>&1 || $SUDO apt-get install -y -qq ufw
command -v rsync >/dev/null 2>&1 || $SUDO apt-get install -y -qq rsync
$SUDO ufw default deny incoming >/dev/null
$SUDO ufw default allow outgoing >/dev/null
for rule in 22/tcp 80/tcp 443/tcp 443/udp; do $SUDO ufw allow "\$rule" >/dev/null; done
$SUDO ufw --force enable >/dev/null
$SUDO mkdir -p "$REMOTE_DIR"
$SUDO chown "\$(id -un)" "$REMOTE_DIR"
EOF

step "Copying the source to $REMOTE_DIR"
rsync -az --delete \
  --include '.env.staging.example' \
  --exclude '.git/' --exclude 'node_modules/' --exclude '.next/' --exclude '.planning/' \
  --exclude '.claude/' --exclude 'tests/' --exclude 'test-results/' --exclude 'playwright-report/' \
  --exclude '/media/' --exclude 'docs/screens/' --exclude '.env' --exclude '.env.*' \
  "$ROOT/" "$TARGET:$REMOTE_DIR/"
# --delete never touches .env.staging: excluded files are protected on the receiver too.

if ! "${SSH[@]}" test -f "$REMOTE_DIR/.env.staging"; then
  cat >&2 <<EOF

ERRO: $REMOTE_DIR/.env.staging não existe no servidor. Crie-o lá (os segredos nunca saem do servidor):

  ssh $TARGET
  cd $REMOTE_DIR && cp .env.staging.example .env.staging && chmod 600 .env.staging
  sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=\$(openssl rand -hex 24)/" .env.staging
  sed -i "s/^PAYLOAD_SECRET=.*/PAYLOAD_SECRET=\$(openssl rand -hex 32)/" .env.staging
  nano .env.staging   # ajuste NEXT_PUBLIC_SERVER_URL e STAGING_DOMAIN

Depois rode este script de novo.
EOF
  exit 1
fi

step "Building images on the server (a few minutes)"
"${SSH[@]}" "cd '$REMOTE_DIR' && $SUDO $COMPOSE --profile tools build"

step "Migrating the database"
"${SSH[@]}" "cd '$REMOTE_DIR' && $SUDO $COMPOSE run --rm -T migrate"

step "Starting app and caddy"
"${SSH[@]}" "cd '$REMOTE_DIR' && $SUDO $COMPOSE up -d --remove-orphans app caddy && $SUDO docker image prune -f >/dev/null"

DOMAIN="${STAGING_DOMAIN:-$("${SSH[@]}" "sed -n 's/^STAGING_DOMAIN=//p' '$REMOTE_DIR/.env.staging' | head -1")}"
step "Checking https://$DOMAIN/"
code=000
for _ in $(seq 1 24); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/" || true)"
  [ "$code" = 200 ] && break
  sleep 5
done
if [ "$code" != 200 ]; then
  echo "https://$DOMAIN/ answered $code (expected 200). Logs: ssh $TARGET 'cd $REMOTE_DIR && $SUDO $COMPOSE logs --tail=100 app caddy'" >&2
  exit 1
fi
echo "OK: https://$DOMAIN/ → 200"

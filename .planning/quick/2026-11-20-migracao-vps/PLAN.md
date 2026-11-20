---
type: quick
slug: migracao-vps
date: 2026-11-20
planner: opus
executor: sonnet
status: planejado (não executar sem o "pode ir" do Furlan)
---

# Plano: migrar o site para uma VPS nova, repositório novo em outra conta GitHub e runner self-hosted

Pedido (Furlan, 2026-11-20): "vamos criar uma nova VPS e migrar toda a aplicação para essa nova VPS, vamos criar um novo
repositório em outra conta github, e também vamos colocar o runner self hosted nessa nova VPS".

Base: `main` f588b1d (PR #102). Nada deste plano foi executado. Ordem de execução: Etapas 0 → 9. As etapas 1 a 6 não
tiram o site do ar; só a Etapa 7 (janela de virada) tem indisponibilidade, estimada em **10 a 20 minutos**.

Convenções neste documento:
- `VELHA` = VPS atual (Hostinger KVM 2, Ubuntu 24.04, IP `187.77.246.132`).
- `NOVA` = VPS nova (IP `NOVO_IP`).
- `NOVO_DONO/NOVO_REPO` = conta e repositório novos no GitHub.
- Comandos com `# VELHA` rodam na VPS atual, `# NOVA` na nova, `# PC` no computador de quem opera.

---

## 1. Inventário: o que roda hoje

| Peça | Onde está hoje | O que acontece na migração |
|---|---|---|
| Site + painel (`app`, Next 16 + Payload 3) | Container na VELHA, imagem `ghcr.io/pirukatfl/paraisobrasilia:staging` | Imagem passa a ser montada **na NOVA** pelo runner self-hosted |
| Migrações (`migrate`) | Imagem `:migrate-staging`, roda antes de cada reinício | Igual, montada na NOVA |
| Banco (`db`, Postgres 16-alpine) | Volume `paraiso-staging_pgdata`, sem porta publicada | `pg_dump` na janela + restore na NOVA |
| Fotos/flyers/vídeos públicos | Volume `paraiso-staging_media` (`/app/media`) | `rsync` antecipado + `rsync` final na janela |
| Fotos/vídeos do ClassiSex, envios de mídia | Volume `paraiso-staging_private_media` (`/app/private-media`), nunca servido pelo Caddy | Igual ao `media` (é o maior; vídeos de até 250 MB) |
| HTTPS (`caddy`, Caddy 2) | Volume `paraiso-staging_caddy_data` (certificados Let's Encrypt + conta ACME) | Copiar o volume: a NOVA já sobe com certificado válido, antes do DNS mudar |
| Configuração e segredos | `/opt/paraiso-site/.env.staging` (600): `POSTGRES_PASSWORD`, `PAYLOAD_SECRET`, SMTP, domínio, `ALIAS_DOMAINS`, `SITE_ENV=production` | Copiar o arquivo **inteiro** (o `PAYLOAD_SECRET` precisa ser o mesmo, senão todos os logins e links de senha caem) |
| Deploy | GitHub Actions (`ubuntu-latest`) monta e publica no GHCR; timer systemd `paraiso-update.timer` puxa a cada 5 min (`/opt/paraiso-site/update.sh`) | Trocado por um job no **runner self-hosted da NOVA** (build + migrate + up). Sem GHCR, sem timer |
| Tarefas agendadas (cron) | Só o `paraiso-update.timer`. Não há cron de app (limpezas rodam dentro de requisições; limites de tentativas ficam na memória) | Timer não é recriado. Entram dois agendamentos novos: backup noturno e limpeza de imagens |
| E-mail | SMTP externo da Hostinger (`smtp.hostinger.com:465`, caixa `suporte@swingbrasilia.com.br`); MX/SPF/DKIM no DNS da Hostinger | Nada muda no e-mail. **Conferir que a NOVA consegue sair pela porta 465** (alguns provedores bloqueiam SMTP em conta nova) |
| Domínio oficial | `swingbrasilia.com.br` (DNS no hPanel da Hostinger): `A @` e `A www` → `187.77.246.132` | Trocar os dois `A` para `NOVO_IP` na Etapa 7 |
| Domínio alias | `paraisobrasilia.com.br` (DNS no Registro.br): `A @` e `A www` → `187.77.246.132`, redireciona 301 para o oficial | Trocar os dois `A` para `NOVO_IP` |
| Site antigo | `anterior.swingbrasilia.com.br` → hospedagem antiga (WordPress) | Não mexer |
| `novo.swingbrasilia.com.br` | Fora de uso desde 05/11/2026 | Pode apagar o registro (ou deixar apontando para a NOVA) |
| Backups | Só snapshots/backups automáticos da Hostinger (backup fora do servidor é pendência da Fase 7) | Backup noturno fora do servidor entra nesta migração (Etapa 2.6) |
| Código | `github.com/pirukatfl/paraisobrasilia` (~2.900 objetos, 7,3 MB, ~100 PRs) | Novo repositório `NOVO_DONO/NOVO_REPO` com todo o histórico (Etapa 3) |

Números que faltam e são medidos na Etapa 0 (definem o tamanho do disco e a duração da janela): tamanho do banco, de
`media` e de `private_media`.

---

## 2. Decisões tomadas neste plano (e por quê)

1. **Build e deploy no próprio runner da NOVA, sem GHCR.** Hoje o build roda no GitHub e a imagem vai para o GHCR. Num
   repositório **privado** de conta gratuita, o GHCR privado tem só 500 MB grátis (a imagem `migrate` sozinha passa disso) e o
   Actions tem 2.000 min/mês; com o ritmo atual de PRs isso estoura. Montando na NOVA: zero minutos do GitHub, zero
   registro, nenhum token guardado no servidor. Voltar versão continua possível porque as imagens ficam marcadas
   `sha-<commit>` no próprio servidor (guardamos as últimas 5).
   *Alternativa se a VPS for pequena (menos de 4 vCPU / 8 GB):* manter o build no `ubuntu-latest` e só o deploy no runner
   (exige GHCR e minutos). Ver pendência P3.
2. **Push direto em vez de timer.** O runner faz migrate + `up -d` logo após o build, com teste de fumaça no fim. Deploy em
   ~5 a 8 minutos após o merge, com resultado visível na aba Actions (hoje: até 15 min e só se vê o resultado no servidor).
3. **Mesmo nome de projeto Compose (`paraiso-staging`) e mesmo arquivo `.env.staging` na NOVA.** Os nomes são herdados do
   staging, mas mudar agora quebraria todos os comandos de `docs/deploy/STAGING.md` e do guia da equipe. Renomear fica para
   depois, se quiserem.
4. **Copiar `caddy_data`** para a NOVA já ter certificado válido de todos os domínios antes da virada do DNS.
5. **Na janela, a VELHA vira um repasse para a NOVA** (Caddy da VELHA faz proxy para a NOVA). Quem ainda resolve o IP
   antigo durante a propagação do DNS cai, mesmo assim, no banco novo. Não há duas bases recebendo cadastros ao mesmo tempo.
6. **Histórico do Git preservado com espelho (`--mirror` sem as refs de PR)**; ver a alternativa "transferir repositório"
   na Etapa 3.

---

## Etapa 0. Preparação (1 a 3 dias antes, sem impacto)

0.1 Medir o que existe na VELHA (só leitura):

```bash
# VELHA
cd /opt/paraiso-site
docker system df -v | grep -E 'paraiso-staging_(pgdata|media|private_media|caddy_data)'
docker compose --env-file .env.staging exec -T db psql -U paraiso -d paraiso -c "select pg_size_pretty(pg_database_size('paraiso'));"
df -h /
grep -E '^(STAGING_DOMAIN|ALIAS_DOMAINS|SITE_ENV|NEXT_PUBLIC_SERVER_URL|IMAGE_TAG|GHCR_IMAGE)=' .env.staging
```

0.2 Conferir TTL: `A @` e `A www` de `swingbrasilia.com.br` (hPanel) e de `paraisobrasilia.com.br` (Registro.br) em
**300 s**. Se estiverem maiores, baixar agora (precisa valer pelo menos o TTL antigo antes da janela).

0.3 Snapshot manual da VELHA no hPanel (VPS → Snapshots e backups) e um `pg_dump` guardado fora do servidor.

0.4 Combinar a janela com a casa: horário de menor movimento (ex.: terça a quinta, 4h a 6h de Brasília). Avisar a equipe
para não publicar nada no painel durante a janela.

---

## Etapa 1. Provisionar a VPS nova

Sugestão de tamanho (com build no servidor): **4 vCPU, 16 GB RAM, 200 GB NVMe**, Ubuntu 24.04 LTS, datacenter no Brasil
(ex.: Hostinger KVM 4 São Paulo). Disco: no mínimo 2× (banco + `media` + `private_media` medidos na 0.1) + 40 GB para
imagens Docker e cache de build. Antes de pagar, confirmar que o provedor aceita conteúdo adulto legal (ver
`docs/discovery/PROVIDERS-AUP.md`) e que **não bloqueia saída na porta 465** (SMTP da Hostinger).

Na criação: cadastrar a **chave SSH pública** de quem vai operar (sem senha de root).

---

## Etapa 2. Hardening e base da NOVA

Entregar como script idempotente `scripts/deploy/harden-vps.sh` (rodado como root uma vez; pode repetir).

2.1 Sistema
```bash
# NOVA (root)
apt-get update && apt-get -y full-upgrade
apt-get install -y ufw fail2ban unattended-upgrades apt-listchanges rsync jq curl ca-certificates gnupg restic
timedatectl set-timezone America/Sao_Paulo
dpkg-reconfigure -f noninteractive unattended-upgrades     # atualizações de segurança automáticas
hostnamectl set-hostname paraiso-prod
```

2.2 Usuários
- `operador` (humano): sudo, só chave SSH.
- `gh-runner` (runner): sem senha, sem sudo, no grupo `docker`. **Aviso:** grupo `docker` equivale a root; por isso o
  repositório tem que ser privado e o runner só roda em push na `main` (Etapa 4.3).

```bash
adduser --disabled-password --gecos "" operador && usermod -aG sudo operador
install -d -m 700 -o operador -g operador /home/operador/.ssh
cp /root/.ssh/authorized_keys /home/operador/.ssh/ && chown operador:operador /home/operador/.ssh/authorized_keys
echo 'operador ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/operador && chmod 440 /etc/sudoers.d/operador
adduser --disabled-password --gecos "" gh-runner
```

2.3 SSH (`/etc/ssh/sshd_config.d/10-paraiso.conf`), **testar o login do `operador` numa segunda janela antes de fechar a
primeira**:
```
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
AllowUsers operador
```
`systemctl reload ssh`. Atenção: com `PermitRootLogin no`, o **Terminal do navegador do hPanel** continua funcionando (é
console, não SSH), então a casa não perde o acesso de emergência.

2.4 Firewall e fail2ban
```bash
ufw default deny incoming && ufw default allow outgoing
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp
ufw --force enable
systemctl enable --now fail2ban          # jail sshd padrão
```
Se o provedor tiver firewall no painel, liberar as mesmas portas. O Docker publica portas por fora do ufw; só o Caddy
publica (80/443) e o banco continua sem porta, então está correto. Não publicar nenhuma outra porta.

2.5 Docker e swap
```bash
curl -fsSL https://get.docker.com | sh
cat > /etc/docker/daemon.json <<'EOF'
{ "log-driver": "local", "log-opts": { "max-size": "20m", "max-file": "5" }, "live-restore": true }
EOF
systemctl restart docker
usermod -aG docker gh-runner
fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
sysctl -w vm.swappiness=10 && echo 'vm.swappiness=10' > /etc/sysctl.d/99-swap.conf
```

2.6 Backup noturno fora do servidor (resolve a pendência de backup da Fase 7)
- `/opt/paraiso-site/backup.sh` (root, via `paraiso-backup.timer` às 3h30): `pg_dump -Fc` do banco para
  `/var/backups/paraiso/` (guarda 7 dias local) e `restic backup` do dump + volumes `media` e `private_media`
  (`/var/lib/docker/volumes/paraiso-staging_{media,private_media}/_data`) para o destino externo. Retenção:
  `restic forget --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune`.
- Destino sugerido: Backblaze B2 (AUP aceita conteúdo adulto legal; ver `docs/discovery/PROVIDERS-AUP.md`). Credenciais
  em `/root/.config/paraiso-backup.env` (600). Senha do repositório restic guardada **também fora do servidor**
  (gerenciador de senhas da casa); sem ela o backup não abre.
- Teste de restauração obrigatório uma vez (Etapa 9.4).
- Alerta: ping para um healthcheck (ex.: Healthchecks.io grátis) no fim do script; sem ping em 26 h, e-mail para a equipe.

2.7 Monitoramento mínimo: monitor externo de HTTP (UptimeRobot ou Healthchecks.io) em `https://swingbrasilia.com.br/` e
`/robots.txt`, a cada 5 min, avisando por e-mail/WhatsApp. Ligar depois da virada.

---

## Etapa 3. Repositório novo em outra conta, com histórico

Duas formas; recomendação: **A (espelho)**, porque o pedido é "novo repositório" e a conta antiga continua existindo.

**A. Espelho (só o Git: commits, branches, tags)**
```bash
# PC
git clone --mirror https://github.com/pirukatfl/paraisobrasilia.git paraiso-mirror.git
cd paraiso-mirror.git
git for-each-ref --format='delete %(refname)' refs/pull | git update-ref --stdin   # refs de PR o GitHub recusa
# criar NOVO_DONO/NOVO_REPO no GitHub, PRIVADO e VAZIO (sem README/licença/.gitignore)
git push --mirror https://github.com/NOVO_DONO/NOVO_REPO.git
```
Conferir: `git ls-remote https://github.com/NOVO_DONO/NOVO_REPO.git | wc -l` e o mesmo SHA de `main` (`f588b1d…` ou
mais novo) nos dois. Não vêm junto: issues, PRs e comentários, Actions (histórico), variáveis e segredos, proteção de
branch, pacotes GHCR, apps instalados.

**B. Transferir o repositório** (Settings → General → Transfer ownership): leva também issues, PRs, estrelas e cria
redirecionamento do endereço antigo. Use se a conta antiga não precisar mais do repositório.

Depois de qualquer das duas:
1. Settings → General: `main` como branch padrão; desligar Wiki/Projects se não usam.
2. Settings → Branches: proteção da `main` (exigir PR, sem force-push, sem apagar).
3. Settings → Actions → General: "Allow actions … created by GitHub + verified creators" (ou lista: `actions/checkout`);
   **Fork pull request workflows: exigir aprovação para todos os colaboradores externos**; Workflow permissions: read.
4. Settings → Secrets and variables → Actions → Variables: `SITE_URL=https://swingbrasilia.com.br`, `SITE_ENV=production`,
   `SITE_DOMAIN=swingbrasilia.com.br` (usados pelo build/smoke na Etapa 4).
5. Instalar o app do Claude no repositório novo (https://github.com/apps/claude/installations/select_target) e trocar o
   repositório do projeto Claude em Project settings → resources, para as próximas threads trabalharem no repo novo.
6. Conta antiga: depois da virada, **desligar o workflow** `deploy-staging` lá (Actions → … → Disable workflow) e arquivar
   o repositório (Settings → Archive), para nenhum push acidental publicar no GHCR antigo. Apagar os pacotes GHCR antigos
   quando a NOVA estiver estável por uma semana.
7. Desenvolvedores: `git remote set-url origin https://github.com/NOVO_DONO/NOVO_REPO.git`.

---

## Etapa 4. Runner self-hosted na NOVA e workflows novos

4.1 Instalar o runner (como `gh-runner`, versão mais recente de https://github.com/actions/runner/releases):
```bash
# NOVA
sudo -iu gh-runner
mkdir actions-runner && cd actions-runner
curl -fsSLo runner.tgz https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-linux-x64-X.Y.Z.tar.gz
# conferir o SHA-256 publicado na página da release
tar xzf runner.tgz
# token: repo novo → Settings → Actions → Runners → New self-hosted runner (vale 1 hora)
./config.sh --url https://github.com/NOVO_DONO/NOVO_REPO --token TOKEN_DE_REGISTRO \
  --name paraiso-prod --labels paraiso-prod --unattended --replace
exit
cd /home/gh-runner/actions-runner && ./svc.sh install gh-runner && ./svc.sh start && ./svc.sh status
```
O runner só faz conexões de saída para o GitHub: nenhuma porta nova no firewall.

4.2 Acesso do runner ao app
- `/opt/paraiso-site` fica `root:gh-runner`, `750`; `.env.staging` `root:gh-runner`, `640` (o runner lê para o
  `docker compose`, ninguém mais). `docker-compose.yml` e `Caddyfile` versionados no repositório e copiados pelo job.
- Backups (`/var/backups/paraiso`) ficam só com root.

4.3 Workflow novo `.github/workflows/deploy.yml` (substitui `deploy-staging.yml`, que é apagado):
```yaml
name: deploy
on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      rollback_tag:
        description: 'Voltar para uma imagem já existente (ex.: sha-abc123def456). Vazio = montar a main.'
        required: false
concurrency: { group: deploy-prod, cancel-in-progress: false }
permissions: { contents: read }
jobs:
  deploy:
    runs-on: [self-hosted, paraiso-prod]
    timeout-minutes: 40
    env:
      APP_DIR: /opt/paraiso-site
    steps:
      - uses: actions/checkout@v4
        if: ${{ !inputs.rollback_tag }}
      - name: Build (migrate + site)
        if: ${{ !inputs.rollback_tag }}
        run: |
          TAG=sha-${GITHUB_SHA::12}
          docker build --target migrate -t paraiso-site-migrate:$TAG .
          docker build --target runner -t paraiso-site:$TAG \
            --build-arg NEXT_PUBLIC_SERVER_URL=${{ vars.SITE_URL }} \
            --build-arg NEXT_PUBLIC_AGE_GATE_PROVIDER=self-declaration \
            --build-arg SITE_ENV=${{ vars.SITE_ENV }} .
          echo "TAG=$TAG" >> "$GITHUB_ENV"
      - name: Escolher versão de rollback
        if: ${{ inputs.rollback_tag }}
        run: echo "TAG=${{ inputs.rollback_tag }}" >> "$GITHUB_ENV"
      - name: Deploy
        run: scripts/deploy/deploy-local.sh "$TAG"    # no rollback: usa a cópia instalada em $APP_DIR
      - name: Teste de fumaça
        run: |
          curl -fsS -o /dev/null https://${{ vars.SITE_DOMAIN }}/
          curl -fsS https://${{ vars.SITE_DOMAIN }}/robots.txt | grep -q 'Sitemap:'
```
Regras de segurança do runner: **nunca** usar `pull_request`/`pull_request_target` com `runs-on: self-hosted`; só
`push` na `main` e `workflow_dispatch`. Um workflow de CI para PRs (lint/testes), se for criado, roda em `ubuntu-latest`.

4.4 Script novo `scripts/deploy/deploy-local.sh TAG` (instalado também em `/opt/paraiso-site/deploy.sh` para uso à mão e
rollback):
1. `flock` (um deploy por vez).
2. Copia `docker-compose.prod.yml` → `$APP_DIR/docker-compose.yml` e `Caddyfile` → `$APP_DIR/Caddyfile` (só se a
   imagem/checkout tiver os arquivos; no rollback mantém os instalados).
3. Grava `IMAGE_TAG=$TAG` no `.env.staging` (guarda o anterior em `PREVIOUS_IMAGE_TAG`).
4. `pg_dump -Fc` rápido para `/var/backups/paraiso/pre-deploy-$TAG.dump` (guarda os 5 últimos) — permite desfazer
   migração.
5. `docker compose run --rm -T migrate` → `docker compose up -d --remove-orphans app caddy` (Caddy só é recriado se o
   Caddyfile mudou).
6. Espera o healthcheck do `app` ficar `healthy` (até 2 min); se não ficar, volta `IMAGE_TAG` para o anterior e sobe de
   novo, e o job falha.
7. Limpa imagens: mantém as 5 últimas `paraiso-site:sha-*` e `paraiso-site-migrate:sha-*`; `docker builder prune
   --keep-storage 20GB -f`.

4.5 Compose novo `docker-compose.prod.yml`: igual ao `docker-compose.staging.ghcr.yml`, trocando só as imagens por
`paraiso-site-migrate:${IMAGE_TAG:?}` e `paraiso-site:${IMAGE_TAG:?}` (locais, sem `GHCR_IMAGE`). Mesmos volumes, mesmo
`name: paraiso-staging`, banco sem porta.

4.6 Arquivos do repositório que mudam (PR único, feito em thread de execução com Sonnet, **antes** da janela):
- novo: `.github/workflows/deploy.yml`, `docker-compose.prod.yml`, `scripts/deploy/deploy-local.sh`,
  `scripts/deploy/harden-vps.sh`, `scripts/deploy/backup.sh`, `scripts/deploy/restore.sh`, `docs/deploy/PRODUCAO.md`
  (operação na NOVA: logs, rollback, backup/restauração, runner).
- `scripts/deploy/bootstrap-vps.sh`: modo `MODE=local` (sem login no GHCR, sem `paraiso-update.timer`, instala
  `deploy.sh` e `backup.sh`); o modo GHCR atual continua para a VELHA até ser desligada.
- `tests/unit/deploy-files.test.ts`: cobrir o compose prod (banco fechado, só Caddy publica, volumes iguais) e trocar
  `pirukatfl/paraisobrasilia` pelo repositório novo onde aparecer.
- `docs/deploy/STAGING.md`: aviso no topo apontando para `PRODUCAO.md`; trocar URLs `raw.githubusercontent.com/pirukatfl/…`.
- apagar `.github/workflows/deploy-staging.yml` **só no repo novo** (no antigo, desligar pelo GitHub).

4.7 Primeiro deploy de teste na NOVA (sem dados reais ainda, DNS ainda na VELHA): rodar o workflow à mão. Esperado:
build ok, migrações rodam num banco vazio, `app` healthy. O teste de fumaça por domínio falha nesse momento (DNS ainda na
VELHA); conferir com `curl --resolve swingbrasilia.com.br:443:NOVO_IP https://swingbrasilia.com.br/ -k -I` (o `-k` só
até copiar o `caddy_data`). Depois **apagar** esse banco de teste (`docker compose down` + `docker volume rm
paraiso-staging_pgdata`) para receber o real.

---

## Etapa 5. Configuração copiada da VELHA (dia anterior ou na véspera)

```bash
# PC (ou NOVA puxando da VELHA com uma chave temporária)
scp root@187.77.246.132:/opt/paraiso-site/.env.staging ./env.staging.tmp
scp ./env.staging.tmp operador@NOVO_IP:/tmp/ && shred -u ./env.staging.tmp
# NOVA
sudo install -o root -g gh-runner -m 640 /tmp/env.staging.tmp /opt/paraiso-site/.env.staging && shred -u /tmp/env.staging.tmp
sudo sed -i '/^GHCR_IMAGE=/d' /opt/paraiso-site/.env.staging    # não usado no modo local
```
Conferir que `POSTGRES_PASSWORD`, `PAYLOAD_SECRET`, `SMTP_*`, `STAGING_DOMAIN=swingbrasilia.com.br`,
`ALIAS_DOMAINS=…`, `SITE_ENV=production` vieram iguais. Testar o e-mail da NOVA (seção 11.2 do STAGING.md, trocando o
serviço por `docker compose run --rm migrate node scripts/deploy/send-test-email.mjs EMAIL`).

Se a casa não tiver SSH na VELHA: cadastrar a chave do operador no hPanel (VPS → Chaves SSH) para a migração e remover
depois, ou copiar o conteúdo pelo Terminal do navegador (nunca pelo chat).

---

## Etapa 6. Cópia antecipada dos dados (sem impacto, véspera)

Mídia é o que mais demora; copiar antes deixa só a diferença para a janela.

```bash
# NOVA: criar volumes vazios com os nomes certos
for v in media private_media caddy_data; do docker volume create paraiso-staging_$v; done
# VELHA → NOVA, com a chave do operador (de preferência rodado na VELHA dentro de tmux)
rsync -aHAX --numeric-ids --info=progress2 \
  /var/lib/docker/volumes/paraiso-staging_media/_data/ \
  operador@NOVO_IP:/tmp/media/          # depois: sudo rsync /tmp/media/ → volume (ou rsync com --rsync-path="sudo rsync")
```
Usar `--rsync-path="sudo rsync"` para gravar direto em `/var/lib/docker/volumes/paraiso-staging_media/_data/` e
`…_private_media/_data/` na NOVA. Donos: os arquivos são do uid 1000 (`node` do container); `--numeric-ids` preserva.
Copiar também `caddy_data` (pequeno). Repetir o `rsync` na noite da janela uma hora antes para encurtar a diferença.

Ensaio do banco (recomendado): `pg_dump -Fc` da VELHA → restore num banco da NOVA → subir o `app` → conferir com
`curl --resolve` (já com HTTPS válido graças ao `caddy_data`) que home, uma festa, `/admin` e o login de assinante
funcionam. Anotar quanto tempo levou dump + restore: é a estimativa real da janela. Depois descartar esse banco.

---

## Etapa 7. Janela de virada (10 a 20 min de site fora)

Quem: operador com acesso às duas VPS + alguém com acesso ao hPanel (DNS) e ao Registro.br. Ter este documento aberto.

| # | Hora | Ação | Onde |
|---|---|---|---|
| 1 | T-60 | `rsync` de `media` e `private_media` mais uma vez | VELHA → NOVA |
| 2 | T-15 | Avisar a equipe: painel fechado. Conferir backup da noite e snapshot recente | — |
| 3 | T0 | **Parar escrita na VELHA**: `systemctl disable --now paraiso-update.timer`; trocar o Caddyfile por uma página de manutenção (503 com "Voltamos em alguns minutos") e `docker compose up -d --force-recreate caddy`; `docker compose stop app` | VELHA |
| 4 | T+1 | Dump final: `docker compose exec -T db pg_dump -U paraiso -Fc paraiso > /root/final.dump` e `sha256sum` | VELHA |
| 5 | T+3 | `rsync` final (com `--delete`) de `media` e `private_media`; copiar `final.dump` para a NOVA e conferir o `sha256sum` | VELHA → NOVA |
| 6 | T+6 | Restaurar: `docker compose up -d db`, esperar healthy, `pg_restore -U paraiso -d paraiso --clean --if-exists --no-owner` (banco recém-criado e vazio) | NOVA |
| 7 | T+9 | Subir o app na versão da `main` já montada: `deploy.sh sha-<main>` (roda `migrate`: deve dizer que não há migração pendente) | NOVA |
| 8 | T+11 | Validação rápida pela NOVA antes do DNS (`curl --resolve …:NOVO_IP`): home 200, `/robots.txt` com `Allow: /`, `/admin` abre, login de um assinante de teste, uma foto do ClassiSex abre logado e dá 401/404 anônimo | PC |
| 9 | T+13 | **VELHA vira repasse**: Caddyfile da VELHA para todos os domínios → `reverse_proxy https://NOVO_IP { header_up Host {host}  transport http { tls_server_name swingbrasilia.com.br } }`; recriar o Caddy. A partir daqui o site está no ar de novo para todo mundo | VELHA |
| 10 | T+14 | **DNS**: hPanel → `swingbrasilia.com.br`: `A @` e `A www` → `NOVO_IP` (TTL 300; apagar AAAA velhos; **não mexer em MX/TXT**). Registro.br → `paraisobrasilia.com.br`: `A @` e `A www` → `NOVO_IP`. `novo` → apagar ou `NOVO_IP` | Painéis |
| 11 | T+15 | Ligar o monitor externo e avisar a equipe que o painel voltou | — |

Fim da indisponibilidade no passo 9. O repasse do passo 9 mantém quem ainda resolve o IP antigo funcionando, sem
gravar nada na VELHA (o `app` e o `db` da VELHA ficam parados).

**Ponto de não volta fácil:** a partir do passo 9 a NOVA recebe cadastros, mensagens e uploads. Voltar depois disso exige
copiar os dados de volta (rollback B).

---

## Etapa 8. Rollback

**A. Antes do passo 9 da janela (nada foi gravado na NOVA):**
1. VELHA: restaurar o Caddyfile original (`cp Caddyfile.bak Caddyfile`), `docker compose up -d app` e
   `docker compose up -d --force-recreate caddy`; `systemctl enable --now paraiso-update.timer`.
2. Não mexer no DNS (ainda não foi trocado). Site volta em 1 a 2 minutos.

**B. Depois do passo 9 (NOVA já recebeu dados), até 48 h após a virada:**
1. Colocar a NOVA em manutenção (mesma página 503) e parar o `app`.
2. `pg_dump -Fc` da NOVA → restaurar na VELHA (`pg_restore --clean`); `rsync` de `media`/`private_media` NOVA → VELHA.
3. VELHA: Caddyfile original, `up -d app`, recriar o Caddy, religar o timer.
4. NOVA vira repasse para a VELHA (mesma técnica do passo 9, invertida) e DNS volta para `187.77.246.132`.

**C. Problema de versão (não de servidor) depois da virada:** Actions → deploy → Run workflow com `rollback_tag =
sha-<anterior>`. Se a versão ruim rodou migração, restaurar o `pre-deploy-*.dump` correspondente (`restore.sh`).

Manter a VELHA **ligada e intacta por 7 dias** depois da virada (só o Caddy em modo repasse). Só então cancelar.

---

## Etapa 9. Validação pós-migração

9.1 Logo após o DNS (pelo celular e por um PC, janela anônima):
- `curl -sI https://swingbrasilia.com.br/ | head -1` → `HTTP/2 200`; `dig +short swingbrasilia.com.br` → `NOVO_IP`.
- `www.swingbrasilia.com.br`, `paraisobrasilia.com.br`, `www.paraisobrasilia.com.br` → 301 para
  `https://swingbrasilia.com.br/…` mantendo caminho e query.
- `/robots.txt` com `Allow: /` e `Sitemap:`; `/sitemap.xml` abre.
- Confirmação 18+, home com festas e flyers, página de festa, Dicas Hot, Contos, Galeria (profissionais/amadoras), vídeo
  do espaço toca.
- Login de assinante (30 dias) e área do assinante; ClassiSex com fotos e vídeos; mensagens.
- Mídia privada fechada: copiar o endereço de uma foto do ClassiSex logado e abrir numa janela anônima → recusado.
- Painel `/admin`: login da equipe, criar uma festa de teste com flyer, ver na home, despublicar e apagar.
- E-mail: "Esqueci minha senha" com uma conta de teste chega (conferir spam); envio de mídia/cadastro com e-mail.
- Banco fechado: `nc -vz NOVO_IP 5432` → recusado. `ssh root@NOVO_IP` → recusado; senha → recusada.
- Teste automático só leitura: `E2E_BASE_URL=https://swingbrasilia.com.br pnpm exec playwright test
  tests/e2e/staging-smoke.spec.ts --project=mobile`.

9.2 Contagens iguais nas duas bases (rodar na VELHA antes do passo 3 e na NOVA depois do passo 7):
```sql
select 'assinantes', count(*) from assinantes union all select 'festas', count(*) from parties
union all select 'anuncios', count(*) from ads union all select 'media', count(*) from media
union all select 'mensagens', count(*) from messages;
```
(conferir os nomes reais das tabelas com `\dt` antes) e `du -sh` dos volumes `media`/`private_media` iguais.

9.3 Deploy pelo runner: fazer um PR pequeno no repositório novo (ex.: texto do `PRODUCAO.md`), mesclar e ver o job
`deploy` verde no runner `paraiso-prod` e a versão nova no ar. Testar um rollback por `workflow_dispatch`.

9.4 Backup: rodar `backup.sh` à mão, ver o snapshot no destino (`restic snapshots`) e restaurar o dump num banco
temporário para provar que abre. Conferir o ping do healthcheck.

9.5 Nas 48 h seguintes: `docker compose logs --since 24h app | grep -iE 'error|erro'`, uso de disco/RAM, renovação de
certificado (o Caddy renova sozinho; conferir em `docker compose logs caddy | grep -i renew` perto de 30 dias), Search
Console sem erros novos.

9.6 Após 7 dias estáveis: desligar e cancelar a VELHA (antes, um último `pg_dump` e snapshot guardados fora), apagar a
chave temporária do operador no hPanel da VELHA, arquivar o repositório antigo e apagar os pacotes GHCR antigos.

---

## Execução (para as threads com Sonnet)

1. **PR de preparação** no repositório novo (Etapa 4.6), com testes unitários passando. Não precisa da VPS.
2. **Provisionamento + hardening + runner** (Etapas 1, 2, 4.1, 4.2, 4.7): roteiro para o operador, com conferência de
   cada saída.
3. **Ensaio** (Etapas 5 e 6).
4. **Janela** (Etapa 7) com o operador ao vivo, seguindo a tabela.
5. **Validação** (Etapa 9) e fechamento.

Quem executa os comandos no servidor: o Claude da thread não tem SSH. Opções: (a) o operador roda os blocos e cola só as
saídas (sem segredos); (b) uma sessão de Remote Control no computador do Furlan, que tenha a chave SSH das duas VPS.

---

## O que depende de você (Furlan / casa)

| # | Item | Para quê | Etapa |
|---|---|---|---|
| P1 | **Conta GitHub de destino** e nome do repositório; dizer se é **espelho** (recomendado) ou **transferência** | Criar o repo novo | 3 |
| P2 | **Provedor, plano e região da VPS** (sugestão: 4 vCPU / 16 GB / 200 GB NVMe, São Paulo) e o **IP** dela | Provisionar | 1 |
| P3 | Confirmar **build no próprio servidor** (recomendado) ou manter o build no GitHub (precisa de GHCR e minutos pagos se o repo for privado) | Desenho do workflow | 2, 4 |
| P4 | **Chave SSH pública** de quem opera e acesso SSH (ou Terminal do hPanel) à VPS **velha** | Copiar dados e `.env.staging` | 2, 5, 6 |
| P5 | Acesso ao **hPanel** (DNS de `swingbrasilia.com.br`) e ao **Registro.br** (`paraisobrasilia.com.br`) na hora da janela | Virada de DNS | 7 |
| P6 | **Token de registro do runner** (gerado na hora em Settings → Actions → Runners; vale 1 h) | Instalar o runner | 4 |
| P7 | **Destino do backup externo** (sugestão: Backblaze B2, conta da casa) e onde guardar a senha do restic | Backup fora do servidor | 2.6 |
| P8 | **Data e horário da janela** (madrugada de dia útil) e aviso à equipe | Virada | 0, 7 |
| P9 | Liberar a instalação do app do Claude no repo novo e trocar o repositório em Project settings → resources | Próximas threads trabalharem no repo novo | 3 |
| P10 | Confirmar com o provedor novo: conteúdo adulto legal permitido e saída SMTP porta 465 liberada | Evitar suspensão e e-mail parado | 1 |

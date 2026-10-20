# Staging — como colocar o site novo no ar (servidor de testes)

O **staging** é uma cópia de testes do site novo, num endereço separado (ex.: `https://novo.swingbrasilia.com.br`).
Ele **não aparece no Google** (bloqueado de propósito) e é onde a equipe testa o painel antes do site oficial.

Tudo roda no servidor VPS da Hostinger, dentro do Docker:

| Peça | O que é |
|---|---|
| `app` | o site + o painel da equipe (`/admin`) |
| `db` | o banco de dados (PostgreSQL), **fechado para a internet** |
| `caddy` | o "porteiro": recebe as visitas e cuida do cadeado HTTPS sozinho |
| `migrate` | roda só durante uma atualização, para ajustar o banco à versão nova |

Existem **dois jeitos** de publicar. Use **só um** no mesmo servidor.

- **Jeito A — automático pelo GitHub (recomendado).** O GitHub monta o site a cada mudança; o servidor busca a versão nova sozinho a cada 5 minutos. Ninguém precisa entrar no servidor depois da primeira vez.
- **Jeito B — por SSH.** O desenvolvedor envia o código do computador dele para o servidor e monta lá. Só funciona para quem tem acesso SSH.

---

## 1. Antes de começar (uma vez só)

### 1.1 Servidor (cliente)

1. Contratar na Hostinger um **VPS KVM 2** (2 vCPU, 8 GB RAM, 100 GB NVMe), sistema **Ubuntu 24.04**, localização **São Paulo**.
2. Anotar o **IP** do servidor: hPanel → menu **VPS** → clique no servidor → aba **Visão geral** (o IP aparece no topo).

### 1.2 Endereço do staging (cliente)

1. hPanel → **Domínios** → clique em `swingbrasilia.com.br` → **DNS / Nameservers** → **Registros DNS**.
2. Em "Adicionar registro": **Tipo** `A` · **Nome** `novo` · **Aponta para** o IP do VPS · **TTL** `300` → **Adicionar registro**.
3. Pode levar de alguns minutos a algumas horas para valer. Se o domínio ainda não estiver pronto, dá para usar
   temporariamente `IP-com-tracos.sslip.io` (ex.: `203-0-113-10.sslip.io`) — combine com o desenvolvedor.

> Se o domínio passar pela Cloudflare, deixe esse registro como **"DNS only" (nuvem cinza)** até o cadeado HTTPS funcionar.

### 1.3 GitHub (desenvolvedor — só no Jeito A)

1. O código fica num repositório no GitHub. O workflow `.github/workflows/deploy-staging.yml` monta duas imagens e publica no
   GitHub Container Registry (`ghcr.io/<dono>/<repo>`):
   - `:staging` e `:sha-<commit>` — o site;
   - `:migrate-staging` e `:migrate-sha-<commit>` — as migrações do banco.
2. No repositório: **Settings → Secrets and variables → Actions → aba Variables → New repository variable**:
   `STAGING_URL` = `https://novo.swingbrasilia.com.br` (o mesmo endereço do DNS acima — ele vai "dentro" da imagem, para os links
   de compartilhamento e o sitemap).
3. Dê push na branch `main` (ou rode o workflow à mão em **Actions → deploy-staging → Run workflow**). Espere ficar verde.
4. Token só de leitura para o servidor baixar as imagens: github.com → foto → **Settings → Developer settings →
   Personal access tokens → Tokens (classic) → Generate new token (classic)**, marcar **apenas `read:packages`**, validade longa
   (ou sem validade). Guarde o token para o passo 2. *(Se preferir deixar a imagem pública — ela não tem senhas —
   em github.com → seu perfil → **Packages** → o pacote → **Package settings → Change visibility → Public**, e o token não é necessário.)*
5. Abra `scripts/deploy/bootstrap-vps.sh` e troque `ghcr.io/CHANGE-ME/paraiso-site` pelo nome real da imagem
   (ex.: `ghcr.io/dono/paraiso-site`, tudo minúsculo). Mande esse arquivo ao cliente (ou cole você mesmo no terminal).

---

## 2. Jeito A — primeira publicação (cliente, ~10 minutos)

Tudo acontece no **Terminal do navegador** da Hostinger, sem instalar nada no seu computador.

1. Entre em **hpanel.hostinger.com** com a conta da casa.
2. Menu da esquerda → **VPS** → clique no servidor → **Gerenciar**.
3. No topo da página do servidor, clique em **Terminal do navegador** (ou **Browser terminal**). Abre uma tela preta, já como `root`.
4. Cole **o bloco inteiro** abaixo (clique com o botão direito → Colar, ou `Ctrl+Shift+V`), substituindo a linha do meio pelo
   conteúdo completo do arquivo `bootstrap-vps.sh` que o desenvolvedor mandou, e aperte **Enter**:

   ```bash
   cat > /root/bootstrap-vps.sh <<'FIM_DO_SCRIPT'
   (cole aqui o conteúdo inteiro de bootstrap-vps.sh)
   FIM_DO_SCRIPT
   bash /root/bootstrap-vps.sh
   ```

5. O script pergunta **duas coisas**:
   - **Domínio do staging** → digite `novo.swingbrasilia.com.br` (sem `https://`) e Enter;
   - **Token do GitHub** → cole o token do passo 1.3 (não aparece na tela enquanto você cola; é normal) e Enter.
     Se a imagem for pública, só aperte Enter.
6. Espere. Ele instala o Docker, liga o firewall (só portas 22, 80 e 443), cria as senhas **no próprio servidor**, baixa o
   site, prepara o banco e sobe tudo. No fim aparece **"Pronto."** com o endereço do site e do painel.
   Se aparecer um aviso em vermelho sobre DNS, espere o DNS valer e rode `bash /root/bootstrap-vps.sh` de novo — pode rodar
   quantas vezes quiser, ele não apaga senhas nem dados.

O que fica no servidor, em `/opt/paraiso-site/`:

| Arquivo | Para quê |
|---|---|
| `docker-compose.yml` | quais peças rodam (igual a `docker-compose.staging.ghcr.yml` do repositório) |
| `Caddyfile` | HTTPS e encaminhamento para o site |
| `.env.staging` | **senhas** e configurações — nunca compartilhe, nunca copie para o GitHub |
| `update.sh` | busca versão nova, migra o banco e reinicia o site |

E um "relógio" do sistema, `paraiso-update.timer`, que roda o `update.sh` a cada 5 minutos.

---

## 3. Criar o primeiro usuário da equipe

1. Abra `https://novo.swingbrasilia.com.br/admin` no navegador.
2. Na primeira vez, o painel mostra **"Criar primeiro usuário"**: preencha e-mail e uma senha forte → **Criar**.
3. Esse primeiro usuário pode criar os demais em **Usuários → Criar novo**. Cada pessoa da equipe deve ter o seu.

Para publicar uma festa: **Festas → Criar novo** → preencher → **Publicar**. Ela aparece na página inicial na hora.
**Despublicar** (no menu do botão Publicar) tira do ar. Festas que já terminaram saem da página inicial sozinhas.

---

## 4. Publicar uma versão nova do site

- **Jeito A:** o desenvolvedor dá push na `main`. Em até ~15 minutos (montagem no GitHub + até 5 min do relógio) a versão nova
  está no ar. Para forçar na hora, no Terminal do navegador: `/opt/paraiso-site/update.sh --force`.
- **Jeito B:** o desenvolvedor roda `scripts/deploy/deploy-staging.sh` de novo (seção 8).

As festas, fotos e usuários **não se perdem** numa atualização: ficam nos volumes do servidor (seção 7).

> **Textos e contato iniciais (Fase 2).** Na primeira atualização com a Fase 2, as migrações criam sozinhas os dados de
> **Contato e endereço** e os seis textos (Quem somos, Normas, Regras, Dicas, Termos de Uso e Política de Privacidade).
> Elas só preenchem o que **ainda não existe**: o que a equipe editar no painel **nunca é sobrescrito** por uma atualização.

---

## 5. Ver o que está acontecendo (logs)

No Terminal do navegador:

```bash
cd /opt/paraiso-site
docker compose --env-file .env.staging ps                      # o que está rodando
docker compose --env-file .env.staging logs --tail=100 app     # erros do site
docker compose --env-file .env.staging logs --tail=100 caddy   # problemas de HTTPS
journalctl -u paraiso-update -n 50                             # últimas atualizações automáticas
systemctl list-timers paraiso-update.timer                     # quando é a próxima checagem
```

(Jeito B: troque `docker compose --env-file .env.staging` por `docker compose -f docker-compose.staging.yml --env-file .env.staging`.)

---

## 6. Voltar para uma versão anterior

**Jeito A:**

1. No GitHub, em **Actions → deploy-staging**, abra a execução da versão boa e copie o código `sha-xxxxxxxxxxxx` do resumo
   (ou veja as tags em **Packages**).
2. No Terminal do navegador:
   ```bash
   cd /opt/paraiso-site
   sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=sha-xxxxxxxxxxxx/' .env.staging
   ./update.sh --force
   ```
3. Para voltar a seguir as versões novas: `sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=staging/' .env.staging && ./update.sh --force`.

**Jeito B:** `git checkout <commit-anterior>` no computador do desenvolvedor e rodar `scripts/deploy/deploy-staging.sh`.

> Atenção: as migrações do banco só andam para frente. Voltar para uma versão **anterior a uma migração** pode quebrar o
> site; nesse caso, restaure também o banco (snapshot da seção 7) ou peça ao desenvolvedor.

---

## 7. Onde ficam os dados e o backup

Tudo fica **no disco do servidor**, em volumes do Docker (decisão de 17/10/2026: fotos no próprio servidor, sem serviço externo):

| Volume | Conteúdo |
|---|---|
| `paraiso-staging_pgdata` | banco de dados: festas, usuários da equipe, textos |
| `paraiso-staging_media` | flyers, fotos do espaço e das modelos enviados pelo painel (e as versões reduzidas geradas automaticamente); vídeos na pasta `/app/media/videos` |
| `paraiso-staging_private_media` | fotos e vídeos dos anúncios do ClassiSex (Fase 4), em `/app/private-media`; nunca públicos |
| `paraiso-staging_caddy_data` | certificados HTTPS (se perder, o Caddy pede outros sozinho) |

**Importante:** como as fotos estão no disco do servidor, **o backup precisa incluir os volumes `pgdata`, `media` e `private_media` e ficar
fora do servidor** — se o servidor quebrar, um backup guardado nele mesmo se perde junto.

**Agora (staging):** ative os backups da Hostinger: hPanel → **VPS** → servidor → **Snapshots e backups** → ative os
**backups automáticos** e crie um **snapshot** antes de mudanças grandes. O backup automatizado completo (banco + fotos,
guardado fora do servidor, com teste de restauração) entra na **Fase 7**, antes do site oficial.


### 7.1 Vídeos e espaço em disco (Fase 2)

Desde a Fase 2 o volume `media` guarda também os **vídeos do espaço**, em `/app/media/videos` (dentro do container `app`).
Vídeo ocupa muito mais espaço que foto, então:

- **Limite por arquivo:** vídeo até **100 MB**; foto até **15 MB** (o painel recusa acima disso, com aviso em português).
- **Como exportar o vídeo antes de enviar:** MP4 (H.264), **720p**, até ~2 minutos — fica bem abaixo de 100 MB e carrega
  rápido no celular. Pelo celular, os apps de edição (ex.: CapCut, InShot) têm a opção "Exportar 720p".
- **Conferir o espaço livre** de vez em quando (e antes de subir muitos vídeos), no Terminal do navegador:

  ```bash
  df -h /                                  # espaço livre do disco do servidor (coluna "Disp"/"Avail")
  docker system df -v | grep media         # quanto o volume de fotos e vídeos já ocupa
  ```

  Se o disco passar de ~80% de uso, avise o desenvolvedor antes de enviar mais vídeos.
- **Backup:** os **snapshots da Hostinger** copiam o disco inteiro, inclusive o volume `media` com as fotos e os vídeos.
  Crie um snapshot antes de mudanças grandes (hPanel → **VPS** → servidor → **Snapshots e backups**).

### 7.2 Assinantes (Fase 3)

- **Migrações:** a Fase 3 traz quatro migrações (`assinantes`, `plans` com os quatro planos iniciais,
  `subscriptions`, `audit_log`). O timer roda `migrate` antes de reiniciar o site, como sempre; não há SQL manual.
  Os planos só são criados se a tabela estiver vazia.
- **Sem e-mail:** o site funciona **sem e-mail** configurado (decisão D-04). Não existe "esqueci minha senha" público:
  a troca de senha é feita pela equipe (senha provisória ou link de nova senha de 48 horas, enviado pelo WhatsApp).
  O aviso "No email adapter provided" no log é esperado.
- **Sessões:** o login do assinante dura 30 dias. Cinco senhas erradas seguidas bloqueiam a conta por 10 minutos.
- **Primeiro assinante:** ninguém cria conta de fora (o cadastro público e o `first-register` estão fechados para
  `assinantes`). A equipe cria as contas no painel, como em `GUIA-DA-EQUIPE.md` → Assinantes.
- **GraphQL desligado:** o site e o painel usam só a API REST; `/api/graphql` responde 404.
- **`NEXT_PUBLIC_SERVER_URL`** precisa ser o endereço público do site: monta o link de nova senha e a lista de
  origens aceitas para o cookie de login.
- **Testar login de assinante:** sempre numa **janela anônima** — o mesmo navegador guarda só um login (painel ou
  assinante).

### 7.3 ClassiSex (Fase 4)

- **Migrações:** a Fase 4 traz quatro migrações (`classisex_ads` com as opções "Eu sou" iniciais, `classisex_moderation`,
  `ad_media`, `ad_reports`). O timer roda `migrate` antes de reiniciar o site; não há SQL manual.
  Depois dela, a migração `classisex_ajustes` (revisão de 20/10/2026) acrescenta o apelido (anúncios antigos recebem
  "Anônimo" até o dono editar), apaga a coluna de e-mail dos anúncios e renomeia as opções Solteira→Mulher e
  Solteiro→Homem (mantendo os anúncios) e cria Trans.
- **Volume novo `private_media`**, montado em `/app/private-media`: guarda as fotos e vídeos dos anúncios. O Caddy nunca
  serve esses arquivos; só o site, depois de conferir o login (um link de foto copiado não abre fora da área do assinante).
- **Passo único (cliente): rodar o `bootstrap-vps.sh` mais uma vez.** O servidor foi preparado antes da Fase 4 e o
  `docker-compose.yml` dele ainda não tem o volume. O script pode rodar de novo sem risco: **mantém** as senhas do
  `.env.staging`, o banco (`pgdata`), as fotos do site (`media`) e os certificados; só reescreve o `docker-compose.yml` e o
  `Caddyfile` (novo volume e limite de 110 MB por envio), reinicia o site e recarrega o Caddy. No Terminal do navegador
  (hPanel → VPS → Terminal), cole **o bloco inteiro** e aperte Enter (o token não aparece enquanto você digita; use um token
  do GitHub com permissão de ler o repositório e `read:packages`):

  ```bash
  read -rsp 'Cole o token do GitHub e aperte Enter: ' GH_TOKEN; echo
  curl -fsSL -H "Authorization: token $GH_TOKEN" -o /root/bootstrap-vps.sh \
    https://raw.githubusercontent.com/pirukatfl/paraisobrasilia/main/scripts/deploy/bootstrap-vps.sh
  DOMAIN=novo.swingbrasilia.com.br GHCR_USER=pirukatfl GHCR_TOKEN="$GH_TOKEN" bash /root/bootstrap-vps.sh
  unset GH_TOKEN
  ```

  Depois confira (cada comando tem uma resposta esperada):

  ```bash
  docker volume ls | grep private_media        # uma linha: paraiso-staging_private_media
  cd /opt/paraiso-site && docker compose --env-file .env.staging exec app sh -c 'echo $PRIVATE_MEDIA_DIR'   # /app/private-media
  journalctl -u paraiso-update -n 50           # mostra as migrações da Fase 4
  ```

  Enquanto o passo não for feito, o envio de fotos e vídeos responde **"Envio de fotos indisponível no momento."** e nada
  é gravado dentro do container.
- **Espaço em disco:** vídeos e fotos dos anúncios ocupam o volume novo. De vez em quando:

  ```bash
  df -h /                                      # espaço livre do disco
  docker system df -v | grep private_media     # quanto o volume do ClassiSex já ocupa
  ```

  Passou de ~80% do disco? Avise o desenvolvedor.
- **Vídeos sem conversão:** o site guarda o vídeo como foi enviado (MP4 ou MOV, até 60 segundos e 100 MB). Não há
  conversão no servidor; se algum celular não tocar o vídeo de outro, conte ao desenvolvedor qual aparelho.
- **Backup:** precisa copiar `pgdata`, `media` **e** `private_media` para fora do servidor (backup automatizado na Fase 7).
  Ative os backups e crie um snapshot da Hostinger agora.

---

## 8. Jeito B — publicar por SSH (alternativa)

Para quem tem acesso SSH ao servidor (chave pública cadastrada em hPanel → VPS → servidor → **Chaves SSH**).

1. Primeira vez: o script recusa continuar sem `/opt/paraiso-site/.env.staging` e mostra os comandos para criá-lo no servidor
   (as senhas são geradas lá com `openssl rand -hex`).
2. Do computador do desenvolvedor, na pasta do projeto:
   ```bash
   STAGING_HOST=203.0.113.10 STAGING_SSH_USER=root scripts/deploy/deploy-staging.sh
   ```
   Ele instala o Docker se faltar, liga o firewall (22/80/443), copia o código, monta as imagens **no servidor**
   (`docker-compose.staging.yml`), roda as migrações, sobe `app` e `caddy` e confere `https://<domínio>/` → 200.

Não use o Jeito B num servidor onde o Jeito A (timer) já está instalado: os dois disputariam o mesmo site.
Para desligar o automático: `systemctl disable --now paraiso-update.timer`.

---

## 9. Conferir o staging (testes automáticos, só leitura)

Do computador do desenvolvedor:

```bash
E2E_BASE_URL=https://novo.swingbrasilia.com.br pnpm exec playwright test tests/e2e/staging-smoke.spec.ts --project=mobile
```

Confere: HTTPS com cadeado e `noindex`, `robots.txt` bloqueando tudo, confirmação 18+, flyer e imagem de compartilhamento
servidos pelo próprio site, rascunhos invisíveis para visitantes, as páginas da Fase 2 (Quem somos, Normas, Regras, Dicas,
Termos, Privacidade, Contato com o link do WhatsApp, Espaço), as páginas da Fase 3 (Assine Já com os planos, Entrar com
`noindex`, área do assinante pedindo login, dados de assinantes fechados para visitantes) e a porta do banco (5432)
fechada. Não cria nem altera nada.

---

## 10. Segurança — resumo

- Senhas só no arquivo `.env.staging` do servidor (permissão 600). Nada de senha no GitHub nem na imagem.
- Banco sem porta aberta para a internet; firewall `ufw` com entrada só em 22 (SSH), 80 e 443.
  Se ligar também o firewall do hPanel (VPS → **Firewall**), libere as mesmas portas 22, 80 e 443.
- O site roda como usuário comum (`node`), não como `root`, dentro do container.
- Recomendado: entrar no servidor só por chave SSH e desligar o login por senha.

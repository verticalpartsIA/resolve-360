# Deploy na Hostinger Node.js

## Princípio de segurança

Este projeto tem dois ambientes separados:

- Lovable preview/dev: `yagpqqrvqbqjgvfcqxby`
- Produção Hostinger: `jkbklzlbhhfnamaeislb`

Os arquivos auto-gerenciados do Lovable continuam intocados. O deploy para Hostinger usa apenas:

- `hostinger/vite.config.node.ts`
- `hostinger/package.scripts.json`
- `hostinger/server.mjs`
- `.github/workflows/deploy-hostinger.yml`

## Pré-requisitos

1. Rodar no Supabase oficial, em ordem, as migrations já existentes em `supabase/migrations/`.
2. Configurar no Supabase oficial:
   - Site URL: `https://aliceblue-dove-844629.hostingersite.com`
   - Redirect URLs:
     - `https://aliceblue-dove-844629.hostingersite.com/**`
     - `https://aliceblue-dove-844629.hostingersite.com/dashboard`
     - `https://aliceblue-dove-844629.hostingersite.com/reset-password`
3. Garantir que o trigger `on_auth_user_created` chama `public.handle_new_user()`.
4. Criar os GitHub Secrets usados pelo workflow antes do primeiro deploy.

## GitHub Secrets esperados

### Build e runtime do app

```text
PROD_VITE_SUPABASE_URL=https://jkbklzlbhhfnamaeislb.supabase.co
PROD_VITE_SUPABASE_PUBLISHABLE_KEY=<anon key do projeto oficial>
PROD_VITE_SUPABASE_PROJECT_ID=jkbklzlbhhfnamaeislb
PROD_SUPABASE_URL=https://jkbklzlbhhfnamaeislb.supabase.co
PROD_SUPABASE_PUBLISHABLE_KEY=<anon key do projeto oficial>
```

### Deploy via FTP

```text
HOSTINGER_FTP_SERVER=<host ftp>
HOSTINGER_FTP_USERNAME=<usuario ftp>
HOSTINGER_FTP_PASSWORD=<senha ftp>
HOSTINGER_FTP_REMOTE_DIR=<diretorio remoto, ex.: /home/u123456789/domains/.../public_html/>
```

### Pós-deploy opcional via SSH

```text
HOSTINGER_SSH_HOST=<host ssh>
HOSTINGER_SSH_PORT=22
HOSTINGER_SSH_USERNAME=<usuario ssh>
HOSTINGER_SSH_PRIVATE_KEY=<chave privada>
HOSTINGER_APP_DIR=<diretorio da app no servidor>
HOSTINGER_RESTART_COMMAND=<comando opcional para reiniciar a app>
```

## Como o workflow funciona

1. Faz `bun install --frozen-lockfile`.
2. Copia `hostinger/vite.config.node.ts` sobre `vite.config.ts` apenas no runner.
3. Executa `bun run build` com as `VITE_*` de produção.
4. Monta um pacote `deploy/` com:
   - `dist/`
   - `server.mjs`
   - `package.json` com script `start` injetado apenas no artefato
   - `package-lock.json`
   - `.env.example`
5. Publica esse pacote como artifact do GitHub Actions.
6. Se os secrets FTP existirem, sobe os arquivos para a Hostinger.
7. Se os secrets SSH existirem, roda `npm install --omit=dev` no servidor e executa o restart configurado.

## Configuração na Hostinger

No hPanel, configure:

- Node.js 20+
- Startup command: `node server.mjs`
- `PORT` preenchido pela própria Hostinger
- Variáveis de ambiente do painel com os mesmos valores do ambiente de produção

## O que não fazer

- Não editar `vite.config.ts`
- Não editar `supabase/config.toml`
- Não editar `src/integrations/supabase/*`
- Não commitar `SUPABASE_SERVICE_ROLE_KEY`
- Não colocar chaves reais do Supabase oficial em arquivos versionados

## Checklist pós-deploy

- [ ] `https://aliceblue-dove-844629.hostingersite.com` abre a home
- [ ] `/login` autentica e redireciona para `/dashboard`
- [ ] `/register` cria usuário com fluxo de confirmação
- [ ] `/recover-password` envia reset
- [ ] Console sem `Missing Supabase environment variable(s)`
- [ ] Logs Node sem erro de RLS
- [ ] `/clientes`, `/produtos` e `/ocorrencias` respondem sem `401` ou `500`
- [ ] Preview do Lovable continua funcional após sync

# Deploy na Hostinger Node.js

## ⚠️ Pré-requisitos críticos

1. **Trocar build target de Cloudflare Workers para Node.** Este projeto está configurado para Workers (`wrangler.jsonc` + preset `cloudflare` no `@lovable.dev/vite-tanstack-config`). Antes de subir:
   - Apagar `wrangler.jsonc`
   - Substituir `vite.config.ts` por uma config TanStack Start com target `node-server`
   - Adicionar script `"start": "node .output/server/index.mjs"` no `package.json`

2. **Schema do Supabase oficial precisa estar criado.** O projeto `jkbklzlbhhfnamaeislb` precisa ter as mesmas tabelas/enums/RLS deste repo. Rode todos os arquivos em `supabase/migrations/*.sql` no SQL Editor do Supabase oficial, em ordem.

3. **Auth URLs no Supabase oficial.** Em `Authentication → URL Configuration`:
   - **Site URL**: `https://aliceblue-dove-844629.hostingersite.com`
   - **Redirect URLs**: adicionar:
     - `https://aliceblue-dove-844629.hostingersite.com/**`
     - `https://aliceblue-dove-844629.hostingersite.com/dashboard`
     - `https://aliceblue-dove-844629.hostingersite.com/reset-password`

## Configurações no painel hPanel da Hostinger

| Campo | Valor |
|---|---|
| Node.js version | 20.x ou superior |
| Application root | raiz do projeto |
| Application URL | `aliceblue-dove-844629.hostingersite.com` |
| Application startup file | `.output/server/index.mjs` |
| Build command | `npm install && npm run build` |
| Startup command | `npm start` |
| Port | (deixe a Hostinger preencher via `process.env.PORT`) |

## Variáveis de ambiente

Cole no painel **Environment Variables** da Hostinger (todas — as `VITE_*` precisam estar presentes na hora do build, não só no runtime):

```
VITE_SUPABASE_URL=https://jkbklzlbhhfnamaeislb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYmtsemxiaGhmbmFtYWVpc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTAzOTMsImV4cCI6MjA5MzM2NjM5M30.8b_EYjvPOcaUmE-ZsW903-sUCmCC5hSV1qhA2k8TUKI
VITE_SUPABASE_PROJECT_ID=jkbklzlbhhfnamaeislb

SUPABASE_URL=https://jkbklzlbhhfnamaeislb.supabase.co
SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYmtsemxiaGhmbmFtYWVpc2xiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3OTAzOTMsImV4cCI6MjA5MzM2NjM5M30.8b_EYjvPOcaUmE-ZsW903-sUCmCC5hSV1qhA2k8TUKI
SUPABASE_SERVICE_ROLE_KEY=<<< pegar no Supabase Dashboard → Project Settings → API >>>

NODE_ENV=production
```

### ⚠️ Sobre a `SUPABASE_SERVICE_ROLE_KEY`

- **NUNCA** commite no GitHub.
- **NUNCA** prefixe com `VITE_`.
- Adicione **somente** no painel da Hostinger.
- Se vazar, gere nova em `Project Settings → API → Reset service_role key`.

## Checklist pós-deploy

- [ ] `https://aliceblue-dove-844629.hostingersite.com` carrega a home
- [ ] `/login` funciona e redireciona para `/dashboard` após login
- [ ] Reset de senha envia e-mail e o link funciona
- [ ] Console do browser sem `VITE_SUPABASE_URL is undefined`
- [ ] Logs do Node sem `Missing Supabase environment variable(s)`
- [ ] Tabelas (clientes, tickets, etc.) carregam dados sem erro de RLS

## Resumo do que foi feito

- `.env.hostinger` na raiz: arquivo de referência com as variáveis (sem a service_role).
- Estas chaves apontam para o Supabase **oficial** `jkbklzlbhhfnamaeislb`.
- O preview do Lovable continua usando o Lovable Cloud (`yagpqqrvqbqjgvfcqxby`) — são ambientes separados.
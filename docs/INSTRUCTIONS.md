# Instruções para o Codex — Deploy VerticalParts (Supabase oficial + Hostinger)

> **Objetivo:** preparar o projeto para rodar no Supabase oficial (`jkbklzlbhhfnamaeislb`) e na Hostinger (`aliceblue-dove-844629.hostingersite.com`) **sem quebrar o ambiente do Lovable** (que usa o Supabase `yagpqqrvqbqjgvfcqxby` via Lovable Cloud).

---

## 0. Princípio fundamental — DOIS AMBIENTES SEPARADOS

| Ambiente | Supabase | URL | Onde mora |
|---|---|---|---|
| **Lovable (preview/dev)** | `yagpqqrvqbqjgvfcqxby` | `*.lovable.app` | Lovable Cloud — auto-gerenciado |
| **Produção (Hostinger)** | `jkbklzlbhhfnamaeislb` | `aliceblue-dove-844629.hostingersite.com` | Supabase oficial + Hostinger Node |

**REGRA DE OURO:** nunca edite arquivos auto-gerenciados pelo Lovable, pois o preview deixa de funcionar e o usuário fica sem ambiente de teste.

### Arquivos PROIBIDOS de editar
- `src/integrations/supabase/client.ts` — auto-gerado
- `src/integrations/supabase/client.server.ts` — auto-gerado
- `src/integrations/supabase/types.ts` — auto-gerado pela API do Supabase
- `src/integrations/supabase/auth-middleware.ts` — auto-gerado
- `.env` — auto-gerado pelo Lovable Cloud
- `src/routeTree.gen.ts` — auto-gerado pelo plugin Vite
- `supabase/config.toml` — `project_id` é do Lovable
- `vite.config.ts` — usa `@lovable.dev/vite-tanstack-config` (preset Cloudflare); não trocar
- `package.json` — não remover `@lovable.dev/vite-tanstack-config` nem adicionar `"sideEffects": false`

Esses arquivos são reescritos pelo Lovable a cada sync. Qualquer alteração manual é perdida e quebra o preview.

---

## 1. O que o Codex DEVE fazer no Supabase oficial (`jkbklzlbhhfnamaeislb`)

### 1.1 Criar o schema rodando as migrations existentes
No SQL Editor do Supabase oficial, **executar em ordem**:

```
supabase/migrations/20260503063612_*.sql
supabase/migrations/20260503063631_*.sql
supabase/migrations/20260503064447_*.sql
supabase/migrations/20260503083959_*.sql
supabase/migrations/20260503084129_*.sql
```

Não inventar SQL novo. Não rodar `ALTER DATABASE`. Apenas reproduzir o estado do Lovable.

### 1.2 Validar o resultado
Após rodar, conferir que existem as tabelas:
`audit_log`, `clientes`, `internal_tickets`, `notifications`, `nps_records`, `produtos`, `profiles`, `sla_config`, `ticket_messages`, `tickets`, `user_roles`.

E os enums: `app_role`, `ticket_status`, `ticket_priority`, `ticket_channel`, `occurrence_reason`, `responsible_sector`, `occurrence_origin`, `resolution_status`, `containment_action`, `customer_tier`, `internal_status`, `message_kind`.

E as funções: `has_role`, `handle_new_user`, `update_updated_at_column`.

### 1.3 Configurar Auth
`Authentication → URL Configuration`:
- **Site URL:** `https://aliceblue-dove-844629.hostingersite.com`
- **Redirect URLs:**
  - `https://aliceblue-dove-844629.hostingersite.com/**`
  - `https://aliceblue-dove-844629.hostingersite.com/dashboard`
  - `https://aliceblue-dove-844629.hostingersite.com/reset-password`

`Authentication → Providers → Email`:
- Confirm email: **ativado** (segurança)
- Password HIBP check: **ativado**

### 1.4 Trigger `handle_new_user`
Verificar que o trigger `on_auth_user_created` em `auth.users` chama `public.handle_new_user()`. Se não estiver, criar:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### 1.5 Storage
Por enquanto não há buckets. Não criar.

---

## 2. O que o Codex DEVE fazer no GitHub / código (para Hostinger)

### 2.1 NÃO commitar arquivos auto-gerenciados
Manter intactos os arquivos da seção "PROIBIDOS de editar" acima. O sync do Lovable já cuida deles.

### 2.2 Adaptação Hostinger — fazer em arquivos NOVOS, não nos do Lovable

A Hostinger roda Node.js, mas o `vite.config.ts` do Lovable tem preset Cloudflare Workers. Para gerar build Node sem quebrar o Lovable:

**Opção recomendada:** criar um workflow no GitHub Actions que, no `main`, faz build com config alternativa e publica via FTP/SSH na Hostinger. **Não trocar o `vite.config.ts` do repo.**

Estrutura sugerida (adicionar como arquivos NOVOS):
```
.github/workflows/deploy-hostinger.yml
hostinger/vite.config.node.ts        # config alternativa apontando para preset node-server
hostinger/package.scripts.json       # scripts extras (build:node, start)
```

No workflow:
1. `bun install`
2. `cp hostinger/vite.config.node.ts vite.config.ts` (apenas dentro do runner — não commita de volta)
3. `bun run build`
4. Upload de `.output/` + `package.json` + `node_modules` (ou `bun install --production` no servidor) via FTP/SSH para a Hostinger.

### 2.3 Variáveis de ambiente na Hostinger (painel hPanel → Environment Variables)

```
VITE_SUPABASE_URL=https://jkbklzlbhhfnamaeislb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...8b_EYjvPOcaUmE-ZsW903-sUCmCC5hSV1qhA2k8TUKI
VITE_SUPABASE_PROJECT_ID=jkbklzlbhhfnamaeislb
SUPABASE_URL=https://jkbklzlbhhfnamaeislb.supabase.co
SUPABASE_PUBLISHABLE_KEY=<mesmo valor de VITE_SUPABASE_PUBLISHABLE_KEY>
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...WoFDfpykUrwQcg0uzDwgfKSwWCy-7zrrJGWGOpo5drs
NODE_ENV=production
PORT=<a Hostinger preenche>
```

**As `VITE_*` precisam estar presentes no momento do BUILD** (no GitHub Actions ou no Hostinger Build), não só no runtime. Adicionar como GitHub Secrets também.

### 2.4 NUNCA commitar
- `SUPABASE_SERVICE_ROLE_KEY` (em nenhum arquivo, nem com prefixo `VITE_`)
- `.env` real (manter `.env.example` apenas)
- Qualquer chave do Supabase oficial em código-fonte

---

## 3. Fluxo de commit

Antes de cada commit no `main`, o Codex deve verificar:

- [ ] Nenhum arquivo da lista "PROIBIDOS" foi alterado
- [ ] `supabase/config.toml` ainda tem `project_id = "yagpqqrvqbqjgvfcqxby"` (Lovable)
- [ ] `vite.config.ts` ainda importa de `@lovable.dev/vite-tanstack-config`
- [ ] Nenhum segredo do Supabase oficial está hardcoded
- [ ] Migrations novas (se houver) seguem o padrão `YYYYMMDDHHMMSS_descricao.sql` em `supabase/migrations/`
- [ ] Migrations novas foram aplicadas TAMBÉM no Supabase oficial (manualmente ou via CLI)

---

## 4. Checklist pós-deploy

- [ ] `https://aliceblue-dove-844629.hostingersite.com` carrega home
- [ ] `/login` autentica e redireciona para `/dashboard`
- [ ] `/register` cria usuário (verificar email)
- [ ] `/recover-password` envia email de reset
- [ ] Console do browser **sem** `Missing Supabase environment variable(s)`
- [ ] Logs do Node **sem** erros de RLS
- [ ] `/clientes`, `/produtos`, `/ocorrencias` listam dados (mesmo que vazios) sem 401/500
- [ ] Lovable preview (`*.lovable.app`) **continua funcionando** após o sync do GitHub

---

## 5. Spec / SDD — separação de responsabilidades

| Camada | Quem mantém | Onde |
|---|---|---|
| Schema do banco (DDL) | Lovable agent (via migrations) | `supabase/migrations/` — espelhado nos 2 Supabase |
| Tipos TS do banco | Supabase API (auto) | `src/integrations/supabase/types.ts` |
| Cliente Supabase (browser) | Lovable agent (auto) | `src/integrations/supabase/client.ts` |
| Cliente Supabase (server) | Lovable agent (auto) | `src/integrations/supabase/client.server.ts` |
| Auth middleware | Lovable agent (auto) | `src/integrations/supabase/auth-middleware.ts` |
| Build config Lovable/Cloudflare | Lovable agent | `vite.config.ts` |
| Build config Hostinger/Node | Codex | `hostinger/*` (arquivos novos) |
| Workflow CI/CD | Codex | `.github/workflows/*.yml` |
| Variáveis de ambiente Hostinger | Usuário (painel hPanel) | painel da Hostinger |
| Configuração Auth no Supabase oficial | Usuário (dashboard) | dashboard `jkbklzlbhhfnamaeislb` |

**Regra:** se o Codex precisar mexer em algo da coluna "Lovable agent (auto)", PARE e abra issue. Provavelmente existe um caminho alternativo (arquivo novo, workflow, script externo) que resolve sem tocar no que o Lovable controla.

---

## 6. Em caso de conflito

Se um sync do GitHub trouxer mudanças do Codex que tocam arquivos auto-gerenciados, o Lovable vai sobrescrever. Para evitar:

1. Codex trabalha apenas em: `hostinger/`, `.github/`, `docs/`, `supabase/migrations/` (apenas adições novas), arquivos de aplicação (`src/routes`, `src/components`, `src/lib`).
2. Pull requests devem listar explicitamente os arquivos alterados — qualquer arquivo da lista "PROIBIDOS" requer revisão manual antes do merge.
3. Em caso de divergência: **o Lovable vence** nos arquivos auto-gerenciados; o Codex vence nos arquivos de aplicação.
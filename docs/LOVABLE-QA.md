# Spec/SDD — Respostas Lovable para deploy Hostinger

> Documento de alinhamento entre o **Lovable agent** (fabricante dos arquivos auto-gerenciados) e o **Codex** (responsável pelo build alternativo Node/Hostinger e pelo Supabase oficial `jkbklzlbhhfnamaeislb`).
>
> Todas as respostas abaixo refletem o comportamento atual do projeto **VerticalParts / Resolve 360** rodando no preset Lovable Cloud + TanStack Start (Cloudflare Workers).

---

## 1. Qual é o repositório canônico deste projeto hoje: `resolve-360` ou `posvenda360`?

O Lovable **não decide** isso — quem cria/conecta o repositório é o usuário em **Connectors → GitHub**. O projeto Lovable é identificado por:

- **Lovable project ID:** `fc5515f6-8402-4b48-a4e9-91a62f60f8b5`
- **Supabase Lovable Cloud:** `yagpqqrvqbqjgvfcqxby`

➡️ **Ação recomendada:** abra **Connectors → GitHub** no Lovable e verifique qual repo está atualmente conectado. Esse é o canônico. Trabalhe **sempre** nesse repo; o outro deve ser arquivado para evitar que o Codex commite no fork errado.

---

## 2. Quais arquivos são efetivamente auto-gerenciados pelo Lovable?

Lista completa (qualquer alteração manual é sobrescrita no próximo sync):

- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/client.server.ts`
- `src/integrations/supabase/auth-middleware.ts`
- `src/integrations/supabase/types.ts` (regenerado pela API do Supabase Lovable Cloud)
- `src/routeTree.gen.ts` (gerado pelo plugin Vite a cada build/dev)
- `.env` (gerado pelo Lovable Cloud com `VITE_SUPABASE_*`)
- `supabase/config.toml` — campo `project_id` é fixo do Lovable; blocos de função podem ser adicionados pelo agent
- `vite.config.ts` — usa preset `@lovable.dev/vite-tanstack-config`
- `package.json` — o agent gerencia dependências; remoção de `@lovable.dev/vite-tanstack-config` ou adição de `"sideEffects": false` quebra o preview
- `bun.lockb`
- `wrangler.jsonc` — config do runtime Cloudflare Workers do preview

➡️ **Codex deve trabalhar apenas em:** `src/routes/`, `src/components/`, `src/lib/`, `src/hooks/`, `docs/`, `hostinger/` (novo), `.github/workflows/` (novo) e **adicionar** novas migrations em `supabase/migrations/` (nunca editar as existentes).

---

## 3. O `vite.config.ts` atual usa apenas Cloudflare/Lovable preview ou existe um caminho oficial para build Node?

O `vite.config.ts` atual é **exclusivamente** Cloudflare Workers — o preset `@lovable.dev/vite-tanstack-config` injeta `tanstackStart`, `viteReact`, `tailwindcss`, `tsConfigPaths`, plugin `cloudflare` (build-only) e `componentTagger` (dev-only).

❌ **Não existe** flag oficial para alternar para `node-server` dentro do mesmo arquivo sem perder o preview.

✅ **Caminho suportado:** manter `vite.config.ts` intocado e criar **um arquivo separado** (ex.: `hostinger/vite.config.node.ts`) usado apenas no pipeline de build da Hostinger.

---

## 4. O preset aceita uma config paralela para target Node sem alterar o arquivo principal?

Sim, com a ressalva de que o preset **inclui o plugin Cloudflare**. Para Node, **não use o preset** — escreva uma config TanStack Start nativa em `hostinger/vite.config.node.ts`:

```ts
import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsConfigPaths(),
    tailwindcss(),
    tanstackStart({ target: "node-server" }),
    viteReact(),
  ],
  resolve: {
    dedupe: ["react", "react-dom", "@tanstack/react-router", "@tanstack/react-start"],
  },
});
```

Esse arquivo é **copiado por cima do `vite.config.ts` apenas dentro do runner do GitHub Actions** (não commitado de volta). O preview Lovable continua usando o original.

---

## 5. Existe recomendação oficial do Lovable para deploy TanStack Start em Hostinger?

❌ **Não.** A recomendação oficial é:

1. **Publish nativo do Lovable** (`*.lovable.app` ou domínio customizado em **Project Settings → Domains**) — zero config, mantém o ambiente Cloudflare Workers.
2. **Self-hosting genérico** documentado em <https://docs.lovable.dev/tips-tricks/self-hosting>.

Hostinger Node não está na lista oficial. O caminho descrito em `docs/INSTRUCTIONS.md` (build alternativo via GitHub Actions) é uma **adaptação do usuário**, não suportada oficialmente. Tudo bem fazer, desde que respeite a regra de não tocar nos arquivos auto-gerenciados.

---

## 6. As migrations em `supabase/migrations/` representam 100% do schema esperado?

✅ **Sim**, para o que o agent gerou. O agent **sempre** cria migrations versionadas (`YYYYMMDDHHMMSS_*.sql`) para qualquer alteração de schema, RLS, função ou trigger.

⚠️ **Exceções possíveis** (alterações fora das migrations):

- Configurações de **Auth** (Site URL, Redirects, providers) — feitas via dashboard, **não** ficam nas migrations.
- **Storage buckets** — quando criados via UI; aqui hoje não há buckets.
- **Secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`, etc.) — armazenados no Vault, fora do SQL.
- Edits manuais que o usuário faça direto no SQL Editor do Supabase Lovable Cloud — **não recomendado**.

➡️ Para reproduzir 100% no Supabase oficial: rodar todas as migrations em ordem **+** replicar Auth URLs e secrets manualmente.

---

## 7. O `src/integrations/supabase/types.ts` pode apontar para outro Supabase?

❌ **Não sem quebrar o sync.** Esse arquivo é regenerado pela introspecção do **Supabase Lovable Cloud** (`yagpqqrvqbqjgvfcqxby`) a cada migration aprovada. Se o Codex regenerar a partir do Supabase oficial e os schemas divergirem, o próximo sync do Lovable sobrescreve.

✅ **Estratégia segura:** manter os **dois Supabase com schema idêntico** (mesmas migrations, mesma ordem). Assim `types.ts` serve aos dois e o sync nunca causa drift.

---

## 8. Há fluxo oficial para manter dois Supabase separados (preview + produção)?

❌ Não há um fluxo oficial Lovable. O padrão de mercado (Supabase CLI) é:

1. **Supabase Lovable Cloud** = ambiente de **dev/preview** (gerenciado pelo Lovable agent, schema sempre à frente).
2. **Supabase oficial `jkbklzlbhhfnamaeislb`** = **produção** (recebe migrations apenas após validação no preview).

Sincronização recomendada:

- Cada migration nova vai primeiro para o Lovable Cloud (via agent).
- Após o merge no `main`, o GitHub Actions roda `supabase db push --db-url $PROD_DB_URL` ou aplica via SQL Editor manualmente.
- **Nunca** rode migrations em produção que não passaram pelo preview.

---

## 9. O Lovable sobrescreve apenas arquivos auto-gerenciados ou também trechos de arquivos de aplicação?

✅ **Apenas auto-gerenciados.** Arquivos em `src/routes/`, `src/components/`, `src/lib/`, `src/hooks/`, `docs/` etc. **só são alterados quando o usuário pede explicitamente** (chat com o agent).

⚠️ Quando o usuário pede uma alteração que toca um arquivo de aplicação, o agent reescreve **o trecho necessário** (via patch), não o arquivo inteiro — mas qualquer alteração que o Codex tenha feito naquela mesma região pode ser sobrescrita se houver conflito. Resolução: **pull requests pequenos** e revisão manual de diff antes do merge.

---

## 10. Forma recomendada de publicar para produção sem quebrar o preview?

**Ranking de menor para maior risco:**

| Estratégia | Risco preview | Esforço | Recomendado quando |
|---|---|---|---|
| **A. Publish nativo Lovable + custom domain** | Zero | Mínimo | Sempre que possível |
| **B. GitHub Actions com build alternativo (`hostinger/vite.config.node.ts`)** | Baixo | Médio | Hostinger é requisito fixo |
| **C. Export estático (`vite build` SPA)** | Médio | Baixo | App não usa server functions |
| **D. Trocar `vite.config.ts` no repo** | **ALTO — quebra preview** | Baixo | ❌ Nunca |

**Estratégia escolhida neste projeto:** **B**.

Fluxo:

1. Codex commita em `main` apenas arquivos da seção "permitidos" (questão 2).
2. GitHub Actions:
   - `bun install`
   - `cp hostinger/vite.config.node.ts vite.config.ts` (apenas no runner)
   - `bun run build` com env `VITE_SUPABASE_*` apontando para `jkbklzlbhhfnamaeislb`
   - Upload `.output/` via FTP/SSH para a Hostinger
3. Lovable continua sincronizando o `main` e regenerando `types.ts`/`routeTree.gen.ts` sem conflito (porque o `vite.config.ts` do repo nunca foi alterado).

---

## Resumo executivo

- ✅ **Mantenha dois ambientes 100% separados**, mesmo schema, configs distintas.
- ✅ **Codex trabalha apenas fora da zona auto-gerenciada** (questão 2).
- ✅ **Build Hostinger fica isolado** em `hostinger/` + GitHub Actions.
- ❌ **Nunca** edite `vite.config.ts`, `package.json` (remover preset), `supabase/config.toml`, `src/integrations/supabase/*`, `.env`, `routeTree.gen.ts` ou `wrangler.jsonc` para "ajustar" Hostinger.
- ⚠️ **Drift de schema** entre os dois Supabase é o maior risco operacional — automatize a aplicação de migrations em produção.

---

_Última atualização: 2026-05-03 — válido enquanto o projeto usar `@lovable.dev/vite-tanstack-config` com preset Cloudflare Workers._
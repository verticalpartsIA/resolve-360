# Spec/SDD — Respostas para Claude Code (alinhamento repo ↔ Lovable ↔ Supabase oficial)

> Documento complementar a `docs/INSTRUCTIONS.md` e `docs/LOVABLE-QA.md`. Responde 4 perguntas operacionais do Claude Code antes do commit que vai disparar deploy automático na Hostinger.
>
> Contexto fixo:
> - **Lovable project ID:** `fc5515f6-8402-4b48-a4e9-91a62f60f8b5`
> - **Supabase Lovable Cloud (preview):** `yagpqqrvqbqjgvfcqxby`
> - **Supabase oficial (produção):** `jkbklzlbhhfnamaeislb`
> - **Hostinger:** `aliceblue-dove-844629.hostingersite.com`

---

## 1. O repositório `resolve-360` no GitHub é export do Lovable ou independente?

**Resposta:** o repositório conectado ao Lovable **É** o próprio projeto Lovable. Lovable não faz "export" — ele mantém **sync bidirecional** com o GitHub via Lovable GitHub App. Tudo que o agent gera (rotas, migrations, `vite.config.ts`, `client.ts`, `types.ts`, etc.) é commitado no repo conectado em tempo real.

**Como confirmar qual é o repo canônico:**
1. Abra **Connectors → GitHub** dentro do Lovable.
2. O repositório listado lá é o canônico. Esse repo **deve** conter:
   - `vite.config.ts` importando de `@lovable.dev/vite-tanstack-config`
   - `src/integrations/supabase/client.ts` (auto-gerado)
   - `src/routes/__root.tsx` + `src/routes/index.tsx`
   - `supabase/migrations/2026050306*.sql` (5 arquivos — confirmados presentes neste workspace)
   - `wrangler.jsonc`
   - `package.json` com `@lovable.dev/vite-tanstack-config` em devDependencies

**Se `resolve-360` no GitHub tem estrutura "completamente diferente"** (ex.: `server.js` na raiz, sem `src/routes/`, sem `vite.config.ts` Lovable, sem `supabase/migrations/`), então:
- Ou **não é** o repo conectado ao Lovable (alguém criou um repo paralelo).
- Ou alguém **reescreveu** o repo fora do Lovable, o que **quebra o sync** — o agent vai sobrescrever na próxima alteração.

➡️ **Ação para Claude Code:** **PARE** antes de commitar. Confirme em **Connectors → GitHub** qual é o repo conectado. Se for `resolve-360` e a estrutura divergir, o caminho correto é **reverter `resolve-360` para o estado do Lovable** (não o contrário). O `posvenda360` provavelmente é o repo canônico ou um fork antigo — arquive o que não for usado.

---

## 2. Existe export ZIP/GitHub do projeto Lovable? Onde está o `vite.config.ts` com `@lovable.dev/vite-tanstack-config`?

**Resposta:** não existe "export ZIP" oficial. O caminho único é o **GitHub sync** (questão 1).

- **Branch canônico:** `main` do repositório conectado em **Connectors → GitHub**.
- **`vite.config.ts` esperado** (estado atual neste workspace, fonte da verdade):
  ```ts
  import { defineConfig } from "@lovable.dev/vite-tanstack-config";
  export default defineConfig();
  ```
- Esse arquivo **já existe** neste workspace. Se no GitHub `resolve-360` ele estiver diferente (ex.: importando `vite` direto, com `server.js`, etc.), é divergência — sobrescreva o GitHub com o conteúdo deste workspace, **não** o contrário.

**Alternativa de download manual:** GitHub → repo conectado → **Code → Download ZIP**. Isso traz o estado real do Lovable. Não há outro export.

---

## 3. As migrations `20260503*.sql` precisam ser aplicadas manualmente no Supabase oficial?

**Resposta:** **SIM, manualmente.** Lovable sincroniza migrations apenas com o **Supabase Lovable Cloud** (`yagpqqrvqbqjgvfcqxby`). O Supabase oficial (`jkbklzlbhhfnamaeislb`) **não recebe nada automaticamente**.

**Estado das migrations neste workspace** (presentes em `supabase/migrations/`):
```
20260503063612_2f2778af-3b8a-4c99-90d6-9723a0cbd2e1.sql
20260503063631_6a52f3be-91cd-4400-8ce9-99dc360c17b8.sql
20260503064447_a64c53cf-795f-4abf-aa57-b0da0d0e1736.sql
20260503083959_4b40f431-cec9-425b-b966-ae110b503bbe.sql
20260503084129_a0289757-2aa0-4dd2-8e2c-a0fb50e3fa2e.sql
```

Essas migrations **existem** no projeto Lovable e devem estar no repo canônico. Se não estão em `resolve-360`, é confirmação de divergência (questão 1).

**Como aplicar no Supabase oficial:**

**Opção A — manual via SQL Editor (mais simples, recomendado uma vez):**
1. Dashboard do Supabase oficial → SQL Editor.
2. Para cada arquivo, em ordem cronológica (timestamp ascendente), copie e execute o conteúdo.
3. Após todos, valide tabelas/enums/funções listadas em `docs/INSTRUCTIONS.md` §1.2.

**Opção B — Supabase CLI (recomendado para CI futuro):**
```bash
supabase link --project-ref jkbklzlbhhfnamaeislb
supabase db push
```
Requer `SUPABASE_ACCESS_TOKEN` e senha do banco oficial. Idealmente automatizado em GitHub Actions após merge no `main`.

**Regra de drift:** sempre que o Lovable agent criar uma migration nova, Claude Code precisa replicá-la no Supabase oficial **antes** ou **junto** do deploy. Schemas divergentes quebram o `types.ts` e a aplicação em produção.

---

## 4. O `server.js` na raiz do repo é compatível com o output esperado do Lovable?

**Resposta:** **NÃO. E ele não deveria existir.** Foi removido neste workspace (commit anterior: "deleted server.js"). Se ainda aparece no `resolve-360`, é resíduo de uma adaptação manual antiga que **conflita** com o que o Lovable gera.

**O que o Lovable gera no build (preset `@lovable.dev/vite-tanstack-config`):**
- Output em `.output/` (não `dist/`) com runtime **Cloudflare Workers**.
- Entry point é `_worker.js` para Cloudflare, **não** um `server.js` Node Express.
- O `wrangler.jsonc` na raiz declara o handler.

**Para Hostinger (Node), o caminho correto** (já implementado neste workspace):
- `hostinger/server.mjs` — bootstrap Node HTTP que serve o output do TanStack Start em modo `node-server`.
- `hostinger/vite.config.node.ts` — config alternativa com `tanstackStart({ target: "node-server" })`.
- `.github/workflows/deploy-hostinger.yml` — pipeline que copia a config Node, builda e publica.

➡️ **Ação para Claude Code:**
1. **Apagar** qualquer `server.js` ou `server.mjs` na **raiz** do `resolve-360`. O único `server.mjs` permitido fica em `hostinger/server.mjs`.
2. **Não criar** entry points alternativos (`entry-server.tsx`, `entry-client.tsx`, `app.js`) — TanStack Start v1 gera tudo via Vite plugin.
3. **Não substituir** `vite.config.ts`. O build Hostinger usa cópia temporária dentro do GitHub Actions runner (`cp hostinger/vite.config.node.ts vite.config.ts` apenas no step de build, sem commit de volta).
4. O output a publicar na Hostinger é `.output/` + `hostinger/server.mjs` + `package.json` + `package-lock.json` (ou `bun.lockb`).

---

## Resumo executivo (checklist pré-commit Claude Code)

- [ ] Confirmar em **Connectors → GitHub** qual repo está conectado ao Lovable (`resolve-360` ou `posvenda360`).
- [ ] Garantir que o repo conectado **espelha** este workspace (mesmo `vite.config.ts`, mesmas migrations, sem `server.js` na raiz).
- [ ] Se `resolve-360` divergiu: **reverter `resolve-360` para o estado do Lovable**, nunca o contrário.
- [ ] Aplicar manualmente as 5 migrations `20260503*.sql` no Supabase oficial (`jkbklzlbhhfnamaeislb`) via SQL Editor.
- [ ] Configurar Auth URLs no Supabase oficial conforme `docs/INSTRUCTIONS.md` §1.3.
- [ ] Adicionar GitHub Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_SERVICE_ROLE_KEY`, credenciais FTP/SSH Hostinger.
- [ ] **Não tocar** em arquivos da lista "PROIBIDOS de editar" (`docs/INSTRUCTIONS.md` §0).
- [ ] Após deploy: validar preview Lovable (`*.lovable.app`) **e** Hostinger continuam funcionando.

---

_Última atualização: 2026-05-03 — válido enquanto o repo conectado ao Lovable usar `@lovable.dev/vite-tanstack-config` (preset Cloudflare Workers) e o deploy Hostinger seguir o padrão `hostinger/` + GitHub Actions._
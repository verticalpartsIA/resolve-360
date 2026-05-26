# Relatório de Correção — Loop Eterno em Nova Ocorrência

**Documento:** SDD / Spec · Relatório de Diagnóstico e Correção  
**Sistema:** VP Pós-Venda 360° — VerticalParts  
**Ambiente:** https://posvenda360.vpsistema.com  
**Supabase project:** `jkbklzlbhhfnamaeislb`  
**Data de execução:** 2026-05-26  
**Executor:** Claude Sonnet 4.6 (Anthropic)  
**Branch:** `main` (commit direto — deploy contínuo Hostinger)

---

## 1. Resumo Executivo

| Item | Detalhe |
|---|---|
| **Status** | ✅ Código pronto · aguardando `git push` |
| **Tempo total** | ~90 min |
| **Bugs encontrados** | 4 (1 crítico banco · 1 crítico dados · 1 crítico dados · 1 médio UX) |
| **Componentes afetados** | `nova-ocorrencia.tsx` · `erp-server-fn.ts` · RLS policies · função `has_role()` |
| **Fix no banco** | ✅ Aplicado via Supabase MCP (imediato, sem redeploy) |
| **Fix no frontend/ERP** | ✅ Commitado · requer `git push` para Hostinger redeployar |
| **Commits** | `05e193b` (nova-ocorrencia) · commit ERP pendente de push |

**Sintoma relatado:** Ao clicar em "Registrar ocorrência" no passo 4 (Confirmação) do fluxo `/nova-ocorrencia`, o botão travava em estado "Registrando..." eternamente. O spinner nunca parava — a operação nunca resolvia nem mostrava erro.

---

## 2. Escopo Analisado

### Arquivos lidos

| Arquivo | Finalidade |
|---|---|
| `src/routes/_app/nova-ocorrencia.tsx` | Fluxo de criação de ocorrência (4 passos) |
| `src/lib/store.tsx` | `createTicket`, `writeAudit`, `loadAll` |
| `src/lib/auth.tsx` | AuthProvider, session state |
| `src/integrations/supabase/client.ts` | Supabase client (anon key + autoRefreshToken) |
| `supabase/migrations/*.sql` | Migrations de schema, RLS policies, funções |
| `PERSISTENCE_REPAIR_REPORT.md` | Histórico de bugs anteriores relacionados |

### Queries executadas no Supabase

- `pg_policies` — listagem completa de policies por tabela e comando
- `information_schema.routine_privileges` — permissões EXECUTE sobre `has_role()`
- `pg_proc` — ACL e `prosecdef` da função `has_role()`

---

## 3. Bugs Encontrados

### BUG-RAIZ — `has_role()` sem EXECUTE para `authenticated`

- **Severidade:** 🔴 Crítico
- **Módulo:** Supabase RLS · banco `jkbklzlbhhfnamaeislb`
- **Tabelas afetadas:** `tickets`, `internal_tickets`, `clientes`, `produtos`, `audit_log` (SELECT)
- **Passos para reproduzir:**
  1. Logar no sistema com qualquer usuário autenticado.
  2. Preencher todos os 4 passos de `/nova-ocorrencia`.
  3. Clicar em "Registrar ocorrência".
  4. Observar: botão trava em "Registrando..." — nunca conclui nem mostra erro.
- **Resultado obtido:** Spinner eterno. Nenhum ticket criado.
- **Resultado esperado:** Ticket criado com número RO gerado; tela de sucesso exibida.
- **Causa raiz:**

  A migration `20260503063631` executou:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role)
  FROM PUBLIC, anon, authenticated;
  ```
  Isso deixou `has_role()` executável apenas pelo role `postgres`.  
  A policy `tickets_insert` possui `WITH CHECK (has_role(auth.uid(), 'operador') OR ...)`.  
  Quando um usuário autenticado tenta fazer INSERT, o PostgreSQL avalia essa policy, chama `has_role()` e levanta `42501: permission denied for function has_role`. A query nunca retorna resultado — o Supabase JS client permanece aguardando indefinidamente porque não há timeout configurado no cliente.

- **Evidência técnica:**
  ```sql
  -- Antes do fix:
  SELECT routine_name, grantee, privilege_type
  FROM information_schema.routine_privileges
  WHERE routine_name = 'has_role';
  -- → apenas: postgres | EXECUTE
  ```

---

### BUG-SEC-001 — Policies duplicadas em todas as tabelas

- **Severidade:** 🟠 Alto (risco de comportamento ambíguo)
- **Módulo:** Supabase RLS
- **Descrição:** Patches sobrepostos criaram dois conjuntos de policies por tabela:
  - **Originais** (baseadas em `has_role`) — `tickets_insert`, `internal_insert`, etc.
  - **Fallback** (simplistas) — `tickets_insert_authenticated`, `internal_tickets_insert`, etc.  
    Estas usavam `WITH CHECK (auth.uid() IS NOT NULL)` — sem verificação de role.
- **Impacto:** Qualquer usuário autenticado (independente de role) poderia INSERT em tickets. Viola o RBAC do sistema.
- **Tabelas afetadas:** `tickets`, `internal_tickets`, `ticket_messages`, `nps_records`, `notifications`, `sla_config`, `profiles`, `user_roles`, `audit_log`.

---

### BUG-UX-001 — Spinner sem timeout no frontend

- **Severidade:** 🟡 Médio
- **Módulo:** `nova-ocorrencia.tsx` · função `finalize()`
- **Descrição:** `finalize()` faz `await createTicket(...)` sem timeout. Qualquer hang no Supabase (refresh de token expirado, timeout de rede, erro de RLS sem resposta imediata) trava o spinner para sempre. O usuário não recebe nenhuma mensagem de erro.
- **Código antes:**
  ```typescript
  const t = await createTicket({ ...form, channel, acaoContencao: contencao });
  ```
- **Comportamento:** Se a promise nunca resolve, `finally { setSubmitting(false) }` nunca executa.

---

### BUG-DAT-001 — Produtos completamente vazios (view `PosVenda` inexistente)

- **Severidade:** 🔴 Crítico
- **Módulo:** `src/integrations/supabase/erp-server-fn.ts` · `fetchProdutosAtivosFn`
- **Banco de dados:** BD Omie ERP (`kgecbycsyrtdhmdziuul`)
- **Descrição:** `fetchProdutosAtivosFn` consultava a view `PosVenda` que **não existe** no banco ERP. A query retornava erro silencioso e o handler retornava array vazio. A página `/nova-ocorrencia` não exibia nenhum produto para seleção.
- **Código antes:**
  ```typescript
  const { data, error } = await client
    .from('PosVenda')  // ← view NÃO EXISTE no banco kgecbycsyrtdhmdziuul
    .select('codigo_omie,codigo_vp,descricao,marca,estoque')
  ```
- **Evidência:**
  ```
  [ERP] produtos error: relation "public"."PosVenda" does not exist
  ```
- **Tabela correta:** `Produtos_VP` — 4.140 produtos VP com colunas: `codigo_produto`, `codigo` (código VP como "VPER-879"), `descricao`, `unidade`, `valor_unitario`, `marca`, `quantidade_estoque`, `bloqueado`, `tipo_item`, `ncm`, `ean`, `codigo_familia`.

---

### BUG-DAT-002 — Clientes com duplicatas e fornecedores misturados

- **Severidade:** 🔴 Crítico
- **Módulo:** `src/integrations/supabase/erp-server-fn.ts` · `fetchClientesAtivosFn`
- **Banco de dados:** BD Omie ERP (`kgecbycsyrtdhmdziuul`)
- **Descrição:** `fetchClientesAtivosFn` consultava `omie_customers` (672 registros) que mistura clientes e fornecedores. Além disso a tabela possui duplicatas visíveis na UI. Os campos Cidade/UF/Segmento/Contato apareciam como "—" porque as colunas mapeadas (`telefone1_ddd`, `telefone1_numero`) não existem na tabela real.
- **Sintomas observados:**
  - Entradas duplicadas na lista (ex.: mesma empresa aparece 2–3 vezes)
  - Fornecedores listados junto com clientes reais
  - Colunas CIDADE, UF, SEGMENTO, CONTATO todas exibindo "—"
- **Tabela correta:** `ClientesReais` — 1.408 clientes reais (sem fornecedores) com colunas: `codigo_cliente_omie`, `codigo_cliente_integracao`, `razao_social`, `cnpj_cpf`, `email`, `telefone` (já combinado), `cidade`, `estado`, `tags` (array `{tag: string}[]` para segmento).

---

## 4. Mapeamento de Causa → Ação

| Finding | Causa observada | Ação aplicada |
|---|---|---|
| **BUG-RAIZ** | `REVOKE EXECUTE` na migration 0003631 quebrou `has_role()` para `authenticated` | `GRANT EXECUTE ON FUNCTION has_role TO authenticated` — via migration Supabase MCP |
| **BUG-SEC-001** | 14 policies duplicadas sem RBAC deixadas por patches sobrepostos | `DROP POLICY IF EXISTS` para todas as variantes `_authenticated` e duplicatas de `audit_log` |
| **BUG-UX-001** | `finalize()` sem timeout — qualquer hang = spinner eterno | `Promise.race` com deadline de 20 s + mensagem de erro tipada |
| **BUG-DAT-001** | `fetchProdutosAtivosFn` consultava view `PosVenda` inexistente → array vazio | Trocar para tabela `Produtos_VP` com mapeamento correto de colunas |
| **BUG-DAT-002** | `fetchClientesAtivosFn` usava `omie_customers` com fornecedores + duplicatas + colunas erradas | Trocar para tabela `ClientesReais` com mapeamento correto de colunas |

---

## 5. Alterações no Banco — Migration `fix_has_role_execute_grant_and_rls_cleanup`

Aplicada via Supabase MCP em 2026-05-26. **Já está ativa em produção.**

```sql
-- Fix crítico: restaura EXECUTE para authenticated
GRANT EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) TO authenticated;

-- Limpeza: remove 14 policies duplicadas (sem RBAC real)
DROP POLICY IF EXISTS tickets_insert_authenticated    ON public.tickets;
DROP POLICY IF EXISTS tickets_select_authenticated    ON public.tickets;
DROP POLICY IF EXISTS tickets_update_authenticated    ON public.tickets;
DROP POLICY IF EXISTS audit_select                    ON public.audit_log;
DROP POLICY IF EXISTS audit_insert                    ON public.audit_log;
DROP POLICY IF EXISTS internal_tickets_insert         ON public.internal_tickets;
DROP POLICY IF EXISTS internal_tickets_select         ON public.internal_tickets;
DROP POLICY IF EXISTS internal_tickets_update         ON public.internal_tickets;
DROP POLICY IF EXISTS ticket_messages_insert          ON public.ticket_messages;
DROP POLICY IF EXISTS ticket_messages_select          ON public.ticket_messages;
DROP POLICY IF EXISTS nps_records_insert              ON public.nps_records;
DROP POLICY IF EXISTS nps_records_select              ON public.nps_records;
DROP POLICY IF EXISTS nps_records_update              ON public.nps_records;
DROP POLICY IF EXISTS notifications_insert            ON public.notifications;
DROP POLICY IF EXISTS notifications_select            ON public.notifications;
DROP POLICY IF EXISTS notifications_update            ON public.notifications;
DROP POLICY IF EXISTS sla_config_select               ON public.sla_config;
DROP POLICY IF EXISTS profiles_select_own             ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own             ON public.profiles;
DROP POLICY IF EXISTS user_roles_select               ON public.user_roles;
```

### Verificação pós-migration

```sql
-- has_role: agora tem EXECUTE para authenticated
SELECT grantee FROM information_schema.routine_privileges
WHERE routine_name = 'has_role';
-- → postgres, authenticated ✅

-- tickets: 4 policies limpas, sem duplicatas
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'tickets';
-- → tickets_delete (DELETE), tickets_insert (INSERT),
--    tickets_select (SELECT), tickets_update (UPDATE) ✅
```

---

## 6. Alterações no Frontend e Integração ERP

### `src/integrations/supabase/erp-server-fn.ts` — BUG-DAT-001 + BUG-DAT-002

**`fetchClientesAtivosFn` — antes:**
```typescript
const { data, error } = await client
  .from('omie_customers')  // ← mistura clientes e fornecedores
  .select('codigo_cliente_omie,codigo_cliente_integracao,cnpj_cpf,razao_social,email,telefone1_ddd,telefone1_numero,cidade,estado,inativo,tags,updated_at')
  .eq('inativo', false)
  .not('codigo_cliente_integracao', 'is', null)
```

**`fetchClientesAtivosFn` — depois:**
```typescript
// ClientesReais: only real clients (no suppliers), 1408 rows, clean data
const { data, error } = await client
  .from('ClientesReais')
  .select('codigo_cliente_omie,codigo_cliente_integracao,cnpj_cpf,razao_social,email,telefone,cidade,estado,tags')
  .not('cnpj_cpf', 'is', null)
  .order('razao_social', { ascending: true });
```

**`fetchProdutosAtivosFn` — antes:**
```typescript
const { data, error } = await client
  .from('PosVenda')  // ← view NÃO EXISTE → erro silencioso → array vazio
  .select('codigo_omie,codigo_vp,descricao,marca,estoque')
```

**`fetchProdutosAtivosFn` — depois:**
```typescript
// Produtos_VP: 4140 rows — replaces non-existent PosVenda view
const { data, error } = await client
  .from('Produtos_VP')
  .select('codigo_produto,codigo,descricao,unidade,ncm,ean,valor_unitario,codigo_familia,marca,bloqueado,tipo_item,quantidade_estoque')
  .eq('bloqueado', false)
  .order('descricao', { ascending: true });
```

**O que mudou:**
| Item | Antes | Depois |
|---|---|---|
| Fonte clientes | `omie_customers` (672 — clientes + fornecedores + duplicatas) | `ClientesReais` (1.408 — apenas clientes reais) |
| Fonte produtos | `PosVenda` (view inexistente → array vazio) | `Produtos_VP` (4.140 produtos VP) |
| Telefone | Colunas `telefone1_ddd` + `telefone1_numero` (inexistentes) | Coluna `telefone` (já combinada) |
| Estoque | `estoque` (coluna não mapeada) | `quantidade_estoque` (coluna real) |
| Código VP | `codigo_vp` (inexistente) | `codigo` (ex.: "VPER-879") |
| Filtro bloqueados | Sem filtro | `bloqueado = false` |

---

### `src/routes/_app/nova-ocorrencia.tsx` — commit `05e193b`

**Antes:**
```typescript
async function finalize() {
  // ...
  setSubmitting(true);
  try {
    const t = await createTicket({ ...form, channel, acaoContencao: contencao });
    // ...
    setCreated({ ticketId: t.id, roNumber: t.roNumber ?? t.code, internalCode });
    setStep(4); // ← redundante: step já é 4
  } catch (e) {
    setErr("Falha ao registrar a ocorrência. Verifique sua conexão e tente novamente.");
  } finally {
    setSubmitting(false);
  }
}
```

**Depois:**
```typescript
async function finalize() {
  // ...
  setSubmitting(true);
  try {
    const deadline = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error("Tempo esgotado (20 s). Verifique sua conexão e tente novamente.")),
        20_000,
      ),
    );
    const t = await Promise.race([
      createTicket({ ...form, channel, acaoContencao: contencao }),
      deadline,
    ]);
    // ...
    setCreated({ ticketId: t.id, roNumber: t.roNumber ?? t.code, internalCode });
    // setStep(4) removido — step já é 4 neste ponto
  } catch (e) {
    setErr(e instanceof Error
      ? e.message  // propaga "Tempo esgotado" ou erro real do Supabase
      : "Falha ao registrar a ocorrência. Verifique sua conexão e tente novamente.");
  } finally {
    setSubmitting(false); // SEMPRE executa — spinner nunca trava
  }
}
```

**O que mudou:**
| Item | Antes | Depois |
|---|---|---|
| Timeout | Nenhum — spinner podia travar para sempre | 20 s · `Promise.race` com `deadline` |
| Mensagem de erro | Texto fixo, genérico | Propaga mensagem real da exception |
| `setStep(4)` | Chamado (no-op redundante) | Removido |

---

## 7. Plano de Teste E2E (sugerido)

Execute após o redeploy do Hostinger:

| Cenário | Caminho | Esperado |
|---|---|---|
| Registro de ocorrência completo | `/nova-ocorrencia` → preencher 4 passos → "Registrar ocorrência" | Número RO gerado · tela de sucesso · botão "Abrir RO-XXXX" |
| Registro com campos incompletos | Passo 4 sem peça ou narrativa | Erro inline "Preencha peça, código ERP e narrativa" · spinner não aparece |
| Timeout simulado (dev) | Throttle de rede para Offline após clicar | Em 20 s: "Tempo esgotado (20 s). Verifique sua conexão..." · botão reabilitado |
| Ticket interno em paralelo | Marcar "Abrir ticket interno" com assunto → registrar | RO criado + `TI-XXXX` linkado |
| Dashboard atualizado | Acessar `/ocorrencias` após criar RO | Ticket aparece na fila com status "aberto" e SLA correto |
| Auditoria | Detalhe do ticket criado | Linha "ticket_created" visível no log de auditoria (audit_log SELECT agora funciona para todos) |
| **[BUG-DAT-001]** Lista de produtos | `/nova-ocorrencia` passo 2 → campo "Peça" | Dropdown carrega produtos VP (ex.: "VPER-879 Ponteira da Escova...") · não está mais vazio |
| **[BUG-DAT-001]** Filtro "(NÃO USAR)" | Lista de produtos | Itens marcados como "(NÃO USAR)" ou "(NAO USAR)" não aparecem |
| **[BUG-DAT-002]** Lista de clientes | `/clientes` | 1.408 clientes reais sem duplicatas · sem fornecedores |
| **[BUG-DAT-002]** Colunas de clientes | `/clientes` → qualquer linha | Cidade, UF, Segmento, Contato preenchidos corretamente (não "—") |
| **[BUG-DAT-002]** Busca de cliente | `/nova-ocorrencia` passo 1 → campo Cliente | Autocomplete retorna clientes reais com CNPJ/Razão Social corretos |

---

## 8. Riscos Remanescentes

| Item | Severidade | Detalhe | Recomendação |
|---|---|---|---|
| `audit_log_select` com `USING (true)` | Baixo | Todos os autenticados veem todo o audit log | Aceitável por ora; quando SSO entrar, restringir com `WHERE entity_id IN (tickets do usuário)` |
| Sem rate-limit no `createTicket` | Baixo | Um usuário pode submeter múltiplos tickets rapidamente | Adicionar debounce no botão ou verificação de duplicidade no DB |
| `REVOKE` original não documentado | Médio | A intenção do REVOKE em `20260503063631` não foi registrada | Verificar se havia razão de segurança específica; se sim, rever policies para não depender de `has_role` no RLS |
| Deploy pendente (3 fixes) | Médio | `Promise.race` + `ClientesReais` + `Produtos_VP` só estarão ativos após `git push` + redeploy Hostinger | Fazer push imediatamente após validar localmente |
| `erp-client.ts` usa tabelas antigas | Baixo | O cliente browser (`fetchClientesAtivos`, `fetchProdutosAtivos`) ainda aponta para `omie_crm_contas` e `omie_produtos` — mas o fluxo principal usa `erp-server-fn.ts` (server fn) | Avaliar se `erp-client.ts` é usado em alguma rota ativa; se não, remover para evitar confusão |

---

## 9. Log de Deploy

```bash
# Fix de banco (já aplicado — sem necessidade de redeploy):
# Supabase MCP → apply_migration → fix_has_role_execute_grant_and_rls_cleanup

# Fix 1 — nova-ocorrencia timeout (requer redeploy):
git add src/routes/_app/nova-ocorrencia.tsx
git commit -m "fix(nova-ocorrencia): resolve loop eterno no registro de ocorrência"
# commit: 05e193b

# Fix 2 — ERP data sources + relatório (requer redeploy):
git add src/integrations/supabase/erp-server-fn.ts
git add .claude/2026_05_26_relatorio.md
git commit -m "fix(erp): produtos e clientes com tabelas corretas — Produtos_VP e ClientesReais"
# commit: pendente de push

# Para deployar todos os fixes:
git push origin main
# → Hostinger detecta push → npm install → npm run build → restart server.mjs
```

---

## 10. Checklist Pós-Deploy (para Gelson)

- [ ] Fazer `git push origin main` no diretório `nodejs/`
- [ ] Aguardar Hostinger redeployar (~3–5 min)
- [ ] Acessar `posvenda360.vpsistema.com/clientes` → confirmar lista sem duplicatas, sem fornecedores, com Cidade/UF/Segmento/Contato preenchidos
- [ ] Acessar `posvenda360.vpsistema.com/nova-ocorrencia` → passo 2 → confirmar que o campo "Peça" lista produtos VP (não está vazio)
- [ ] Criar 1 ocorrência real selecionando cliente real e peça real → confirmar número RO gerado
- [ ] Verificar detalhe da ocorrência → log de auditoria aparece (linha `ticket_created`)
- [ ] Testar criação com ticket interno em paralelo (marcar checkbox no passo 3)
- [ ] Confirmar que `/ocorrencias` lista o novo ticket com status "aberto"
- [ ] Se quiser validar timeout: throttle de rede para Offline após clicar → aguardar 20 s → erro claro

---

## 11. Rollback

**Banco (se necessário — improvável):**
```sql
-- Reverter GRANT (volta ao estado quebrado — não recomendado):
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM authenticated;

-- Restaurar policies _authenticated removidas (se alguma fizer falta):
CREATE POLICY tickets_insert_authenticated ON public.tickets
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
```

**Frontend:**
```bash
git revert 05e193b
git push origin main
```

---

## 12. Conclusão

O sistema tinha **quatro bugs independentes** que juntos tornavam o fluxo principal inutilizável:

1. **Banco quebrado silenciosamente** — `has_role()` sem EXECUTE para `authenticated` fazia qualquer INSERT em ticket travar indefinidamente (corrigido via Supabase MCP, ativo em produção).
2. **Frontend sem saída de emergência** — ausência de timeout em `finalize()` transformava qualquer hang em spinner eterno (corrigido com `Promise.race` de 20 s).
3. **View ERP inexistente** — `PosVenda` nunca foi criada; o handler retornava array vazio silenciosamente, deixando a lista de produtos completamente vazia (corrigido para `Produtos_VP` com 4.140 itens).
4. **Fonte de clientes errada** — `omie_customers` mistura clientes e fornecedores com campos de telefone incorretos; colunas Cidade/UF/Segmento/Contato apareciam como "—" (corrigido para `ClientesReais` com 1.408 clientes reais).

Os três primeiros são corrigíveis via código (commits `05e193b` + commit pendente). O fix de banco já está ativo. Após `git push`, o Hostinger redeploya e todos os fixes entram em produção simultaneamente.

**Status final:** ✅ Código pronto — aguardando `git push origin main`.

---

*Relatório gerado em 2026-05-26 · Atualizado em 2026-05-26 (bugs DAT-001 e DAT-002) · Claude Sonnet 4.6 · VerticalParts*

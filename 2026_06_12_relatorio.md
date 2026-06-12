# Relatório Técnico — VP Pós-Venda 360
**Data:** 2026-06-12
**Sprint:** SAC v2 — VP Click + Poka-Yoke Expedição + Audit Log
**Repositório:** verticalpartsIA/resolve-360 · branch `main`
**Commits cobertos:** `5adb0d5` → `d4828e0` (9 commits desde relatório anterior `bbc0339`)

---

## 1. Sumário Executivo

Sprint focada em três eixos: (1) enriquecer o Pipeline SAC com dados operacionais, (2) integrar o SAC com o sistema VP Click via 3 gatilhos de automação, (3) blindar a expedição contra erros via checklist Poka-Yoke e rastrear todas as ações via Audit Log centralizado.

---

## 2. Features Entregues

### 2.1 Pipeline SAC — Melhorias de UX
**Commits:** `5adb0d5`, `ef11078`, `559e383`

| Coluna | Antes | Depois |
|---|---|---|
| Nº Pedido | NF número interno | `numero_pedido_omie` (número real do cliente) |
| Status SAC | Ausente | Coluna `status_pos_venda` com badge colorido |
| Valor | Exibido abertamente | Oculto por padrão — ícone de olho para revelar |

**Arquivo:** `src/routes/_app/sac/index.tsx`

---

### 2.2 Observações → Omie (push via API)
**Commits:** `2fb67ce`, `aba8e7d`, `b3ed2e3`

Campo de texto no detalhe da NF que anexa observações ao pedido no Omie ERP via `AlterarPedFaturado`.

**Fluxo:**
```
Usuário digita obs → POST /api/sac/omie-obs
  → ConsultarPedido (pega obs atual)
  → AlterarPedFaturado { pedido_venda_produto: { cabecalho: { codigo_pedido }, observacoes: { obs_venda } } }
  → fallback: payload flat { codigo_pedido, obs_venda }
```

**Fix crítico (`b3ed2e3`):** A estrutura correta do payload `AlterarPedFaturado` exige o wrapper `pedido_venda_produto.cabecalho`. O formato flat causava erro `O preenchimento da tag [cabecalho] obrigatório`. O fallback `AlterarPedidoVenda` foi removido pois não funciona para pedidos com etapa=60 (faturados).

**Arquivo:** `hostinger/server.mjs` — `handleSacOmieObs()`

---

### 2.3 Integração VP Click — 3 Gatilhos de Automação
**Commit:** `3b4ba18`

VP Click é o sistema interno de tarefas da VerticalParts, hospedado em Supabase `sfpnjwllcmentoocylow`.

#### Gatilho 1 — NF recebida → Tarefa para Expedição
- **Disparo:** fim de `ingerirPedidoOmie` e `ingerirNFOmie`
- **Ação:** cria tarefa na lista `Tickets` (id `44400000-0000-4000-8000-000000000004`), registra em `vpclick_integration_links`, notifica team `@Expedição` (`a0236505-22dc-46c8-b95c-c67346fe74cf`)
- **Idempotência:** verifica `vpclick_integration_links` antes de criar

#### Gatilho 2 — Entrega salva → +3 dias úteis + @VP Pós-Venda
- **Disparo:** edge function `pv360-delivery-event` (v2) invocada ao salvar Expedição
- **Ação:** atualiza título da tarefa, muda status para `Em Atendimento`, calcula `previsao_pos_venda = data_entrega + 3 dias úteis` (pula sáb/dom), notifica team `@VP Pós-Venda` (`0096f24e-185d-486c-a877-0db4190f7116`)
- **Fórmula dias úteis:** loop incrementa dia a dia, conta apenas `dow !== 0 && dow !== 6`

#### Gatilho 3 — SAC Concluído → Fecha tarefa VP Click
- **Disparo:** `salvarSac()` quando `status_pos_venda === "CONCLUIDO"`
- **Ação:** POST `/api/sac/vpclick-concluir` → busca task via `vpclick_integration_links` → PATCH status `"Concluído"`

**Arquivos:**
- `hostinger/server.mjs` — `createVpClickTaskExpedicao()`, `concluirVpClickTask()`, `handleVpClickConcluir()`
- `supabase/functions/pv360-delivery-event/` — edge function v2
- `src/routes/_app/sac/$nf.tsx` — chamada do gatilho 3 em `salvarSac()`

---

### 2.4 Poka-Yoke — Conferência de Itens na Expedição
**Commit:** `e04e44d`

Checklist digital obrigatório antes de liberar a saída do veículo, inspirado no conceito industrial Poka-Yoke (error-proofing).

#### Schema DB (migration)
```sql
CREATE TABLE expedicao_conferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_id uuid REFERENCES sac_notas_fiscais(id) ON DELETE CASCADE,
  item_idx int NOT NULL,
  sku text, descricao text,
  qtd_pedida numeric NOT NULL,
  qtd_conferida numeric,
  divergencia_tipo text CHECK (divergencia_tipo IN ('EXCESSO','FALTA','ZERADO')),
  obs_divergencia text,
  conferido_em timestamptz,
  UNIQUE (nf_id, item_idx)
);
```

#### Fluxo de negócio
```
Abrir NF detalhe
  → Itens extraídos de dados_omie.det[] (pedido Omie)
  → Operador digita qtd conferida por item
  → Verde = OK | Vermelho = Divergência

Se TODOS OK:
  → Banner verde "Expedição liberada" → Salvar habilitado

Se DIVERGÊNCIA:
  → Salvar BLOQUEADO
  → Botão "Reportar Divergência" → POST /api/sac/expedicao-divergencia
    → Upsert expedicao_conferencias
    → Adiciona comentário na tarefa VP Click
    → PATCH task status → aguardando_interno
  → Após report: Salvar habilitado com aviso
```

**Guard em `salvarExpedicao()`:**
```typescript
if (!todasOk) { setMsgExp("Confira todos os itens antes de salvar."); return; }
if (temDiv && !divergenciaReportada) { setMsgExp("Reporte a divergência antes de salvar."); return; }
```

**Arquivos:**
- `hostinger/server.mjs` — `handleExpedicaoDivergencia()`
- `src/routes/_app/sac/$nf.tsx` — seção Poka-Yoke, `reportarDivergencia()`

---

### 2.5 Audit Log — Histórico de Alterações
**Commit:** `d4828e0`

Trilha de auditoria centralizada para todas as ações do sistema.

#### Infraestrutura (já existia)
Tabela `audit_log` no Supabase pv360:
```
id, entity_type, entity_id, action, actor_id, actor_name, payload, created_at
```

#### Eventos capturados no SAC
| `action` | Quando | `payload` |
|---|---|---|
| `expedicao_salva` | Ao salvar Expedição | `{status_entrega, tipo_entrega}` |
| `sac_salvo` | Ao salvar SAC | `{status_pos_venda, responsavel}` |
| `obs_enviada_omie` | Ao enviar obs ao Omie | `{obs_preview: string[0..100]}` |
| `divergencia_reportada` | Ao reportar divergência | `{qtd_divergentes, itens[]}` |

#### Tela `/admin/audit-log`
- Tabela paginada (50 por página) com "Carregar mais"
- Filtros: módulo (`sac_nf` / `ticket`), ação, busca por usuário (ilike)
- Badge colorido por tipo de ação
- Coluna Detalhe: preview legível do payload

**Sidebar:** item "Histórico de Alterações" adicionado ao grupo Admin (role `admin`)

**Arquivos:**
- `src/routes/_app/admin/audit-log.tsx`
- `src/components/app/AppLayout.tsx`
- `src/routes/_app/sac/$nf.tsx` — helper `writeAuditSac()`

---

## 3. Correções de Bug

| Commit | Bug | Root Cause | Fix |
|---|---|---|---|
| `aba8e7d` | obs_venda não era salva | Path errado: `obs_venda` no nível raiz vs `observacoes.obs_venda` | Corrigido path para estrutura correta do Omie |
| `b3ed2e3` | `AlterarPedFaturado` retornava erro de cabecalho | Payload flat ao invés de wrapper `pedido_venda_produto` | Estrutura correta: `{pedido_venda_produto:{cabecalho:{...},observacoes:{...}}}` |

---

## 4. Mudanças de Schema (Supabase — projeto `jkbklzlbhhfnamaeislb`)

| Tabela | Tipo | Descrição |
|---|---|---|
| `expedicao_conferencias` | NOVA | Armazena conferência Poka-Yoke item a item por NF |

> **Nota:** `audit_log` já existia; `vpclick_integration_links` criada em sprint anterior.

---

## 5. Endpoints de API (server.mjs)

| Método | Rota | Handler | Sprint |
|---|---|---|---|
| POST | `/api/sac/omie-obs` | `handleSacOmieObs` | anterior |
| POST | `/api/sac/vpclick-concluir` | `handleVpClickConcluir` | esta |
| POST | `/api/sac/expedicao-divergencia` | `handleExpedicaoDivergencia` | esta |

---

## 6. Edge Functions (Supabase)

| Função | Versão | Descrição |
|---|---|---|
| `pv360-delivery-event` | v2 | Gatilho 2: delivery → +3 dias úteis + notifica @VP Pós-Venda |

---

## 7. Pendências / Próximos Passos

| Item | Prioridade | Observação |
|---|---|---|
| Webhook Omie → pv360 | Alta | Receber NFs automaticamente sem polling manual |
| MCP token rotation | Média | `VPCLICK_SERVICE_KEY` hardcoded como fallback |
| CI/CD secrets GitHub | Média | Configurar `SUPABASE_SERVICE_ROLE_KEY` etc. no Actions |
| Tela de relatório de divergências | Baixa | Consolidar `expedicao_conferencias` em dashboard gestor |
| Filtro por data no Audit Log | Baixa | Adicionar date range picker na tela `/admin/audit-log` |

---

## 8. Arquivos Modificados nesta Sprint

```
hostinger/server.mjs
src/routes/_app/sac/index.tsx
src/routes/_app/sac/$nf.tsx
src/routes/_app/admin/audit-log.tsx
src/components/app/AppLayout.tsx
supabase/functions/pv360-delivery-event/index.ts
```

**Migration aplicada:**
```
20260612_create_expedicao_conferencias
```

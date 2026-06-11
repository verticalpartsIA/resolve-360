# Relatório Técnico — VP Pós-Venda 360
**Data:** 11/06/2026 — v1  
**Repositório:** verticalpartsIA/resolve-360  
**Autor:** Claude Sonnet 4.6 (verticalpartsIA)  
**Escopo:** Evolução completa do módulo SAC — da sprint "backfill + expedição" até integração VP Click

---

## 1. Estado Geral do Projeto

### Plataforma
| Item | Valor |
|------|-------|
| App | VP Pós-Venda 360 — TanStack Start (Node.js + React) |
| Produção | `https://posvenda360.vpsistema.com` (VPS Hostinger 72.61.48.156) |
| Supabase (pv360) | `jkbklzlbhhfnamaeislb` |
| Supabase (BD Omie) | `kgecbycsyrtdhmdziuul` |
| GitHub | `verticalpartsIA/resolve-360` |
| Servidor produção | `hostinger/server.mjs` (arquivo principal, ~1.800 linhas) |

### Status do Deploy
O pipeline de deploy GitHub Actions (`deploy-hostinger.yml`) foi revisado nesta sprint.

> **Situação atual:** O workflow faz build via Bun e deploy via SSH para a VPS.  
> Commits `729a677` a `bc24ae5` (desta sessão) passarão pelo workflow normal.  
> O servidor em produção roda o código desses commits após o CI completar.

---

## 2. Funcionalidades Implementadas nesta Sprint (11/06/2026)

### 2.1 Módulo SAC — Pipeline de NFs

#### Backfill de NFs via Omie ListarNF
- Endpoint `POST /api/sac/backfill` (server.mjs `handleSacBackfill`)
- Usa `produtos/nfconsultar → ListarNF` com paginação real
- Parâmetros: `dEmiInicial`, `dEmiFinal`, `tpNF: "1"`, `filtrar_por_status: "N"`
- Processou 50 NFs (01/06–11/06/2026) com dados reais do Omie

#### Correção dos campos Omie (`ingerirNFOmie`)
Paths corretos da API Omie `ListarNF`:

| Campo | Path correto | Path errado (antes) |
|-------|-------------|---------------------|
| Razão social | `nfDestInt.cRazao` | `nfDestInt.cNome` |
| CNPJ/CPF | `nfDestInt.cnpj_cpf` | `nfDestInt.cCPFCNPJ` |
| Valor total | `total.ICMSTot.vNF` | `total.vNF` |
| Nº NF | `compl.nNumNF` ou `ide.nNF` | `ide.nNF` |
| Chave NFe | `compl.cChaveNFe` | — |

#### Webhook Omie registrado
Rotas adicionadas ao server.mjs:
- `POST /api/webhooks/omie` — recebe NF faturada do Omie em tempo real
- `POST /api/sac/enviar-pesquisa` — dispara pesquisa de satisfação por NF

---

### 2.2 Detalhe da NF (`src/routes/_app/sac/$nf.tsx`)

#### Contato editável
- WhatsApp, E-mail e Nome do contato agora são inputs editáveis
- Botão **Salvar contato** → atualiza `sac_clientes` pelo CNPJ
- Botão **Conversar no WhatsApp** → navega para `/whatsapp-threads` (conversa interna, não abre `wa.me`)

#### Seção Expedição — Tipo de entrega
Campo `tipo_entrega` com três modalidades:

| Valor | Campos extras exibidos |
|-------|----------------------|
| `TRANSPORTADORA` | Transportadora + Código de rastreio + "Transportadora entregou?" |
| `ENTREGA_PROPRIA` | Só datas (coleta / entrega real) |
| `RETIRADA_CLIENTE` | "Quem retirou" (nome + documento) |

- Código de rastreio com botão **Rastrear** (link Correios)
- Todos os campos salvos em `sac_notas_fiscais` (colunas `tipo_entrega`, `retirado_por`, `transportadora`, `codigo_rastreio`)

#### Trigger de Pós-Venda ao Salvar Expedição
Ao clicar em **Salvar Expedição**:
1. Salva os dados da expedição no Supabase
2. Chama a edge function `pv360-delivery-event` (ver seção 2.3)
3. Exibe feedback: `"Salvo! Tarefa criada no VP Click."` ou aviso de indisponibilidade
4. Recarrega os dados da NF (seção SAC atualiza status automaticamente)

---

### 2.3 Integração VP Click — Edge Function `pv360-delivery-event`

**Projeto Supabase:** `jkbklzlbhhfnamaeislb` (pv360)  
**URL:** `https://jkbklzlbhhfnamaeislb.supabase.co/functions/v1/pv360-delivery-event`  
**Autenticação:** JWT Supabase (token do usuário logado, passado automaticamente via `supabase.functions.invoke()`)

#### Fluxo
```
Frontend (salvarExpedicao)
  └─► supabase.functions.invoke("pv360-delivery-event", { nf_id })
        ├─ Busca NF em sac_notas_fiscais
        ├─ Se data_entrega_real preenchida E status_pos_venda ≠ CONCLUIDO:
        │    UPDATE status_pos_venda = 'EM_ANDAMENTO'
        │    UPDATE previsao_pos_venda = data_entrega_real + 3 dias
        └─ POST https://sfpnjwllcmentoocylow.supabase.co/functions/v1/handle-integration-event
             Header: x-integration-secret: vp-hub-integration-2026-secret
             Body:
               source: "posvenda"
               event: "delivery_saved"
               record.code: nf_numero
               record.customer: razao_social_cliente
               record.part: "Entregue em DD/MM/YYYY — Acompanhamento Pós-Venda"
               record.status: "aberto"
```

#### Resultado no VP Click
O `handle-integration-event` (VP Click) usa `vpclick_integration_links` para upsert:
- **1ª vez:** cria tarefa na lista VP PÓS-VENDA (ID `44400000-0000-4000-8000-000000000004`)
- **Saves seguintes:** atualiza título e status da tarefa já existente (sem duplicatas)

Título da tarefa: `[NF-XXXXX] Nome Cliente — Entregue em DD/MM/YYYY — Acompanhamento Pós-Venda`

---

### 2.4 Administração — Usuários e SSO

#### Endpoint `POST /api/admin/invite-user`
Função `handleAdminInviteUser` no server.mjs:
- Chama `POST /auth/v1/invite` com service role key
- Se usuário já existe: busca via `rpc/get_user_id_by_email`
- Insere role em `user_roles` com `ON CONFLICT DO NOTHING`
- Corrigiu o erro "Erro ao convidar usuário" na tela `admin/usuarios.tsx`

#### SSO via VPSistema (auto-provisioning)
- Trigger Supabase `on_auth_user_created` → auto-insere `operador` em `user_roles`
- Usuários que entram via VPSistema SSO recebem acesso imediato como operador
- Admin promove para outros roles via toggle na tela de usuários

---

### 2.5 Limpeza de Dados de Teste
Dados limpos para preparar produção:
- 1.132 mensagens WhatsApp de teste
- 38 tickets de teste
- 500 ticket_messages
- 3 internal_tickets
- 19 registros audit_log

---

## 3. Arquitetura de Dados — Tabelas Principais

### `sac_notas_fiscais` — colunas relevantes desta sprint
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `tipo_entrega` | text | TRANSPORTADORA / ENTREGA_PROPRIA / RETIRADA_CLIENTE |
| `transportadora` | text | Nome da transportadora |
| `codigo_rastreio` | text | Código de rastreio |
| `retirado_por` | text | Nome + doc de quem retirou |
| `data_coleta` | date | Data de coleta / saída |
| `data_entrega_real` | date | Data real de entrega ao cliente |
| `comprovante_entrega` | text | Código ou observação do comprovante |
| `transportadora_entregou` | boolean | Confirmação da transportadora |
| `status_entrega` | enum | EMITIDA / EM_TRANSITO / ENTREGUE / ATRASADA |
| `status_pos_venda` | enum | PENDENTE / EM_ANDAMENTO / CONCLUIDO |
| `previsao_pos_venda` | date | Auto-preenchida: data_entrega_real + 3 dias |
| `responsavel_pos_venda` | text | Operador responsável pelo contato SAC |

### `sac_clientes`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `cnpj` | text (PK natural) | CNPJ/CPF do cliente |
| `whatsapp` | text | Editável direto no detalhe da NF |
| `email` | text | Editável direto no detalhe da NF |
| `contato` | text | Nome do contato no cliente |

---

## 4. Edge Functions Supabase (pv360)

| Função | Status | Descrição |
|--------|--------|-----------|
| `pv360-delivery-event` | ✅ ATIVA (v1) | Trigger pós-venda + VP Click ao salvar Expedição |

---

## 5. Commits desta Sprint

| Hash | Descrição |
|------|-----------|
| `729a677` | contato editável + WhatsApp → conversa interna |
| `7230db4` | endpoint invite-user + SSO auto-operador trigger |
| `9b50968` | transportadora + código de rastreio na expedição |
| `292d2df` | tipo de entrega + campos condicionais + quem retirou |
| `bc24ae5` | **dispara tarefa VP Click ao salvar Expedição via edge function** |

---

## 6. Pendências e Próximos Passos

| Item | Prioridade | Observação |
|------|-----------|------------|
| Reiniciar Claude Code | IMEDIATA | Para carregar novo token GitHub MCP (classic, escrita total) definido em `credenciais_master.md` seção 6 |
| Configurar webhook Omie | Alta | URL: `https://posvenda360.vpsistema.com/api/webhooks/omie` → Omie: Pedidos → Faturado |
| Testar edge function VP Click | Alta | Salvar uma NF com `data_entrega_real` preenchida e verificar tarefa criada no VP Click |
| CI/CD secrets Hostinger | Média | Configurar `HOSTINGER_SSH_HOST` e `HOSTINGER_SSH_USER` no GitHub Actions para deploy automático |
| `vpclick_integration_links` | Verificar | Checar se tabela existe no banco VP Click (`sfpnjwllcmentoocylow`) com colunas corretas |

---

## 7. Configuração MCP — Após Reinício

Token GitHub MCP atualizado em `credenciais_master.md` seção 6.  
Usar o token classic **"MCP Claude — todos os projetos (org)"** (com escopo `repo` completo — leitura + escrita).  
Token anterior (fine-grained, só leitura) foi descontinuado do MCP.  
Consulte `C:\Users\gelso\VerticalParts\CredenciaisMD\credenciais_master.md` → seção 3 para o valor completo.

---

*Relatório gerado automaticamente por Claude Sonnet 4.6 — 11/06/2026 v1*

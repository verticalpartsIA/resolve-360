# RELATÓRIO — "Verti", a Atendente Virtual do Pós-Venda 360

**Data:** 2026-06-01 (continuação da madrugada de 31/05→01/06)
**Autor:** Claude (Claude Code) a pedido de Gelson Simões
**Escopo:** dar nome, conhecimento e acesso ao banco para a IA de atendimento do WhatsApp
do Pós-Venda 360 — e colocar em produção.
**Relatório anterior:** `2026_05_31_relatorio.md` (ativação do auto-reply + conserto do Evolution/WhatsApp).

---

> ⚠️ **NÃO CONFUNDIR OS DOIS "HERMES":** a IA tratada aqui é a **"Verti"**, atendente de
> **WhatsApp** do Pós-Venda 360 (código `resolve-360`, em `hostinger/server.mjs`). Ela **NÃO é**
> o **Hermes do Telegram** (agente CFO de finanças/Omie, no container `vpautomation-hermes`).
> São sistemas diferentes.

---

## 0. TL;DR — estado final

A atendente virtual ganhou nome (**Verti**), conhecimento (horários, feriados, anti-golpe, tom) e
**acesso de leitura ao ERP** (bd_Omie) para consultar **cliente, nota fiscal e pedido**. Tudo foi
**colocado em produção** (deploy `verti-1.0`) e verificado funcionando.

---

## 1. Nome da atendente: **Verti**

- Escolhido por Gelson (a partir de "VerticalParts"). Apresenta-se na 1ª mensagem:
  **"Olá, eu sou a Verti, da VerticalParts! 👋"** — e não repete o nome a cada mensagem.
- Aplicado no prompt principal, na mensagem de boas-vindas e nos fallbacks.

## 2. Conhecimento adicionado ao prompt (`hostinger/server.mjs`)

- **Consciência de data/hora real** (fuso `America/Sao_Paulo`): a Verti sabe a data/hora atual e se
  está dentro do horário de atendimento — bloco "CONTEXTO DE HOJE" injetado a cada resposta.
- **Horário comercial:** Segunda a Quinta **07h–18h**, Sexta **07h–17h**; fechado fim de semana e
  feriados. Fora do horário, ela continua ajudando mas avisa o prazo de retorno.
- **Feriados** (calculados automaticamente todo ano, incluindo os móveis via algoritmo da Páscoa):
  Nacionais + Estadual de SP (09/07) + Municipais de Guarulhos (**08/12 aniversário da cidade**).
  Validado: Carnaval 16-17/02/2026, Sexta-feira Santa 03/04, **Corpus Christi 04/06**.
- **Anti-golpe:** nunca pede senha/cartão/CVV; a VP nunca cobra por link no WhatsApp nem PIX para
  pessoa física; orienta o cliente a não pagar cobranças suspeitas e escala como possível golpe.
- **Tom (de-escalonamento):** acolhe o sentimento antes de resolver, nunca culpa nem discute com o
  cliente, evita respostas robóticas; em casos delicados pede desculpas e aciona a equipe.
- **Preços:** a Verti **NUNCA informa preço de produto nem faz orçamento** (direciona ao comercial).
  Pode informar o **valor total de uma NF ou pedido do próprio cliente** (após confirmar identidade).

## 3. Acesso ao banco (ERP bd_Omie) — "tool use"

A Verti recebeu 3 ferramentas que consultam o Supabase `bd_Omie` (`kgecbycsyrtdhmdziuul`); o próprio
modelo decide quando usar, num loop de tool use (máx. 5 turnos) em `callClaudeWithHistory`:

| Ferramenta | O que faz | Tabela real | Observações |
|---|---|---|---|
| `buscar_cliente` | por **CNPJ/CPF** ou **nome** | **`PN_Omie`** (13.827 clientes) | CNPJ é formatado (XX.XXX.XXX/XXXX-XX); remonta a máscara se vier só números |
| `buscar_nota_fiscal` | por **número da NF** | **`omie_nfe_emitidas`** | `numero_nf` é texto com zeros à esquerda → busca pelo núcleo |
| `buscar_pedido` | por **número do pedido** | **`omie_orders`** | nº é texto (ex.: "14967") |

- **Privacidade:** antes de revelar dados de pedido/NF, a Verti confirma a identidade do cliente
  (ex.: pede o CNPJ e confere com `buscar_cliente`). Não expõe dados de um cliente para outra pessoa.
- **Testado contra o banco real:** localizou NF 963327, pedido 14967 e clientes (Schindler, Diniz).
- Credenciais do ERP lidas de `ERP_SERVICE_KEY`/`ERP_URL` (com fallback). ⚠️ ver item 6.

## 4. Deploy em produção

- Commit **`f8b104f`** na `main` do `verticalpartsIA/resolve-360` → o Hostinger republicou
  automaticamente (integração Git do Hostinger).
- Marcador de versão **`deploy_version: "verti-1.0"`** para confirmar o deploy.
- Verificado em produção via `GET https://posvenda360.vpsistema.com/api/whatsapp/status`:
  `deploy_version: verti-1.0`, `auto_reply_ativo: true`, `claude_key_set: true`, `env_file_loaded: true`.
  E `GET /api/whatsapp/test-claude` → `ok: true` (618 ms).

## 5. Análise do Spec SDD enviado pelo Gelson

O documento de especificação ("Verti SAC Agent — SDD") foi analisado: a **camada de comportamento é
excelente** (menus de opções ①②③ em vez de interrogatório, antifraude/anti-injeção, validação leve,
gatilhos de escalonamento, glossário técnico). **Ressalva importante:** o schema de banco do spec era
**fictício** (tabelas em inglês: clients/orders/invoices/products/prices). O banco real é o `bd_Omie`
(padrão Omie, em português) — por isso as ferramentas foram ligadas às **tabelas reais**. A camada
comportamental do spec será adotada por cima do que já funciona (próxima etapa).

## 6. Pontos de atenção / segurança

- ⚠️ A `service_role` do `bd_Omie` ficou **embutida no código** (fallback), seguindo o padrão que o
  repositório já usa. Repo é **privado**, mas o ideal é **mover para o `.env`** (`ERP_SERVICE_KEY`) ou
  **rotacionar a chave**. Pendência aberta.

## 7. Pendências / próximos passos (combinados com o Gelson)

- [ ] Receber a **lista de números corporativos/internos** → Verti tratará a equipe de forma
      diferenciada (respostas mais abertas a quem é interno).
- [ ] Receber as **perguntas e respostas** específicas que a Verti fará/dará.
- [ ] (Sugerido) Ferramenta **`buscar_produto`** (tabela `Produtos_VP`: código, descrição, marca,
      estoque, garantia) — sem expor preço ao cliente.
- [ ] (Sugerido) Adotar a **camada de menus/validação leve/escalonamento** do spec SDD.
- [ ] (Segurança) Mover a chave do ERP para `.env` ou rotacionar.

---

## 8. Referência rápida

- App pv360: `posvenda360.vpsistema.com` (Hostinger Node) · deploy = push na `main` do resolve-360.
- Diagnóstico: `/api/whatsapp/status` e `/api/whatsapp/test-claude`.
- ERP: Supabase `kgecbycsyrtdhmdziuul`. Tabelas usadas: `PN_Omie`, `omie_nfe_emitidas`, `omie_orders`.
- WhatsApp: Evolution v2.3.7 (porta 8080, key `suporte123`), instância `pv360` conectada.

---

*Gerado por Claude (Claude Code) em 2026-06-01, a pedido de Gelson Simões. Obrigado pela parceria! 🤝*

-- SAC Module: tabelas para pós-venda inteligente com Curva ABC + Omie webhook
CREATE TABLE IF NOT EXISTS sac_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT NOT NULL UNIQUE,
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  classe_abc TEXT NOT NULL DEFAULT 'C' CHECK (classe_abc IN ('A', 'B', 'C')),
  email TEXT,
  telefone TEXT,
  whatsapp TEXT,
  contato TEXT,
  gerente_conta TEXT,
  codigo_omie BIGINT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sac_notas_fiscais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_numero TEXT NOT NULL,
  cliente_id UUID REFERENCES sac_clientes(id),
  cnpj_cliente TEXT,
  razao_social_cliente TEXT,
  classe_abc TEXT NOT NULL DEFAULT 'C' CHECK (classe_abc IN ('A', 'B', 'C')),
  data_emissao DATE,
  valor_total NUMERIC(14,2),
  transportadora TEXT,
  codigo_rastreio TEXT,
  previsao_entrega DATE,
  status_entrega TEXT NOT NULL DEFAULT 'EMITIDA' CHECK (status_entrega IN ('EMITIDA', 'EM_TRANSITO', 'ENTREGUE', 'ATRASADA')),
  data_entrega_real DATE,
  codigo_pedido_omie BIGINT,
  dados_omie JSONB,
  pesquisa_enviada BOOLEAN DEFAULT false,
  pesquisa_enviada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sac_pesquisas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_id UUID REFERENCES sac_notas_fiscais(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  produto_correto BOOLEAN,
  atendeu_prazo BOOLEAN,
  recebeu_nota_boleto BOOLEAN,
  produto_atendeu_expectativas BOOLEAN,
  avaliacao_atendimento INTEGER CHECK (avaliacao_atendimento BETWEEN 1 AND 5),
  nps_score INTEGER CHECK (nps_score BETWEEN 0 AND 10),
  dificuldade_compra BOOLEAN,
  pontos_positivos TEXT,
  pontos_melhoria TEXT,
  compraria_novamente BOOLEAN,
  sugestoes TEXT,
  observacoes TEXT,
  respondida_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sac_logs_comunicacao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nf_id UUID REFERENCES sac_notas_fiscais(id),
  canal TEXT NOT NULL CHECK (canal IN ('WHATSAPP', 'EMAIL')),
  tipo_mensagem TEXT NOT NULL CHECK (tipo_mensagem IN ('PRE_ENTREGA', 'POS_ENTREGA', 'PESQUISA', 'ALERTA_ATRASO', 'VIP_FOLLOWUP')),
  status_envio TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (status_envio IN ('PENDENTE', 'ENVIADO', 'ERRO')),
  destinatario TEXT,
  conteudo_mensagem TEXT,
  resposta_api JSONB,
  data_envio TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sac_clientes_cnpj ON sac_clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_sac_clientes_abc ON sac_clientes(classe_abc);
CREATE INDEX IF NOT EXISTS idx_sac_nf_numero ON sac_notas_fiscais(nf_numero);
CREATE INDEX IF NOT EXISTS idx_sac_nf_status ON sac_notas_fiscais(status_entrega);
CREATE INDEX IF NOT EXISTS idx_sac_nf_cliente ON sac_notas_fiscais(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sac_nf_data ON sac_notas_fiscais(data_emissao);
CREATE INDEX IF NOT EXISTS idx_sac_logs_nf ON sac_logs_comunicacao(nf_id);

ALTER TABLE sac_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sac_notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE sac_pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE sac_logs_comunicacao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_all_sac_clientes" ON sac_clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sac_nf" ON sac_notas_fiscais FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sac_pesquisas" ON sac_pesquisas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_sac_logs" ON sac_logs_comunicacao FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "service_all_sac_clientes" ON sac_clientes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sac_nf" ON sac_notas_fiscais FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sac_pesquisas" ON sac_pesquisas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_all_sac_logs" ON sac_logs_comunicacao FOR ALL TO service_role USING (true) WITH CHECK (true);

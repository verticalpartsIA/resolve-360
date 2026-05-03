-- ============= ENUMS =============
CREATE TYPE public.ticket_status AS ENUM ('aberto','em_atendimento','aguardando_cliente','aguardando_interno','concluido','cancelado');
CREATE TYPE public.ticket_priority AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.ticket_channel AS ENUM ('whatsapp','telefone','email','portal','manual');
CREATE TYPE public.occurrence_origin AS ENUM ('interno','externo');
CREATE TYPE public.resolution_status AS ENUM ('em_analise','autorizado','recusado');
CREATE TYPE public.occurrence_reason AS ENUM ('devolucao_total','devolucao_parcial','reparo','troca','reclamacao','duvida_tecnica','outro');
CREATE TYPE public.responsible_sector AS ENUM ('comercial','expedicao','engenharia','producao','compras','qualidade','nao_aplica');
CREATE TYPE public.containment_action AS ENUM ('sucatear','retrabalhar','segregar','liberar_uso','devolver_fornecedor','outro');
CREATE TYPE public.root_cause AS ENUM ('venda','expedicao','engenharia','cliente','fornecedor');
CREATE TYPE public.customer_tier AS ENUM ('A','B','C');
CREATE TYPE public.internal_dept AS ENUM ('comercial','expedicao','engenharia','producao','compras','qualidade');
CREATE TYPE public.internal_status AS ENUM ('aberto','em_andamento','resolvido','cancelado');
CREATE TYPE public.nps_category AS ENUM ('promotor','neutro','detrator');
CREATE TYPE public.message_kind AS ENUM ('whatsapp','email','telefone','nota_interna');

-- ============= CLIENTES =============
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj TEXT UNIQUE NOT NULL,
  razao_social TEXT NOT NULL,
  contato TEXT, telefone TEXT, email TEXT,
  cidade TEXT, estado TEXT,
  tier customer_tier DEFAULT 'B',
  ativo BOOLEAN NOT NULL DEFAULT true,
  origem TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_clientes_updated BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= PRODUTOS =============
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  descricao TEXT NOT NULL,
  fornecedor TEXT, categoria TEXT,
  preco NUMERIC(12,2),
  ativo BOOLEAN NOT NULL DEFAULT true,
  origem TEXT DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= TICKETS =============
CREATE SEQUENCE public.ro_seq START 1;
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT ('RO-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('public.ro_seq')::text, 5, '0')),
  ro_number TEXT,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  customer TEXT NOT NULL,
  customer_doc TEXT, customer_contato TEXT, customer_telefone TEXT,
  city TEXT, state TEXT,
  produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
  part TEXT NOT NULL, part_code TEXT NOT NULL,
  fornecedor TEXT, vendedor TEXT,
  nf_numero TEXT, nf_valor NUMERIC(12,2) DEFAULT 0,
  quantity INT DEFAULT 1, unit_value NUMERIC(12,2) DEFAULT 0,
  reason TEXT NOT NULL,
  occurrence_reason occurrence_reason NOT NULL DEFAULT 'devolucao_total',
  responsible_sector responsible_sector DEFAULT 'nao_aplica',
  origin occurrence_origin DEFAULT 'externo',
  resolution_status resolution_status DEFAULT 'em_analise',
  channel ticket_channel NOT NULL DEFAULT 'manual',
  priority ticket_priority NOT NULL DEFAULT 'media',
  status ticket_status NOT NULL DEFAULT 'aberto',
  sla_hours INT NOT NULL DEFAULT 48,
  whatsapp_thread_id TEXT,
  acao_contencao containment_action[] DEFAULT '{}',
  nc_descricao TEXT,
  root_cause root_cause,
  custo_nao_qualidade NUMERIC(12,2) DEFAULT 0,
  freight_cost_vp NUMERIC(12,2) DEFAULT 0,
  freight_cost_customer NUMERIC(12,2) DEFAULT 0,
  nps INT, nps_sent_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tickets_status ON public.tickets(status);
CREATE INDEX idx_tickets_priority ON public.tickets(priority);
CREATE INDEX idx_tickets_cliente ON public.tickets(cliente_id);
CREATE INDEX idx_tickets_created_at ON public.tickets(created_at DESC);
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= INTERNAL TICKETS =============
CREATE SEQUENCE public.internal_seq START 1;
CREATE TABLE public.internal_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL DEFAULT ('TI-' || TO_CHAR(now(),'YYYY') || '-' || LPAD(nextval('public.internal_seq')::text, 5, '0')),
  linked_occurrence_id UUID REFERENCES public.tickets(id) ON DELETE SET NULL,
  linked_customer TEXT,
  target_department internal_dept NOT NULL,
  priority ticket_priority NOT NULL DEFAULT 'media',
  status internal_status NOT NULL DEFAULT 'aberto',
  subject TEXT NOT NULL, description TEXT, response TEXT,
  sla_hours INT NOT NULL DEFAULT 24,
  opened_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_internal_status ON public.internal_tickets(status);
CREATE INDEX idx_internal_dept ON public.internal_tickets(target_department);
ALTER TABLE public.internal_tickets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_internal_updated BEFORE UPDATE ON public.internal_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============= TICKET MESSAGES =============
CREATE TABLE public.ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  internal_ticket_id UUID REFERENCES public.internal_tickets(id) ON DELETE CASCADE,
  kind message_kind NOT NULL DEFAULT 'nota_interna',
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_msg_ticket ON public.ticket_messages(ticket_id);
CREATE INDEX idx_msg_internal ON public.ticket_messages(internal_ticket_id);
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- ============= NPS RECORDS =============
CREATE TABLE public.nps_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  customer TEXT NOT NULL,
  customer_tier customer_tier DEFAULT 'B',
  q1_recomendacao INT NOT NULL,
  q2_resolucao INT NOT NULL,
  q3_agilidade INT NOT NULL,
  comentario TEXT,
  category nps_category NOT NULL,
  trigger TEXT DEFAULT 'pos_resolucao',
  survey_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nps_ticket ON public.nps_records(ticket_id);
CREATE INDEX idx_nps_date ON public.nps_records(survey_date DESC);
ALTER TABLE public.nps_records ENABLE ROW LEVEL SECURITY;

-- ============= AUDIT LOG =============
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_name TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON public.audit_log(actor_id);
CREATE INDEX idx_audit_created ON public.audit_log(created_at DESC);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ============= SLA CONFIG =============
CREATE TABLE public.sla_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  priority ticket_priority UNIQUE NOT NULL,
  hours INT NOT NULL,
  warn_50_pct BOOLEAN NOT NULL DEFAULT true,
  warn_80_pct BOOLEAN NOT NULL DEFAULT true,
  warn_100_pct BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sla_config ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sla_updated BEFORE UPDATE ON public.sla_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.sla_config (priority, hours) VALUES
  ('baixa', 96), ('media', 48), ('alta', 24), ('critica', 8);

-- ============= NOTIFICATIONS =============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT, link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notif_user ON public.notifications(user_id, read_at);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ============= POLICIES =============
CREATE POLICY "clientes_select" ON public.clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_insert" ON public.clientes FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "clientes_update" ON public.clientes FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "clientes_delete" ON public.clientes FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "produtos_select" ON public.produtos FOR SELECT TO authenticated USING (true);
CREATE POLICY "produtos_insert" ON public.produtos FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "produtos_update" ON public.produtos FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "produtos_delete" ON public.produtos FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "tickets_select" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "tickets_insert" ON public.tickets FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tickets_update" ON public.tickets FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "tickets_delete" ON public.tickets FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "internal_select" ON public.internal_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "internal_insert" ON public.internal_tickets FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "internal_update" ON public.internal_tickets FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'operador'::app_role) OR has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "internal_delete" ON public.internal_tickets FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "msg_select" ON public.ticket_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "msg_insert" ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id OR author_id IS NULL);
CREATE POLICY "msg_update" ON public.ticket_messages FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "msg_delete" ON public.ticket_messages FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "nps_select" ON public.nps_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "nps_insert_public" ON public.nps_records FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "nps_update" ON public.nps_records FOR UPDATE TO authenticated USING (
  has_role(auth.uid(),'qualidade'::app_role) OR has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "audit_select" ON public.audit_log FOR SELECT TO authenticated USING (
  has_role(auth.uid(),'gestor'::app_role) OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "audit_insert" ON public.audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "sla_select" ON public.sla_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "sla_update" ON public.sla_config FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "sla_insert" ON public.sla_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "notif_select" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_update" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "notif_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notif_delete" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);
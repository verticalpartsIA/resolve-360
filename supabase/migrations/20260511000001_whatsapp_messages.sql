-- ============= WHATSAPP MESSAGES =============
-- Caixa de entrada universal para eventos da Evolution API.
-- Recebe TODAS as mensagens (com e sem ticket vinculado).
-- A coluna ticket_id é preenchida pelo webhook quando há um ticket aberto
-- com whatsapp_thread_id = remote_jid.

CREATE TABLE public.whatsapp_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  instance     TEXT        NOT NULL DEFAULT 'pv360',
  remote_jid   TEXT        NOT NULL,                        -- ex.: 5511999887766@s.whatsapp.net
  push_name    TEXT,                                        -- nome exibido no WhatsApp
  from_me      BOOLEAN     NOT NULL DEFAULT false,          -- true = enviada pela empresa
  message_id   TEXT,                                        -- ID da mensagem no WhatsApp
  body         TEXT        NOT NULL,                        -- texto legível
  media_type   TEXT,                                        -- image | video | audio | document | sticker | ...
  media_url    TEXT,                                        -- URL pública (se houver)
  ticket_id    UUID        REFERENCES public.tickets(id) ON DELETE SET NULL,
  raw          JSONB,                                       -- payload completo da Evolution API
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_msg_remote  ON public.whatsapp_messages(remote_jid, created_at DESC);
CREATE INDEX idx_wa_msg_ticket  ON public.whatsapp_messages(ticket_id);
CREATE INDEX idx_wa_msg_created ON public.whatsapp_messages(created_at DESC);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Apenas usuários autenticados lêem
CREATE POLICY "wa_msg_select"
  ON public.whatsapp_messages FOR SELECT
  TO authenticated
  USING (true);

-- Apenas service role faz INSERT (via webhook no servidor)
-- service_role bypassa RLS — não precisa de policy explícita para INSERT.

-- Apenas admin deleta (limpeza manual)
CREATE POLICY "wa_msg_delete"
  ON public.whatsapp_messages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

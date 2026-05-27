import { createClient } from "@supabase/supabase-js";

// ─── config ───────────────────────────────────────────────────────────────────
const HERMES_URL   = () => process.env.HERMES_URL   ?? "http://72.61.48.156:32768";
const HERMES_MODEL = () => process.env.HERMES_MODEL ?? "claude-haiku-4-5";
const EVO_URL      = "http://72.61.48.156:8080";
const EVO_INSTANCE = "pv360";
const HISTORY_LIMIT = 20;
const TIMEOUT_MS    = 30_000;

const SB_URL = "https://jkbklzlbhhfnamaeislb.supabase.co";
const SB_KEY = () =>
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYmtsemxiaGhmbmFtYWVpc2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc5MDM5MywiZXhwIjoyMDkzMzY2MzkzfQ.WoFDfpykUrwQcg0uzDwgfKSwWCy-7zrrJGWGOpo5drs";

// ─── system prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é um atendente de pós-venda da VerticalParts, empresa especializada em peças para elevadores, escadas rolantes e esteiras (importações e produtos nacionais). Marcas principais: BST, Monarch, Fermator.

Você atende clientes via WhatsApp. Siga estas diretrizes:

COMUNICAÇÃO:
- Mensagens curtas e objetivas (máximo 3-4 linhas por mensagem)
- Tom profissional mas amigável
- Português brasileiro coloquial mas correto
- Use emojis com moderação quando apropriado

VOCÊ PODE AJUDAR COM:
- Acompanhamento de pedidos e ocorrências de pós-venda
- Dúvidas sobre peças, produtos e compatibilidade
- Status de entregas e prazos
- Abertura de reclamações e registros de ocorrência
- Informações gerais sobre a empresa e produtos

QUANDO NÃO SOUBER:
- Diga que vai verificar e que um especialista entrará em contato em breve
- Nunca invente números de pedido, preços ou prazos específicos
- Nunca compartilhe informações confidenciais da empresa

IMPORTANTE:
- Se o cliente perguntar diretamente se você é humano ou robô, seja honesto mas gentil
- Priorize a resolução do problema do cliente
- Se a situação for urgente ou complexa, avise que vai acionar a equipe técnica imediatamente`;

// ─── tipos internos ───────────────────────────────────────────────────────────
type HermesMsg = { role: "system" | "user" | "assistant"; content: string };
type HermesResp = { message?: { role: string; content: string }; done?: boolean };

// ─── chamada ao Hermes ────────────────────────────────────────────────────────
async function callHermes(history: HermesMsg[]): Promise<string | null> {
  const messages: HermesMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

  try {
    const res = await fetch(`${HERMES_URL()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: HERMES_MODEL(), stream: false, messages }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      console.error(`[hermes] HTTP ${res.status}:`, await res.text().catch(() => ""));
      return null;
    }

    const data = (await res.json()) as HermesResp;
    return data?.message?.content?.trim() || null;
  } catch (err) {
    console.error("[hermes] call error:", err instanceof Error ? err.message : String(err));
    return null;
  }
}

// ─── mídias que não geram resposta ────────────────────────────────────────────
const MEDIA_ONLY = new Set([
  "[imagem]", "[video]", "[audio]", "[documento]",
  "[sticker]", "[figurinha]", "[midia]",
]);

// ─── função principal exportada ───────────────────────────────────────────────
export async function autoReplyWithHermes(params: {
  remoteJid: string;
  body: string;
  ticketId: string | null;
  pushName: string | null;
}) {
  // Desligado se env não estiver explicitamente habilitado
  if (process.env.HERMES_AUTO_REPLY !== "true") return;

  const { remoteJid, body, ticketId, pushName } = params;

  // Não responde grupos
  if (remoteJid.endsWith("@g.us")) return;

  // Não responde mídia pura (sem texto)
  if (MEDIA_ONLY.has(body.toLowerCase())) return;

  const phone = remoteJid
    .replace("@s.whatsapp.net", "")
    .replace("@lid", "")
    .replace("@c.us", "");

  const sb = createClient(SB_URL, SB_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Busca histórico completo por número (usa coluna phone gerada)
  const { data: history, error: histErr } = await sb
    .from("whatsapp_messages")
    .select("body, from_me")
    .eq("phone", phone)
    .order("created_at", { ascending: true })
    .limit(HISTORY_LIMIT);

  if (histErr) {
    console.error("[hermes] history error:", histErr.message);
    return;
  }

  // Monta histórico para o Hermes
  const messages: HermesMsg[] = (history ?? []).map((m) => ({
    role: (m.from_me ? "assistant" : "user") as "user" | "assistant",
    content: m.body,
  }));

  console.log(`[hermes] chamando para ${pushName ?? phone} (${messages.length} msgs de histórico)`);

  const reply = await callHermes(messages);
  if (!reply) {
    console.warn("[hermes] sem resposta gerada para", remoteJid);
    return;
  }

  // Envia via Evolution API
  try {
    const r = await fetch(`${EVO_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.EVOLUTION_APIKEY ?? "suporte123",
      },
      body: JSON.stringify({ number: phone, text: reply }),
    });

    if (!r.ok) {
      const detail = await r.json().catch(() => ({}));
      console.error("[hermes] Evolution send error:", detail);
      return;
    }

    const evResult = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    const msgKey = evResult?.key as Record<string, unknown> | undefined;

    // Salva a resposta no Supabase
    await sb.from("whatsapp_messages").insert({
      instance: EVO_INSTANCE,
      remote_jid: remoteJid,
      from_me: true,
      body: reply,
      message_id: (msgKey?.id as string) ?? null,
      ticket_id: ticketId,
    });

    console.log(`[hermes] ✅ respondido para ${pushName ?? phone}: "${reply.slice(0, 60)}..."`);
  } catch (err) {
    console.error("[hermes] send error:", err instanceof Error ? err.message : String(err));
  }
}

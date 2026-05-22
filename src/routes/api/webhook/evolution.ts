import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";

const SB_URL = "https://jkbklzlbhhfnamaeislb.supabase.co";
const getSb = () =>
  createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

// Evolution API v2 payload — evento messages.upsert
type EvoPayload = {
  event: string;
  instance: string;
  data: {
    key: { remoteJid: string; fromMe: boolean; id?: string };
    pushName?: string;
    messageType?: string;
    message?: Record<string, unknown>;
  };
};

function extractBody(msg: Record<string, unknown> | undefined): string {
  if (!msg) return "[mídia]";
  if (typeof msg.conversation === "string") return msg.conversation;
  const ext = msg.extendedTextMessage as Record<string, unknown> | undefined;
  if (typeof ext?.text === "string") return ext.text;
  const img = msg.imageMessage as Record<string, unknown> | undefined;
  if (img) return (typeof img.caption === "string" && img.caption) || "[imagem]";
  if (msg.videoMessage) return "[vídeo]";
  if (msg.audioMessage) return "[áudio]";
  if (msg.documentMessage) return "[documento]";
  if (msg.stickerMessage) return "[sticker]";
  return "[mídia]";
}

function extractMediaType(msg: Record<string, unknown> | undefined): string | null {
  if (!msg) return null;
  if (msg.imageMessage) return "image";
  if (msg.videoMessage) return "video";
  if (msg.audioMessage) return "audio";
  if (msg.documentMessage) return "document";
  if (msg.stickerMessage) return "sticker";
  return null;
}

export const APIRoute = createAPIFileRoute("/api/webhook/evolution")({
  // Health-check — Evolution API testa com GET antes de ativar
  GET: async () => new Response("OK", { status: 200 }),

  POST: async ({ request }) => {
    // Validação básica do apikey
    const apikey = request.headers.get("apikey") ?? request.headers.get("x-api-key");
    const expected = process.env.EVOLUTION_APIKEY ?? "suporte123";
    if (apikey !== expected) {
      console.warn("[webhook/evolution] apikey inválido:", apikey);
      return new Response("Unauthorized", { status: 401 });
    }

    let payload: EvoPayload;
    try {
      payload = (await request.json()) as EvoPayload;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // Só processa mensagens recebidas
    if (payload.event !== "messages.upsert") {
      return new Response("OK", { status: 200 });
    }

    const { key, pushName, message } = payload.data ?? {};
    if (!key?.remoteJid) return new Response("OK", { status: 200 });

    const remoteJid = key.remoteJid;
    const fromMe = key.fromMe ?? false;
    const body = extractBody(message);
    const mediaType = extractMediaType(message);

    const sb = getSb();

    // Vincula ao ticket aberto com esse número (se houver)
    let ticketId: string | null = null;
    const { data: linked } = await sb
      .from("tickets")
      .select("id")
      .eq("whatsapp_thread_id", remoteJid)
      .in("status", ["aberto", "em_atendimento", "aguardando_cliente", "aguardando_interno"])
      .order("created_at", { ascending: false })
      .limit(1);
    ticketId = linked?.[0]?.id ?? null;

    const { error } = await sb.from("whatsapp_messages").insert({
      instance: payload.instance ?? "pv360",
      remote_jid: remoteJid,
      push_name: pushName ?? null,
      from_me: fromMe,
      message_id: key.id ?? null,
      body,
      media_type: mediaType,
      media_url: null,
      ticket_id: ticketId,
      raw: payload as unknown as Record<string, unknown>,
    });

    if (error) {
      console.error("[webhook/evolution] insert error:", error.message);
      return new Response("Internal Server Error", { status: 500 });
    }

    console.log(`[webhook/evolution] ${fromMe ? "→" : "←"} ${remoteJid}: ${body.slice(0, 60)}`);
    return new Response("OK", { status: 200 });
  },
});

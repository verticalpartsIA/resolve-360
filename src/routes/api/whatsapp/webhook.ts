import { createAPIFileRoute } from '@tanstack/react-start/api';
import { createClient } from '@supabase/supabase-js';

// ─── config ───────────────────────────────────────────────────────────────────
const EVOLUTION_APIKEY = process.env.EVOLUTION_APIKEY || 'suporte123';
const SUPABASE_URL = 'https://jkbklzlbhhfnamaeislb.supabase.co';
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImprYmtsemxiaGhmbmFtYWVpc2xiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Nzc5MDM5MywiZXhwIjoyMDkzMzY2MzkzfQ.WoFDfpykUrwQcg0uzDwgfKSwWCy-7zrrJGWGOpo5drs';

// ─── helpers ──────────────────────────────────────────────────────────────────
function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type WaMessage = Record<string, unknown>;

function extractBody(message: WaMessage): string | null {
  if (!message) return null;
  if (typeof message.conversation === 'string') return message.conversation;
  const ext = message.extendedTextMessage as WaMessage | undefined;
  if (ext && typeof ext.text === 'string') return ext.text;
  const img = message.imageMessage as WaMessage | undefined;
  if (img) return typeof img.caption === 'string' && img.caption ? img.caption : '[imagem]';
  if (message.videoMessage) return '[vídeo]';
  if (message.audioMessage) return '[áudio]';
  if (message.documentMessage) {
    const doc = message.documentMessage as WaMessage;
    return typeof doc.fileName === 'string' ? `[documento: ${doc.fileName}]` : '[documento]';
  }
  if (message.stickerMessage) return '[figurinha]';
  if (message.locationMessage) return '[localização]';
  if (message.contactMessage) return '[contato]';
  return null;
}

function extractMediaType(message: WaMessage): string | null {
  if (!message) return null;
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.audioMessage) return 'audio';
  if (message.documentMessage) return 'document';
  if (message.stickerMessage) return 'sticker';
  if (message.locationMessage) return 'location';
  if (message.contactMessage) return 'contact';
  return null;
}

const OPEN_STATUSES = ['aberto', 'em_atendimento', 'aguardando_cliente', 'aguardando_interno'];

// ─── route ────────────────────────────────────────────────────────────────────
export const APIRoute = createAPIFileRoute('/api/whatsapp/webhook')({
  /** Health-check — Evolution API pings this before saving */
  GET: async () => {
    return Response.json({ status: 'ok', service: 'posvenda360-whatsapp-webhook', version: '1.0' });
  },

  /** Receive Evolution API events */
  POST: async ({ request }) => {
    // 1. Validate apikey sent by Evolution API
    const apikey =
      request.headers.get('apikey') ??
      request.headers.get('x-api-key') ??
      '';

    if (apikey !== EVOLUTION_APIKEY) {
      console.warn('[webhook] apikey inválido:', apikey.slice(0, 8));
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse body
    let payload: Record<string, unknown>;
    try {
      payload = await request.json();
    } catch {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const event = payload.event as string | undefined;
    const instance = (payload.instance as string | undefined) ?? 'pv360';
    const data = (payload.data ?? {}) as Record<string, unknown>;

    console.log(`[webhook] event=${event} instance=${instance}`);

    // 3. Only process message events
    if (event !== 'messages.upsert') {
      return Response.json({ ok: true, event, skipped: true });
    }

    const key = (data.key ?? {}) as Record<string, unknown>;
    const remoteJid = key.remoteJid as string | undefined;
    const fromMe = Boolean(key.fromMe);
    const messageId = key.id as string | undefined;
    const pushName = data.pushName as string | undefined;
    const message = (data.message ?? {}) as WaMessage;

    // Ignore groups and broadcast
    if (
      !remoteJid ||
      remoteJid.endsWith('@g.us') ||
      remoteJid === 'status@broadcast'
    ) {
      return Response.json({ ok: true, skipped: 'group_or_broadcast' });
    }

    const bodyText = extractBody(message);
    const mediaType = extractMediaType(message);

    // Nothing useful to store
    if (!bodyText && !mediaType) {
      return Response.json({ ok: true, skipped: 'no_body' });
    }

    const displayBody = bodyText ?? `[${mediaType}]`;
    const supabase = getSupabase();

    // 4. Persist to whatsapp_messages (universal inbox)
    const { data: inserted, error: insertErr } = await supabase
      .from('whatsapp_messages')
      .insert({
        instance,
        remote_jid: remoteJid,
        push_name: pushName ?? null,
        from_me: fromMe,
        message_id: messageId ?? null,
        body: displayBody,
        media_type: mediaType ?? null,
        raw: data,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[webhook] whatsapp_messages insert error:', insertErr.message);
      // Don't bail — still try to link to ticket
    }

    // 5. Link to an open ticket by whatsapp_thread_id (skip outgoing msgs from our own number)
    if (!fromMe) {
      const { data: ticket } = await supabase
        .from('tickets')
        .select('id, code')
        .eq('whatsapp_thread_id', remoteJid)
        .in('status', OPEN_STATUSES)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ticket) {
        // Update whatsapp_messages row with ticket_id
        if (inserted?.id) {
          await supabase
            .from('whatsapp_messages')
            .update({ ticket_id: ticket.id })
            .eq('id', inserted.id);
        }

        // Save message in ticket_messages
        const { error: tmErr } = await supabase.from('ticket_messages').insert({
          ticket_id: ticket.id,
          kind: 'whatsapp',
          author_name: pushName ?? remoteJid.replace('@s.whatsapp.net', ''),
          body: displayBody,
        });

        if (tmErr) {
          console.error('[webhook] ticket_messages insert error:', tmErr.message);
        } else {
          console.log(`[webhook] mensagem linkada ao ticket ${ticket.code}`);
        }
      }
    }

    return Response.json({ ok: true });
  },
});

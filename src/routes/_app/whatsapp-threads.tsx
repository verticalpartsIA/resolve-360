import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { MessageCircle, Search, RefreshCw, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/_app/whatsapp-threads")({
  component: WhatsappThreads,
});

// ─── tipos ────────────────────────────────────────────────────────────────────
type WaMsg = {
  id: string;
  remote_jid: string;
  push_name: string | null;
  body: string;
  from_me: boolean;
  ticket_id: string | null;
  created_at: string;
};

type Thread = {
  remoteJid: string;
  pushName: string | null;
  lastBody: string;
  lastAt: string;
  fromMe: boolean;
  ticketId: string | null;
  unread: number; // mensagens recebidas na última hora
};

// ─── helpers ──────────────────────────────────────────────────────────────────
function jidToPhone(jid: string) {
  return jid.replace("@s.whatsapp.net", "").replace("@lid", "").replace("@c.us", "");
}

function displayName(t: Thread) {
  if (t.pushName) return t.pushName;
  return jidToPhone(t.remoteJid);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (m < 1) return "agora";
  if (m < 60) return `${m}min`;
  if (h < 24) return `${h}h`;
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function toThreads(rows: WaMsg[]): Thread[] {
  const map = new Map<string, Thread>();
  const cutoff = Date.now() - 3600_000; // última hora

  // rows já vêm ordenadas por created_at desc
  for (const r of rows) {
    if (!map.has(r.remote_jid)) {
      map.set(r.remote_jid, {
        remoteJid: r.remote_jid,
        pushName: r.push_name,
        lastBody: r.body,
        lastAt: r.created_at,
        fromMe: r.from_me,
        ticketId: r.ticket_id,
        unread: 0,
      });
    }
    const t = map.get(r.remote_jid)!;
    if (!r.from_me && new Date(r.created_at).getTime() > cutoff) {
      t.unread++;
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime(),
  );
}

// ─── componente ───────────────────────────────────────────────────────────────
function WhatsappThreads() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [online, setOnline] = useState(true);

  async function load() {
    const { data, error } = await (supabase as any)
      .from("whatsapp_messages")
      .select("id,remote_jid,push_name,body,from_me,ticket_id,created_at")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("[threads] load error:", error.message);
      setOnline(false);
      return;
    }
    setOnline(true);
    setThreads(toThreads((data as WaMsg[]) ?? []));
    setLoading(false);
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 10_000); // polling a cada 10s
    return () => clearInterval(id);
  }, []);

  const filtered = threads.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (t.pushName ?? "").toLowerCase().includes(q) ||
      jidToPhone(t.remoteJid).includes(q) ||
      t.lastBody.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Comunicação</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">WhatsApp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {threads.length} conversa(s) · instância{" "}
            <span className="font-mono text-xs">pv360</span>
            {online ? (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-500">
                <Wifi className="h-3 w-3" /> online
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1 text-red-500">
                <WifiOff className="h-3 w-3" /> offline
              </span>
            )}
          </p>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-2 rounded-md border border-input bg-card px-3 py-2 text-sm hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          className="w-full rounded-lg border bg-card py-2 pl-9 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
          placeholder="Buscar por nome ou número..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground/40" />
          <p className="mt-3 text-sm font-medium">Nenhuma conversa ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Mensagens recebidas no número conectado aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
          <ul className="divide-y">
            {filtered.map((t) => {
              const name = displayName(t);
              return (
                <li key={t.remoteJid}>
                  <Link
                    to="/thread/$id"
                    params={{ id: t.remoteJid }}
                    className="flex items-center gap-4 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="relative shrink-0">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/15 text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        {initials(name)}
                      </div>
                      {t.unread > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                          {t.unread}
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="truncate font-semibold text-sm">{name}</span>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {relativeTime(t.lastAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {t.fromMe && (
                          <span className="text-[11px] text-muted-foreground">Você:</span>
                        )}
                        <p className="truncate text-sm text-muted-foreground">{t.lastBody}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground/60">
                          {jidToPhone(t.remoteJid)}
                        </span>
                        {t.ticketId && (
                          <span className="inline-flex items-center rounded bg-gold/10 px-1.5 py-0.5 text-[10px] font-medium text-gold">
                            ticket vinculado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Arrow */}
                    <svg className="h-4 w-4 shrink-0 text-muted-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

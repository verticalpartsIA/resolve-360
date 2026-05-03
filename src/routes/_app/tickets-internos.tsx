import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { StatusBadge, PriorityBadge } from "@/components/app/StatusBadge";
import { SlaBar } from "@/components/app/SlaBar";
import { STATUS_LABEL, type TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tickets-internos")({ component: TicketsList });

const filters: ("todos" | TicketStatus)[] = ["todos", "aberto", "analise", "laudo", "concluido"];

function TicketsList() {
  const { tickets } = useStore();
  const [filter, setFilter] = useState<(typeof filters)[number]>("todos");
  const [q, setQ] = useState("");

  const filtered = tickets.filter((t) => {
    if (filter !== "todos" && t.status !== filter) return false;
    if (q && !`${t.code} ${t.customer} ${t.part} ${t.partCode}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Tickets</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Todos os tickets</h1>
        </div>
        <Link to="/tickets/novo" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          + Novo ticket
        </Link>
      </div>

      <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-elegant)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por código, cliente, peça..."
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring sm:w-80"
          />
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70",
                )}
              >
                {f === "todos" ? "Todos" : STATUS_LABEL[f]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <div className="hidden grid-cols-[120px_1fr_auto_120px_140px_40px] items-center gap-4 border-b bg-muted/40 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground lg:grid">
          <div>Código</div>
          <div>Cliente / Peça</div>
          <div>Status</div>
          <div>Prioridade</div>
          <div>SLA</div>
          <div></div>
        </div>
        <ul className="divide-y">
          {filtered.map((t) => (
            <li key={t.id}>
              <Link
                to="/tickets/$id"
                params={{ id: t.id }}
                className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-muted/40 lg:grid-cols-[120px_1fr_auto_120px_140px_40px] lg:items-center lg:gap-4"
              >
                <span className="font-mono text-xs font-semibold">{t.code}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.customer}</div>
                  <div className="truncate text-xs text-muted-foreground">{t.part} · {t.partCode}</div>
                </div>
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <SlaBar ticket={t} />
                <span className="hidden text-muted-foreground lg:block">→</span>
              </Link>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhum ticket encontrado.</li>}
        </ul>
      </div>
    </div>
  );
}

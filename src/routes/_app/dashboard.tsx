import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, slaStatus } from "@/lib/store";
import { StatusBadge, PriorityBadge } from "@/components/app/StatusBadge";
import { SlaBar } from "@/components/app/SlaBar";
import { ArrowUpRight, Clock, AlertTriangle, CheckCircle2, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/")({ component: OperatorDashboard });

function OperatorDashboard() {
  const { tickets } = useStore();
  const open = tickets.filter((t) => t.status !== "concluido");
  const atRisk = open.filter((t) => slaStatus(t).tone !== "ok").length;
  const todayResolved = tickets.filter((t) => t.status === "concluido").length;
  const whatsapp = tickets.filter((t) => t.channel === "whatsapp").length;

  const sorted = [...open].sort((a, b) => slaStatus(b).pct - slaStatus(a).pct);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Operador</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Bem-vinda, Maria</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {open.length} tickets em andamento · {atRisk} demandam atenção imediata
          </p>
        </div>
        <Link to="/tickets/novo" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          + Novo ticket
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={Clock} label="Em andamento" value={open.length} tone="primary" />
        <KpiCard icon={AlertTriangle} label="Risco de SLA" value={atRisk} tone="danger" />
        <KpiCard icon={CheckCircle2} label="Concluídos" value={todayResolved} tone="success" />
        <KpiCard icon={MessageCircle} label="Via WhatsApp" value={whatsapp} tone="gold" />
      </div>

      <section className="rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Fila de atendimento</h2>
            <p className="text-xs text-muted-foreground">Ordenada por proximidade do SLA</p>
          </div>
          <Link to="/tickets" className="text-xs font-medium text-gold hover:underline inline-flex items-center gap-1">
            Ver todos <ArrowUpRight className="h-3 w-3" />
          </Link>
        </header>
        <ul className="divide-y">
          {sorted.map((t) => (
            <li key={t.id}>
              <Link to="/tickets/$id" params={{ id: t.id }} className="grid grid-cols-1 gap-3 px-5 py-4 hover:bg-muted/40 sm:grid-cols-[auto_1fr_auto_140px] sm:items-center">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-muted-foreground">{t.code}</span>
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="min-w-0">
                  <div className="truncate font-medium">{t.customer}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.part} · {t.partCode}
                  </div>
                </div>
                <StatusBadge status={t.status} />
                <SlaBar ticket={t} />
              </Link>
            </li>
          ))}
          {sorted.length === 0 && (
            <li className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhum ticket em andamento. ✨</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number; tone: "primary" | "danger" | "success" | "gold" }) {
  const styles = {
    primary: "bg-primary text-primary-foreground",
    danger: "bg-destructive/10 text-destructive",
    success: "bg-success/10 text-success",
    gold: "bg-gold-soft text-gold-foreground",
  }[tone];
  return (
    <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-elegant)]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-md ${styles}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

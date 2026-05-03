import { createFileRoute } from "@tanstack/react-router";
import { useStore, slaStatus } from "@/lib/store";
import { ROOT_CAUSE_LABEL, type RootCause } from "@/lib/types";
import { TrendingUp, Clock, ShieldCheck, Star, Repeat } from "lucide-react";

export const Route = createFileRoute("/gestor")({ component: ManagerDashboard });

function ManagerDashboard() {
  const { tickets } = useStore();
  const closed = tickets.filter((t) => t.status === "concluido");
  const ttrHours = closed.length
    ? closed.reduce((s, t) => s + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 36e5, 0) / closed.length
    : 0;
  const slaCompliance = closed.length
    ? (closed.filter((t) => (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()) / 36e5 <= t.slaHours).length / closed.length) * 100
    : 0;
  const npsValues = closed.map((t) => t.nps).filter((n): n is number => n !== undefined);
  const promoters = npsValues.filter((n) => n >= 9).length;
  const detractors = npsValues.filter((n) => n <= 6).length;
  const nps = npsValues.length ? Math.round(((promoters - detractors) / npsValues.length) * 100) : 0;

  // reincidência por cliente (clientes com >1 ticket)
  const byCustomer: Record<string, number> = {};
  tickets.forEach((t) => (byCustomer[t.customer] = (byCustomer[t.customer] ?? 0) + 1));
  const reincident = Object.values(byCustomer).filter((n) => n > 1).length;
  const reincidenceRate = tickets.length ? (reincident / Object.keys(byCustomer).length) * 100 : 0;

  const causeCounts: Record<RootCause, number> = { venda: 0, expedicao: 0, engenharia: 0, cliente: 0, fornecedor: 0 };
  closed.forEach((t) => t.rootCause && (causeCounts[t.rootCause] += 1));
  const maxCause = Math.max(1, ...Object.values(causeCounts));

  const atRisk = tickets.filter((t) => t.status !== "concluido" && slaStatus(t).tone !== "ok");

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Gestor</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Indicadores em tempo real</h1>
        <p className="mt-1 text-sm text-muted-foreground">Performance da operação de pós-venda VerticalParts</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi icon={Clock} label="TTR médio" value={`${ttrHours.toFixed(1)}h`} hint="Time to Resolve" />
        <Kpi icon={ShieldCheck} label="SLA Compliance" value={`${slaCompliance.toFixed(0)}%`} hint={`${closed.length} concluídos`} accent />
        <Kpi icon={Star} label="NPS" value={`${nps}`} hint={`${npsValues.length} respostas`} />
        <Kpi icon={Repeat} label="Reincidência" value={`${reincidenceRate.toFixed(0)}%`} hint="Clientes recorrentes" />
        <Kpi icon={TrendingUp} label="Total de tickets" value={`${tickets.length}`} hint="Período atual" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <h2 className="text-base font-semibold">Distribuição de causa raiz</h2>
          <p className="text-xs text-muted-foreground">Tickets concluídos · {closed.length} amostras</p>
          <ul className="mt-5 space-y-3">
            {(Object.keys(causeCounts) as RootCause[]).map((c) => (
              <li key={c}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{ROOT_CAUSE_LABEL[c]}</span>
                  <span className="font-semibold">{causeCounts[c]}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-[var(--gradient-gold)]" style={{ width: `${(causeCounts[c] / maxCause) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <h2 className="text-base font-semibold">Tickets em risco</h2>
          <p className="text-xs text-muted-foreground">SLA próximo do limite ou estourado</p>
          <ul className="mt-4 divide-y">
            {atRisk.map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">{t.customer}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">{t.code} · {t.part}</div>
                </div>
                <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                  {slaStatus(t).label}
                </span>
              </li>
            ))}
            {atRisk.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">Nenhum ticket em risco. ✨</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 shadow-[var(--shadow-elegant)] ${accent ? "bg-primary text-primary-foreground border-primary" : "bg-card"}`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${accent ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{label}</span>
        <Icon className={`h-4 w-4 ${accent ? "text-gold" : "text-gold"}`} />
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      <div className={`mt-0.5 text-[11px] ${accent ? "text-primary-foreground/60" : "text-muted-foreground"}`}>{hint}</div>
    </div>
  );
}

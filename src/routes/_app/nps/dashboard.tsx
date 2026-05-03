import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { aggregateNps, categorizeNps, type NpsRecord } from "@/lib/types";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import { Smile, Meh, Frown, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_app/nps/dashboard")({ component: NpsDashboard });

function NpsDashboard() {
  const { npsRecords, tickets } = useStore();
  // fallback: tickets concluídos com nota → constrói registros sintéticos só pra agregação
  const fallback: NpsRecord[] = tickets
    .filter((t) => t.nps !== undefined)
    .map((t) => ({
      id: t.id,
      customer: t.customer,
      customerTier: "B",
      occurrenceId: t.id,
      q1Recomendacao: t.nps as number,
      q2Resolucao: t.nps as number,
      q3Agilidade: t.nps as number,
      category: categorizeNps(t.nps as number),
      surveyDate: t.npsSentAt ?? t.updatedAt,
      trigger: "pos_resolucao",
      createdAt: t.createdAt,
    }));
  const all = npsRecords.length ? npsRecords : fallback;
  const agg = aggregateNps(all);
  const total = agg.total || 1;

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">NPS</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">NPS Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">Coletado das pesquisas respondidas no próprio sistema · {agg.total} respostas</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card icon={TrendingUp} label="NPS Score" value={`${agg.npsScore.toFixed(0)}`} tone="primary" />
        <Card icon={Smile} label="Promotores" value={`${agg.promotores}`} tone="success" hint={`${agg.pctPromotores.toFixed(0)}%`} />
        <Card icon={Meh} label="Neutros" value={`${agg.neutros}`} tone="warn" hint={`${((agg.neutros / total) * 100).toFixed(0)}%`} />
        <Card icon={Frown} label="Detratores" value={`${agg.detratores}`} tone="danger" hint={`${agg.pctDetratores.toFixed(0)}%`} />
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-base font-semibold">Distribuição</h2>
        <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-success" style={{ width: `${(agg.promotores / total) * 100}%` }} />
          <div className="h-full bg-warning" style={{ width: `${(agg.neutros / total) * 100}%` }} />
          <div className="h-full bg-destructive" style={{ width: `${(agg.detratores / total) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function Card({ icon: Icon, label, value, hint, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; hint?: string; tone: "primary" | "success" | "warn" | "danger" }) {
  const tones = { primary: "border-l-primary", success: "border-l-success", warn: "border-l-warning", danger: "border-l-destructive" };
  return (
    <div className={`rounded-xl border border-l-4 bg-card p-5 shadow-[var(--shadow-elegant)] ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

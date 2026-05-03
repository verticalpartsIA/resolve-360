import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import {
  CUSTOMER_TIER_LABEL,
  NPS_CATEGORY_LABEL,
  aggregateNps,
  type CustomerTier,
  type NpsCategory,
  type NpsTrigger,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, TrendingUp, Smile, Meh, Frown } from "lucide-react";

export const Route = createFileRoute("/nps")({ component: NpsPage });

function NpsPage() {
  const { npsRecords, tickets, submitNpsSurvey } = useStore();
  const [open, setOpen] = useState(false);
  const agg = useMemo(() => aggregateNps(npsRecords), [npsRecords]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Pesquisa</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">NPS — Net Promoter Score</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {npsRecords.length} respostas · disparos automáticos pós-resolução e pós-venda (D+7)
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Registrar pesquisa
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ScoreCard label="NPS Score" value={agg.npsScore.toFixed(0)} hint="%Promotores − %Detratores" tone="primary" icon={TrendingUp} />
        <ScoreCard label="Promotores" value={`${agg.promotores}`} hint={`${agg.pctPromotores.toFixed(0)}%`} tone="success" icon={Smile} />
        <ScoreCard label="Neutros" value={`${agg.neutros}`} hint={`${(agg.total ? (agg.neutros / agg.total) * 100 : 0).toFixed(0)}%`} tone="warn" icon={Meh} />
        <ScoreCard label="Detratores" value={`${agg.detratores}`} hint={`${agg.pctDetratores.toFixed(0)}%`} tone="danger" icon={Frown} />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-center">Q1</th>
              <th className="px-4 py-3 text-center">Q2</th>
              <th className="px-4 py-3 text-center">Q3</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Disparo</th>
              <th className="px-4 py-3 text-left">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {npsRecords.map((r) => (
              <tr key={r.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{r.customer}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.customerTier}</td>
                <td className="px-4 py-3 text-center font-semibold">{r.q1Recomendacao}</td>
                <td className="px-4 py-3 text-center">{r.q2Resolucao}</td>
                <td className="px-4 py-3 text-center">{r.q3Agilidade}</td>
                <td className="px-4 py-3"><CategoryPill cat={r.category} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{triggerLabel(r.trigger)}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(r.surveyDate).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
            {npsRecords.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Nenhuma resposta registrada. Resolva um ticket ou clique em "Registrar pesquisa".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <NewNpsDialog
          tickets={tickets.map((t) => ({ id: t.id, label: `${t.code} · ${t.customer}` }))}
          onClose={() => setOpen(false)}
          onSubmit={(d) => { submitNpsSurvey(d); setOpen(false); }}
        />
      )}
    </div>
  );
}

function triggerLabel(t: NpsTrigger) {
  return t === "pos_resolucao" ? "Pós-resolução" : t === "proativo_pos_venda" ? "Proativo (D+7)" : "Manual";
}

function ScoreCard({ label, value, hint, tone, icon: Icon }: { label: string; value: string; hint: string; tone: "primary" | "success" | "warn" | "danger"; icon: React.ComponentType<{ className?: string }> }) {
  const tones = {
    primary: "border-l-primary",
    success: "border-l-success",
    warn: "border-l-warning",
    danger: "border-l-destructive",
  };
  return (
    <div className={cn("rounded-xl border border-l-4 bg-card p-5 shadow-[var(--shadow-elegant)]", tones[tone])}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{hint}</div>
    </div>
  );
}

function CategoryPill({ cat }: { cat: NpsCategory }) {
  const tones: Record<NpsCategory, string> = {
    promotor: "bg-success/10 text-success",
    neutro: "bg-warning/15 text-warning-foreground",
    detrator: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", tones[cat])}>
      {NPS_CATEGORY_LABEL[cat]}
    </span>
  );
}

function NewNpsDialog({
  tickets,
  onClose,
  onSubmit,
}: {
  tickets: { id: string; label: string }[];
  onClose: () => void;
  onSubmit: (d: {
    customer: string;
    customerTier: CustomerTier;
    occurrenceId?: string;
    q1Recomendacao: number;
    q2Resolucao: number;
    q3Agilidade: number;
    feedback?: string;
    trigger: NpsTrigger;
  }) => void;
}) {
  const [form, setForm] = useState({
    customer: "",
    customerTier: "B" as CustomerTier,
    occurrenceId: "",
    q1Recomendacao: 9,
    q2Resolucao: 9,
    q3Agilidade: 9,
    feedback: "",
    trigger: "manual" as NpsTrigger,
  });
  const valid = form.customer.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Registrar pesquisa NPS</h2>
        <p className="mt-1 text-xs text-muted-foreground">Notas de 0 a 10. Categoria é calculada a partir da Q1.</p>

        <div className="mt-4 grid gap-3">
          <Field label="Cliente">
            <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className={inp} placeholder="Razão social" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de cliente">
              <select value={form.customerTier} onChange={(e) => setForm({ ...form, customerTier: e.target.value as CustomerTier })} className={inp}>
                {(Object.keys(CUSTOMER_TIER_LABEL) as CustomerTier[]).map((k) => (
                  <option key={k} value={k}>{CUSTOMER_TIER_LABEL[k]}</option>
                ))}
              </select>
            </Field>
            <Field label="Disparo">
              <select value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value as NpsTrigger })} className={inp}>
                <option value="manual">Manual</option>
                <option value="pos_resolucao">Pós-resolução</option>
                <option value="proativo_pos_venda">Proativo (D+7)</option>
              </select>
            </Field>
          </div>
          <Field label="Ocorrência vinculada (opcional)">
            <select value={form.occurrenceId} onChange={(e) => setForm({ ...form, occurrenceId: e.target.value })} className={inp}>
              <option value="">— nenhuma —</option>
              {tickets.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <NumField label="Q1 Recomendaria" value={form.q1Recomendacao} onChange={(v) => setForm({ ...form, q1Recomendacao: v })} />
            <NumField label="Q2 Resolução" value={form.q2Resolucao} onChange={(v) => setForm({ ...form, q2Resolucao: v })} />
            <NumField label="Q3 Agilidade" value={form.q3Agilidade} onChange={(v) => setForm({ ...form, q3Agilidade: v })} />
          </div>

          <Field label="Feedback aberto">
            <textarea value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} rows={3} className={inp} placeholder="O que o cliente disse..." />
          </Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button
            disabled={!valid}
            onClick={() => onSubmit({ ...form, occurrenceId: form.occurrenceId || undefined, feedback: form.feedback || undefined })}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            Salvar pesquisa
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={0}
        max={10}
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.min(10, Number(e.target.value))))}
        className={inp}
      />
    </Field>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import type { TicketChannel, TicketPriority } from "@/lib/types";
import { MessageCircle, FileEdit } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tickets/novo")({ component: NewTicket });

function NewTicket() {
  const { createTicket } = useStore();
  const navigate = useNavigate();
  const [channel, setChannel] = useState<TicketChannel>("manual");
  const [form, setForm] = useState({
    customer: "",
    customerDoc: "",
    part: "",
    partCode: "",
    reason: "",
    priority: "media" as TicketPriority,
    slaHours: 48,
  });
  const [err, setErr] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.customer || !form.part || !form.partCode || !form.reason) {
      setErr("Preencha cliente, peça, código da peça e motivo.");
      return;
    }
    const t = createTicket({ ...form, channel });
    navigate({ to: "/tickets/$id", params: { id: t.id } });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Novo</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Abertura de ticket</h1>
        <p className="mt-1 text-sm text-muted-foreground">Registre uma devolução ou ocorrência de pós-venda.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ChannelCard active={channel === "whatsapp"} onClick={() => setChannel("whatsapp")} icon={MessageCircle} title="WhatsApp" desc="Ticket vinculado ao WhatsApp Business" />
        <ChannelCard active={channel === "manual"} onClick={() => setChannel("manual")} icon={FileEdit} title="Manual" desc="Cadastro direto pelo operador" />
      </div>

      <form onSubmit={submit} className="space-y-5 rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cliente *">
            <input value={form.customer} onChange={(e) => setForm({ ...form, customer: e.target.value })} className={inputCls} placeholder="Razão social ou nome" />
          </Field>
          <Field label="CNPJ / CPF">
            <input value={form.customerDoc} onChange={(e) => setForm({ ...form, customerDoc: e.target.value })} className={inputCls} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Peça *">
            <input value={form.part} onChange={(e) => setForm({ ...form, part: e.target.value })} className={inputCls} placeholder="Descrição da peça" />
          </Field>
          <Field label="Código da peça (ERP) *">
            <input value={form.partCode} onChange={(e) => setForm({ ...form, partCode: e.target.value })} className={inputCls} placeholder="Ex: PF-3421" />
          </Field>
          <Field label="Prioridade">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TicketPriority })} className={inputCls}>
              <option value="baixa">Baixa</option>
              <option value="media">Média</option>
              <option value="alta">Alta</option>
              <option value="critica">Crítica</option>
            </select>
          </Field>
          <Field label="SLA (horas)">
            <input type="number" min={1} value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} className={inputCls} />
          </Field>
        </div>
        <Field label="Motivo da devolução *">
          <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={4} className={cn(inputCls, "resize-none")} placeholder="Descreva o problema relatado pelo cliente..." />
        </Field>

        {err && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => navigate({ to: "/tickets" })} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted">Cancelar</button>
          <button type="submit" className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">Abrir ticket</button>
        </div>
      </form>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ChannelCard({ active, onClick, icon: Icon, title, desc }: { active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string; desc: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
        active ? "border-gold bg-gold-soft shadow-[var(--shadow-gold)]" : "bg-card hover:border-gold/40",
      )}
    >
      <span className={cn("flex h-10 w-10 items-center justify-center rounded-md", active ? "bg-gold text-gold-foreground" : "bg-muted text-muted-foreground")}>
        <Icon className="h-5 w-5" />
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{desc}</span>
      </span>
    </button>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import { Save, Building, Clock, Bell, Plug } from "lucide-react";

export const Route = createFileRoute("/_app/admin/configuracoes")({ component: ConfigPage });

function ConfigPage() {
  const [empresa, setEmpresa] = useState({
    razao: "VerticalParts Indústria Ltda",
    cnpj: "00.000.000/0001-00",
    email: "posvenda@verticalparts.com",
    telefone: "(11) 4000-0000",
  });
  const [sla, setSla] = useState({ baixa: 72, media: 48, alta: 24, critica: 12, alerta50: true, alerta80: true, alerta100: true });
  const [notif, setNotif] = useState({ email: true, whatsapp: true, npsAuto: true, npsDias: 7 });
  const [integ, setInteg] = useState({ erpUrl: "", whatsappToken: "", emailFrom: "no-reply@verticalparts.com" });
  const [saved, setSaved] = useState(false);

  function salvar() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Configurações</h1>
          <p className="mt-1 text-sm text-muted-foreground">Parâmetros gerais, SLA, notificações e integrações</p>
        </div>
        <button onClick={salvar} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Save className="h-4 w-4" /> {saved ? "Salvo!" : "Salvar alterações"}
        </button>
      </div>

      <Section icon={Building} title="Empresa">
        <Grid>
          <Field label="Razão social"><input value={empresa.razao} onChange={(e) => setEmpresa({ ...empresa, razao: e.target.value })} className={inp} /></Field>
          <Field label="CNPJ"><input value={empresa.cnpj} onChange={(e) => setEmpresa({ ...empresa, cnpj: e.target.value })} className={inp} /></Field>
          <Field label="Email"><input value={empresa.email} onChange={(e) => setEmpresa({ ...empresa, email: e.target.value })} className={inp} /></Field>
          <Field label="Telefone"><input value={empresa.telefone} onChange={(e) => setEmpresa({ ...empresa, telefone: e.target.value })} className={inp} /></Field>
        </Grid>
      </Section>

      <Section icon={Clock} title="SLA por prioridade (horas)">
        <Grid>
          <Field label="Baixa"><input type="number" value={sla.baixa} onChange={(e) => setSla({ ...sla, baixa: Number(e.target.value) })} className={inp} /></Field>
          <Field label="Média"><input type="number" value={sla.media} onChange={(e) => setSla({ ...sla, media: Number(e.target.value) })} className={inp} /></Field>
          <Field label="Alta"><input type="number" value={sla.alta} onChange={(e) => setSla({ ...sla, alta: Number(e.target.value) })} className={inp} /></Field>
          <Field label="Crítica"><input type="number" value={sla.critica} onChange={(e) => setSla({ ...sla, critica: Number(e.target.value) })} className={inp} /></Field>
        </Grid>
        <div className="mt-3 flex flex-wrap gap-3">
          <Toggle checked={sla.alerta50} onChange={(v) => setSla({ ...sla, alerta50: v })} label="Alerta a 50% do SLA" />
          <Toggle checked={sla.alerta80} onChange={(v) => setSla({ ...sla, alerta80: v })} label="Alerta a 80%" />
          <Toggle checked={sla.alerta100} onChange={(v) => setSla({ ...sla, alerta100: v })} label="Alerta de SLA estourado" />
        </div>
      </Section>

      <Section icon={Bell} title="Notificações & NPS">
        <div className="flex flex-wrap gap-3">
          <Toggle checked={notif.email} onChange={(v) => setNotif({ ...notif, email: v })} label="Notificações por email" />
          <Toggle checked={notif.whatsapp} onChange={(v) => setNotif({ ...notif, whatsapp: v })} label="Notificações por WhatsApp" />
          <Toggle checked={notif.npsAuto} onChange={(v) => setNotif({ ...notif, npsAuto: v })} label="Disparo automático de NPS pós-resolução" />
        </div>
        <Grid>
          <Field label="Disparo proativo NPS (dias após venda)">
            <input type="number" value={notif.npsDias} onChange={(e) => setNotif({ ...notif, npsDias: Number(e.target.value) })} className={inp} />
          </Field>
        </Grid>
      </Section>

      <Section icon={Plug} title="Integrações">
        <Grid>
          <Field label="URL do ERP"><input value={integ.erpUrl} onChange={(e) => setInteg({ ...integ, erpUrl: e.target.value })} className={inp} placeholder="https://erp.verticalparts.com/api" /></Field>
          <Field label="Email remetente"><input value={integ.emailFrom} onChange={(e) => setInteg({ ...integ, emailFrom: e.target.value })} className={inp} /></Field>
          <Field label="Token WhatsApp Business"><input value={integ.whatsappToken} onChange={(e) => setInteg({ ...integ, whatsappToken: e.target.value })} className={inp} placeholder="••••••••" /></Field>
        </Grid>
      </Section>
    </div>
  );
}

const inp = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gold" />
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      {children}
    </section>
  );
}
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
      {label}
    </label>
  );
}

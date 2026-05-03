import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import {
  ROOT_CAUSE_LABEL,
  type RootCause,
  type TicketStatus,
  STATUS_LABEL,
  INTERNAL_DEPT_LABEL,
  INTERNAL_STATUS_LABEL,
  type InternalDepartment,
  type InternalPriority,
  CONTAINMENT_ACTION_LABEL,
  type ContainmentAction,
  OCCURRENCE_REASON_LABEL,
  RESPONSIBLE_SECTOR_LABEL,
  NPS_CATEGORY_LABEL,
  categorizeNps,
  type Ticket,
} from "@/lib/types";
import { StatusBadge, PriorityBadge } from "@/components/app/StatusBadge";
import { SlaBar } from "@/components/app/SlaBar";
import {
  ArrowLeft, ShieldCheck, Clock, User, MessageCircle, FileEdit, Star,
  AlertTriangle, Users, Plus, Eye, ClipboardCheck, Smile,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/ocorrencia/")({ component: TicketDetail });

type TabKey = "visao" | "internos" | "comunicacao" | "qualidade" | "nps";
const TABS: { key: TabKey; label: string; icon: typeof Eye }[] = [
  { key: "visao", label: "Visão Geral", icon: Eye },
  { key: "internos", label: "Tickets Internos", icon: Users },
  { key: "comunicacao", label: "Comunicação", icon: MessageCircle },
  { key: "qualidade", label: "Qualidade FO-504", icon: ClipboardCheck },
  { key: "nps", label: "NPS", icon: Smile },
];

function TicketDetail() {
  const { ro } = Route.useParams();
  const router = useRouter();
  const { tickets, internalTickets, npsRecords, updateStatus, resolveTicket, setNps, createInternalTicket, updateQualidade } = useStore();
  const ticket = tickets.find((t) => t.code === ro || t.id === ro);
  const [tab, setTab] = useState<TabKey>("visao");
  const [resolving, setResolving] = useState(false);
  const [rootCause, setRootCause] = useState<RootCause | "">("");
  const [justification, setJustification] = useState("");
  const [report, setReport] = useState("");
  const [resolveErr, setResolveErr] = useState<string | null>(null);
  const [openInternal, setOpenInternal] = useState(false);

  if (!ticket) {
    return (
      <div className="mx-auto max-w-2xl rounded-xl border bg-card p-8 text-center">
        <h2 className="text-lg font-semibold">Ticket não encontrado</h2>
        <Link to="/ocorrencias" className="mt-4 inline-block text-sm text-gold hover:underline">← Voltar para tickets</Link>
      </div>
    );
  }

  const isClosed = ticket.status === "concluido";
  const linkedInternal = internalTickets.filter((it) => ticket.internalTicketIds?.includes(it.id));
  const linkedNps = npsRecords.filter((n) => n.occurrenceId === ticket.id);

  function handleResolve() {
    if (!rootCause) { setResolveErr("Selecione a causa raiz."); return; }
    if (justification.trim().length < 10) { setResolveErr("Justificativa deve ter ao menos 10 caracteres."); return; }
    if (report.trim().length < 10) { setResolveErr("Laudo técnico é obrigatório."); return; }
    resolveTicket(ticket!.id, { rootCause: rootCause as RootCause, justification, report });
    setResolving(false);
    router.invalidate();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/ocorrencias" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Tickets
        </Link>
        <span className="font-mono text-xs font-semibold text-muted-foreground">{ticket.code}</span>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={ticket.status} />
              <PriorityBadge priority={ticket.priority} />
              <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {ticket.channel === "whatsapp" ? <MessageCircle className="h-3 w-3" /> : <FileEdit className="h-3 w-3" />}
                {ticket.channel === "whatsapp" ? "WhatsApp" : "Manual"}
              </span>
              {ticket.occurrenceReason && (
                <span className="inline-flex rounded-md bg-gold-soft px-2 py-0.5 text-[11px] font-semibold text-gold-foreground">
                  {OCCURRENCE_REASON_LABEL[ticket.occurrenceReason]}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-semibold">{ticket.customer}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{ticket.part} · <span className="font-mono">{ticket.partCode}</span></p>
            {ticket.responsibleSector && (
              <p className="mt-0.5 text-xs text-muted-foreground">Setor: {RESPONSIBLE_SECTOR_LABEL[ticket.responsibleSector]}</p>
            )}
          </div>
          <div className="w-full sm:w-56">
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium uppercase tracking-wide text-muted-foreground">SLA</span>
              <span className="font-semibold">{ticket.slaHours}h</span>
            </div>
            <SlaBar ticket={ticket} />
          </div>
        </div>

        {!isClosed && (
          <div className="mt-5 flex flex-wrap gap-2">
            {(["aberto", "analise", "laudo"] as TicketStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => updateStatus(ticket.id, s)}
                disabled={ticket.status === s}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition",
                  ticket.status === s ? "border-gold bg-gold-soft text-gold-foreground" : "hover:bg-muted",
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            ))}
            <button
              onClick={() => setResolving((v) => !v)}
              className="ml-auto inline-flex items-center gap-2 rounded-md bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Concluir ticket
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors -mb-px",
                active ? "border-gold text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}>
              <Icon className="h-3.5 w-3.5" /> {t.label}
              {t.key === "internos" && linkedInternal.length > 0 && (
                <span className="rounded-full bg-gold px-1.5 text-[10px] text-black">{linkedInternal.length}</span>
              )}
              {t.key === "nps" && linkedNps.length > 0 && (
                <span className="rounded-full bg-gold px-1.5 text-[10px] text-black">{linkedNps.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "visao" && (
        <div className="space-y-6">
          {resolving && !isClosed && (
            <div className="rounded-xl border-2 border-gold bg-gold-soft/40 p-6 shadow-[var(--shadow-gold)]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-4 w-4 text-gold-foreground" />
                Conclusão exige causa raiz + justificativa + laudo técnico
              </div>
              <div className="mt-4 grid gap-4">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Causa raiz *</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                    {(Object.keys(ROOT_CAUSE_LABEL) as RootCause[]).map((c) => (
                      <button key={c} type="button" onClick={() => setRootCause(c)}
                        className={cn("rounded-md border bg-card px-3 py-2 text-xs font-medium transition",
                          rootCause === c ? "border-primary bg-primary text-primary-foreground" : "hover:border-gold")}>
                        {ROOT_CAUSE_LABEL[c]}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Justificativa *</span>
                  <textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={2} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Laudo técnico *</span>
                  <textarea value={report} onChange={(e) => setReport(e.target.value)} rows={4} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" />
                </label>
                {resolveErr && <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{resolveErr}</div>}
                <div className="flex justify-end gap-2">
                  <button onClick={() => setResolving(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
                  <button onClick={handleResolve} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">Concluir ticket</button>
                </div>
              </div>
            </div>
          )}

          {isClosed && (
            <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck className="h-4 w-4 text-success" /> Resolução registrada
              </div>
              <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Causa raiz</dt>
                  <dd className="mt-1 inline-flex rounded-md bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">{ROOT_CAUSE_LABEL[ticket.rootCause!]}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">NPS</dt>
                  <dd className="mt-1">
                    {ticket.nps !== undefined ? (
                      <span className="inline-flex items-center gap-1 text-sm font-semibold"><Star className="h-4 w-4 text-gold" />{ticket.nps}/10</span>
                    ) : (
                      <NpsCapture onSubmit={(n) => setNps(ticket.id, n)} />
                    )}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Justificativa</dt>
                  <dd className="mt-1 text-sm">{ticket.rootCauseJustification}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Laudo técnico</dt>
                  <dd className="mt-1 whitespace-pre-wrap rounded-md bg-muted/50 p-3 text-sm">{ticket.technicalReport}</dd>
                </div>
              </dl>
            </div>
          )}

          <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Motivo relatado</div>
            <p className="mt-1 text-sm">{ticket.reason}</p>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-gold" /> Trilha de auditoria
            </div>
            <ol className="mt-4 space-y-3">
              {[...ticket.audit].reverse().map((a) => (
                <li key={a.id} className="flex gap-3 border-l-2 border-gold/40 pl-4">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{a.action}</div>
                    {a.detail && <div className="text-xs text-muted-foreground">{a.detail}</div>}
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <User className="h-3 w-3" /> {a.actor} · {new Date(a.at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-4 text-[11px] text-muted-foreground">Logs imutáveis · Conformidade LGPD</p>
          </div>
        </div>
      )}

      {tab === "internos" && (
        <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-gold" /> Tickets internos vinculados ({linkedInternal.length})
            </div>
            {!isClosed && (
              <button onClick={() => setOpenInternal(true)}
                className="inline-flex items-center gap-1.5 rounded-md border border-gold px-3 py-1.5 text-xs font-semibold text-gold-foreground hover:bg-gold-soft">
                <Plus className="h-3 w-3" /> Abrir ticket interno
              </button>
            )}
          </div>
          {linkedInternal.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {linkedInternal.map((it) => (
                <li key={it.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-background p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] font-semibold text-muted-foreground">{it.code}</span>
                      <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium">{INTERNAL_DEPT_LABEL[it.targetDepartment]}</span>
                    </div>
                    <div className="text-sm font-medium">{it.subject}</div>
                  </div>
                  <Link to="/tickets-internos" className="text-[11px] font-semibold text-gold hover:underline">
                    {INTERNAL_STATUS_LABEL[it.status]} →
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Nenhum ticket interno aberto para esta ocorrência.</p>
          )}
        </div>
      )}

      {tab === "comunicacao" && (
        <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <MessageCircle className="h-4 w-4 text-gold" /> Comunicação
          </div>
          {ticket.whatsappThreadId ? (
            <div className="mt-4 rounded-md border bg-muted/40 p-4 text-sm">
              <div className="text-xs text-muted-foreground">Thread WhatsApp vinculada</div>
              <div className="mt-1 font-mono text-sm">{ticket.whatsappThreadId}</div>
              <Link to="/whatsapp-threads" className="mt-3 inline-block text-xs font-semibold text-gold hover:underline">
                Abrir conversa →
              </Link>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">
              Nenhuma conversa do WhatsApp vinculada. Histórico de e-mail/telefone aparecerá aqui.
            </p>
          )}
        </div>
      )}

      {tab === "qualidade" && <QualidadeTab ticket={ticket} onSave={(d) => updateQualidade(ticket.id, d)} />}

      {tab === "nps" && (
        <div className="space-y-4 rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smile className="h-4 w-4 text-gold" /> NPS desta ocorrência
          </div>
          {linkedNps.length === 0 && ticket.nps === undefined && (
            <div className="rounded-md border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Pesquisa ainda não respondida.</p>
              {isClosed && (
                <div className="mt-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Registrar nota manualmente:</p>
                  <NpsCapture onSubmit={(n) => setNps(ticket.id, n)} />
                </div>
              )}
            </div>
          )}
          {linkedNps.map((n) => {
            const cat = categorizeNps(n.q1Recomendacao);
            return (
              <div key={n.id} className="space-y-2 rounded-md border p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{new Date(n.surveyDate).toLocaleString("pt-BR")}</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase",
                    cat === "promotor" && "bg-success/15 text-success",
                    cat === "neutro" && "bg-warning/15 text-warning-foreground",
                    cat === "detrator" && "bg-destructive/15 text-destructive")}>
                    {NPS_CATEGORY_LABEL[cat]}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Recomendação</div><div className="text-lg font-bold">{n.q1Recomendacao}</div></div>
                  <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Resolução</div><div className="text-lg font-bold">{n.q2Resolucao}</div></div>
                  <div className="rounded-md bg-muted/40 p-2"><div className="text-[10px] uppercase text-muted-foreground">Atendimento</div><div className="text-lg font-bold">{n.q3Agilidade}</div></div>
                </div>
                {n.feedback && <div className="rounded-md bg-muted/30 p-3 text-xs italic">"{n.feedback}"</div>}
              </div>
            );
          })}
          {ticket.nps !== undefined && linkedNps.length === 0 && (
            <div className="rounded-md border p-4 text-sm">
              Nota legada: <strong>{ticket.nps}/10</strong> ({NPS_CATEGORY_LABEL[categorizeNps(ticket.nps)]})
            </div>
          )}
        </div>
      )}

      {openInternal && (
        <QuickInternalDialog
          onClose={() => setOpenInternal(false)}
          onCreate={(data) => {
            createInternalTicket({ ...data, linkedOccurrenceId: ticket.id });
            setOpenInternal(false);
          }}
        />
      )}
    </div>
  );
}

function QualidadeTab({
  ticket,
  onSave,
}: {
  ticket: Ticket;
  onSave: (d: {
    descricaoNaoConformidade?: string;
    acaoContencao?: ContainmentAction[];
    analiseQualidade?: string;
    classificacaoQualidade?: string;
    custoNaoQualidade?: number;
    observacoesQualidade?: string;
  }) => void;
}) {
  const [descricao, setDescricao] = useState(ticket.descricaoNaoConformidade ?? "");
  const [acoes, setAcoes] = useState<ContainmentAction[]>(ticket.acaoContencao ?? []);
  const [analise, setAnalise] = useState(ticket.analiseQualidade ?? "");
  const [classif, setClassif] = useState(ticket.classificacaoQualidade ?? "");
  const [custo, setCusto] = useState(ticket.custoNaoQualidade ?? 0);
  const [obs, setObs] = useState(ticket.observacoesQualidade ?? "");
  const [saved, setSaved] = useState(false);

  const toggle = (a: ContainmentAction) =>
    setAcoes((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));

  return (
    <div className="space-y-5 rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <ClipboardCheck className="h-4 w-4 text-gold" /> Formulário FO-OEA-Q-504
        </div>
        <span className="text-[10px] uppercase text-muted-foreground">
          Responsável: {ticket.assignee ?? "—"} · {ticket.dataInicioAnalise ? new Date(ticket.dataInicioAnalise).toLocaleDateString("pt-BR") : "Aguardando análise"}
        </span>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Descrição da não conformidade</span>
        <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={3} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Detalhe a NC observada..." />
      </label>

      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ações de contenção</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(Object.keys(CONTAINMENT_ACTION_LABEL) as ContainmentAction[]).map((a) => {
            const checked = acoes.includes(a);
            return (
              <label key={a} className={cn("flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition", checked ? "border-gold bg-gold-soft/40" : "hover:border-gold/40")}>
                <input type="checkbox" checked={checked} onChange={() => toggle(a)} className="h-4 w-4 accent-[hsl(var(--gold))]" />
                {CONTAINMENT_ACTION_LABEL[a]}
              </label>
            );
          })}
        </div>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Análise da causa raiz</span>
        <textarea value={analise} onChange={(e) => setAnalise(e.target.value)} rows={3} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="5 Porquês, Ishikawa, evidências..." />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Classificação</span>
          <select value={classif} onChange={(e) => setClassif(e.target.value)} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm">
            <option value="">Selecione…</option>
            <option value="critica">Crítica</option>
            <option value="maior">Maior</option>
            <option value="menor">Menor</option>
            <option value="observacao">Observação</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Custo da não qualidade (R$)</span>
          <input type="number" min={0} step="0.01" value={custo} onChange={(e) => setCusto(Number(e.target.value))} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observações da Qualidade</span>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={2} className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm" />
      </label>

      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-xs text-success">✓ Salvo</span>}
        <button
          onClick={() => {
            onSave({
              descricaoNaoConformidade: descricao,
              acaoContencao: acoes,
              analiseQualidade: analise,
              classificacaoQualidade: classif,
              custoNaoQualidade: custo,
              observacoesQualidade: obs,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
          }}
          className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          Salvar FO-504
        </button>
      </div>
    </div>
  );
}

function NpsCapture({ onSubmit }: { onSubmit: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1">
      {Array.from({ length: 11 }).map((_, i) => (
        <button key={i} onClick={() => onSubmit(i)}
          className="h-7 w-7 rounded-md border text-xs font-semibold hover:border-gold hover:bg-gold-soft">
          {i}
        </button>
      ))}
    </div>
  );
}

function QuickInternalDialog({
  onClose, onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    targetDepartment: InternalDepartment;
    priority: InternalPriority;
    subject: string;
    description: string;
    slaHours: number;
  }) => void;
}) {
  const [form, setForm] = useState({
    targetDepartment: "engenharia" as InternalDepartment,
    priority: "media" as InternalPriority,
    subject: "",
    description: "",
    slaHours: 24,
  });
  const valid = form.subject.trim() && form.description.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Abrir ticket interno</h2>
        <p className="mt-1 text-xs text-muted-foreground">Vinculado à ocorrência atual.</p>
        <div className="mt-4 grid gap-3">
          <select value={form.targetDepartment} onChange={(e) => setForm({ ...form, targetDepartment: e.target.value as InternalDepartment })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
            {(Object.keys(INTERNAL_DEPT_LABEL) as InternalDepartment[]).map((d) => (
              <option key={d} value={d}>{INTERNAL_DEPT_LABEL[d]}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as InternalPriority })} className="w-full rounded-md border bg-background px-3 py-2 text-sm">
              <option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="critica">Crítica</option>
            </select>
            <input type="number" min={1} value={form.slaHours} onChange={(e) => setForm({ ...form, slaHours: Number(e.target.value) })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="SLA (h)" />
          </div>
          <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Assunto" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full rounded-md border bg-background px-3 py-2 text-sm" placeholder="Descrição..." />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button disabled={!valid} onClick={() => onCreate(form)} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Abrir</button>
        </div>
      </div>
    </div>
  );
}

import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Package, Clock, CheckCircle2, AlertTriangle, Send,
  MessageCircle, ArrowLeft, Truck, Calendar, DollarSign,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/sac/$nf")({
  component: SacNFDetalhe,
});

type NFDetalhe = {
  id: string;
  nf_numero: string;
  razao_social_cliente: string;
  cnpj_cliente: string;
  classe_abc: "A" | "B" | "C";
  valor_total: number;
  data_emissao: string;
  previsao_entrega: string | null;
  status_entrega: "EMITIDA" | "EM_TRANSITO" | "ENTREGUE" | "ATRASADA";
  transportadora: string | null;
  codigo_rastreio: string | null;
  pesquisa_enviada: boolean;
  pesquisa_enviada_em: string | null;
  dados_omie: Record<string, unknown> | null;
  sac_clientes: {
    nome_fantasia: string | null;
    whatsapp: string | null;
    email: string | null;
    contato: string | null;
  } | null;
};

type Log = {
  id: string;
  canal: string;
  tipo_mensagem: string;
  status_envio: string;
  destinatario: string;
  conteudo_mensagem: string;
  data_envio: string;
};

type Pesquisa = {
  produto_correto: boolean | null;
  atendeu_prazo: boolean | null;
  avaliacao_atendimento: number | null;
  nps_score: number | null;
  pontos_positivos: string | null;
  pontos_melhoria: string | null;
  compraria_novamente: boolean | null;
  respondida_em: string | null;
};

const STATUS_CONFIG = {
  EMITIDA:     { label: "Emitida",     icon: Package,       color: "bg-blue-50 text-blue-700 border-blue-200",  step: 1 },
  EM_TRANSITO: { label: "Em trânsito", icon: Clock,         color: "bg-amber-50 text-amber-700 border-amber-200", step: 2 },
  ENTREGUE:    { label: "Entregue",    icon: CheckCircle2,  color: "bg-green-50 text-green-700 border-green-200", step: 3 },
  ATRASADA:    { label: "Atrasada",    icon: AlertTriangle, color: "bg-red-50 text-red-700 border-red-200",      step: 2 },
};

const ABC_COLORS = { A: "bg-gold text-black", B: "bg-blue-100 text-blue-800", C: "bg-muted text-muted-foreground" };

function fmt(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d.includes("T") ? d : d + "T12:00:00").toLocaleDateString("pt-BR");
}

const TIPO_LABEL: Record<string, string> = {
  VIP_FOLLOWUP: "VIP Acompanhamento",
  PRE_ENTREGA: "Pré-entrega",
  POS_ENTREGA: "Pós-entrega",
  PESQUISA: "Pesquisa enviada",
  ALERTA_ATRASO: "Alerta de atraso",
};

export default function SacNFDetalhe() {
  const { nf: nfId } = useParams({ from: "/_app/sac/$nf" });
  const [nf, setNf] = useState<NFDetalhe | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [pesquisa, setPesquisa] = useState<Pesquisa | null>(null);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => {
    void carregar();
  }, [nfId]);

  async function carregar() {
    setLoading(true);
    const [{ data: nfData }, { data: logsData }, { data: pesquisaData }] = await Promise.all([
      supabase.from("sac_notas_fiscais").select("*, sac_clientes(nome_fantasia,whatsapp,email,contato)").eq("id", nfId).single(),
      supabase.from("sac_logs_comunicacao").select("*").eq("nf_id", nfId).order("data_envio", { ascending: false }),
      supabase.from("sac_pesquisas").select("*").eq("nf_id", nfId).maybeSingle(),
    ]);
    setNf(nfData as NFDetalhe | null);
    setLogs((logsData as Log[]) ?? []);
    setPesquisa(pesquisaData as Pesquisa | null);
    setLoading(false);
  }

  async function atualizarStatus(novoStatus: "EMITIDA" | "EM_TRANSITO" | "ENTREGUE" | "ATRASADA") {
    if (!nf) return;
    await supabase.from("sac_notas_fiscais").update({ status_entrega: novoStatus }).eq("id", nfId);
    setNf((prev) => prev ? { ...prev, status_entrega: novoStatus } : prev);

    if (novoStatus === "ENTREGUE") {
      setStatusMsg("Status atualizado. A pesquisa de satisfação será agendada automaticamente.");
    }
  }

  async function enviarPesquisaManual() {
    setEnviando(true);
    setStatusMsg("");
    const res = await fetch("/api/sac/enviar-pesquisa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nf_id: nfId }),
    });
    if (res.ok) {
      setStatusMsg("Pesquisa enviada com sucesso!");
      void carregar();
    } else {
      setStatusMsg("Erro ao enviar pesquisa. Tente novamente.");
    }
    setEnviando(false);
  }

  if (loading) return <div className="py-20 text-center text-muted-foreground text-sm">Carregando...</div>;
  if (!nf) return <div className="py-20 text-center text-muted-foreground text-sm">NF não encontrada.</div>;

  const cfg = STATUS_CONFIG[nf.status_entrega];
  const StatusIcon = cfg.icon;
  const steps = ["Emitida", "Em trânsito", "Entregue"];
  const currentStep = cfg.step;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link to="/sac" className="rounded-lg border p-2 hover:bg-muted">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">NF {nf.nf_numero}</h1>
              <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-bold", ABC_COLORS[nf.classe_abc])}>
                Classe {nf.classe_abc}
              </span>
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", cfg.color)}>
                <StatusIcon className="h-3 w-3" /> {cfg.label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              {nf.sac_clientes?.nome_fantasia ?? nf.razao_social_cliente} — CNPJ {nf.cnpj_cliente}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold">{fmt(nf.valor_total ?? 0)}</div>
          <div className="text-xs text-muted-foreground">valor total</div>
        </div>
      </div>

      {/* Timeline de status */}
      <div className="rounded-xl border bg-card p-5">
        <h2 className="text-sm font-medium mb-4">Timeline de entrega</h2>
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const stepNum = i + 1;
            const done = currentStep > stepNum || nf.status_entrega === "ENTREGUE";
            const active = currentStep === stepNum;
            const isAtrasada = nf.status_entrega === "ATRASADA" && stepNum === 2;
            return (
              <div key={step} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    done || active
                      ? isAtrasada ? "border-red-500 bg-red-50 text-red-700"
                        : done ? "border-green-500 bg-green-500 text-white"
                        : "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/30 bg-muted text-muted-foreground"
                  )}>
                    {isAtrasada ? "!" : done && !active ? "✓" : stepNum}
                  </div>
                  <span className={cn("mt-1.5 text-[11px] font-medium",
                    active || done ? "text-foreground" : "text-muted-foreground")}>
                    {isAtrasada ? "Atrasada" : step}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn("h-0.5 flex-1 mx-2 transition-all", currentStep > stepNum ? "bg-green-500" : "bg-muted")} />
                )}
              </div>
            );
          })}
        </div>

        {/* Atualizar status */}
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
          <span className="text-xs text-muted-foreground self-center">Atualizar status:</span>
          {(["EMITIDA", "EM_TRANSITO", "ENTREGUE", "ATRASADA"] as const).map((s) => (
            <button key={s} disabled={nf.status_entrega === s}
              onClick={() => atualizarStatus(s)}
              className={cn("rounded-lg border px-3 py-1.5 text-xs font-medium transition-all hover:bg-muted disabled:opacity-40 disabled:cursor-default",
                nf.status_entrega === s && STATUS_CONFIG[s].color)}>
              {STATUS_CONFIG[s].label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Info logística */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-medium">Logística</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Transportadora:</span>
              <span className="font-medium">{nf.transportadora ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Rastreio:</span>
              <span className="font-mono font-medium">{nf.codigo_rastreio ?? "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Emissão:</span>
              <span>{fmtDate(nf.data_emissao)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Previsão:</span>
              <span>{fmtDate(nf.previsao_entrega)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold">{fmt(nf.valor_total ?? 0)}</span>
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h2 className="text-sm font-medium">Contato do cliente</h2>
          <div className="space-y-2 text-sm">
            <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{nf.sac_clientes?.contato ?? "—"}</span></div>
            <div><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{nf.sac_clientes?.whatsapp ?? "—"}</span></div>
            <div><span className="text-muted-foreground">E-mail:</span> <span className="font-medium">{nf.sac_clientes?.email ?? "—"}</span></div>
          </div>
          {nf.sac_clientes?.whatsapp && (
            <a href={`https://wa.me/55${nf.sac_clientes.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors">
              <MessageCircle className="h-4 w-4" /> Abrir no WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Pesquisa de satisfação */}
      <div className="rounded-xl border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium">Pesquisa de satisfação</h2>
          {!nf.pesquisa_enviada && (
            <button onClick={enviarPesquisaManual} disabled={enviando}
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> {enviando ? "Enviando..." : "Enviar pesquisa"}
            </button>
          )}
        </div>
        {statusMsg && <p className="text-xs text-muted-foreground mb-3">{statusMsg}</p>}

        {pesquisa?.respondida_em ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 text-sm">
            {[
              { label: "Produto correto?", val: pesquisa.produto_correto },
              { label: "Atendeu prazo?", val: pesquisa.atendeu_prazo },
              { label: "Compraria novamente?", val: pesquisa.compraria_novamente },
            ].map(({ label, val }) => (
              <div key={label} className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className={cn("text-base font-semibold mt-0.5", val ? "text-green-600" : "text-red-600")}>
                  {val === null ? "—" : val ? "Sim ✓" : "Não ✗"}
                </div>
              </div>
            ))}
            {pesquisa.nps_score !== null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">NPS Score</div>
                <div className="text-base font-semibold mt-0.5">{pesquisa.nps_score}/10</div>
              </div>
            )}
            {pesquisa.avaliacao_atendimento !== null && (
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="text-xs text-muted-foreground">Avaliação atendimento</div>
                <div className="text-base font-semibold mt-0.5">{"★".repeat(pesquisa.avaliacao_atendimento)}</div>
              </div>
            )}
            {pesquisa.pontos_positivos && (
              <div className="rounded-lg bg-muted/50 p-3 col-span-full">
                <div className="text-xs text-muted-foreground">Pontos positivos</div>
                <div className="text-sm mt-0.5">{pesquisa.pontos_positivos}</div>
              </div>
            )}
            {pesquisa.pontos_melhoria && (
              <div className="rounded-lg bg-muted/50 p-3 col-span-full">
                <div className="text-xs text-muted-foreground">Pontos de melhoria</div>
                <div className="text-sm mt-0.5">{pesquisa.pontos_melhoria}</div>
              </div>
            )}
            <div className="col-span-full text-xs text-muted-foreground">
              Respondida em {fmtDate(pesquisa.respondida_em)}
            </div>
          </div>
        ) : nf.pesquisa_enviada ? (
          <p className="text-sm text-muted-foreground">
            Pesquisa enviada em {fmtDate(nf.pesquisa_enviada_em)} — aguardando resposta do cliente.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Pesquisa ainda não enviada. Clique em "Enviar pesquisa" para disparar via WhatsApp.
          </p>
        )}
      </div>

      {/* Log de comunicações */}
      {logs.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <h2 className="text-sm font-medium mb-4">Log de comunicações</h2>
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 text-sm border-b last:border-0 pb-3 last:pb-0">
                <div className={cn("mt-0.5 rounded-full w-2 h-2 shrink-0",
                  log.status_envio === "ENVIADO" ? "bg-green-500" : "bg-red-500")} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{TIPO_LABEL[log.tipo_mensagem] ?? log.tipo_mensagem}</span>
                    <span className="text-xs text-muted-foreground">{log.canal}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{fmtDate(log.data_envio)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">{log.destinatario}</div>
                  {log.conteudo_mensagem && (
                    <div className="mt-1 rounded bg-muted/50 px-2 py-1.5 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-3">
                      {log.conteudo_mensagem}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

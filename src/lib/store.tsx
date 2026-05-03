import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type {
  Ticket,
  TicketStatus,
  RootCause,
  TicketPriority,
  TicketChannel,
  InternalTicket,
  InternalDepartment,
  InternalPriority,
  InternalTicketStatus,
  OccurrenceReason,
  ResponsibleSector,
  OccurrenceOrigin,
} from "./types";

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const seed: Ticket[] = [
  {
    id: uid(),
    code: "VP-2026-0142",
    customer: "AutoCenter Silva Ltda",
    customerDoc: "12.345.678/0001-90",
    part: "Pastilha de Freio Dianteira",
    partCode: "PF-3421",
    reason: "Peça apresentou desgaste prematuro em 800km",
    channel: "whatsapp",
    status: "analise",
    priority: "alta",
    slaHours: 24,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    updatedAt: now(),
    attachments: [],
    audit: [
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(), actor: "WhatsApp Bot", action: "Ticket criado via WhatsApp" },
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), actor: "Maria Souza", action: "Status: Aberto → Em análise" },
    ],
    assignee: "Maria Souza",
  },
  {
    id: uid(),
    code: "VP-2026-0141",
    customer: "Mecânica Veloz",
    customerDoc: "98.765.432/0001-12",
    part: "Filtro de Óleo",
    partCode: "FO-1102",
    reason: "Embalagem violada na entrega",
    channel: "manual",
    status: "aberto",
    priority: "media",
    slaHours: 48,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    updatedAt: now(),
    attachments: [],
    audit: [{ id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), actor: "João Lima", action: "Ticket criado manualmente" }],
    assignee: "João Lima",
  },
  {
    id: uid(),
    code: "VP-2026-0140",
    customer: "Distribuidora Norte Peças",
    part: "Amortecedor Traseiro",
    partCode: "AM-9921",
    reason: "Vazamento de óleo após 15 dias de uso",
    channel: "whatsapp",
    status: "concluido",
    priority: "critica",
    slaHours: 12,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    rootCause: "fornecedor",
    rootCauseJustification: "Lote 8821 do fornecedor X apresentou defeito de vedação confirmado em laudo.",
    technicalReport: "Análise visual e teste de pressão confirmaram falha na vedação do tubo. Lote isolado e fornecedor notificado.",
    attachments: [],
    nps: 9,
    npsSentAt: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString(),
    audit: [
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), actor: "WhatsApp Bot", action: "Ticket criado via WhatsApp" },
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), actor: "Carla Mendes", action: "Causa raiz definida: Fornecedor" },
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), actor: "Carla Mendes", action: "Ticket concluído" },
    ],
    assignee: "Carla Mendes",
  },
  {
    id: uid(),
    code: "VP-2026-0139",
    customer: "Auto Peças Brasil",
    part: "Correia Dentada",
    partCode: "CD-5510",
    reason: "Cliente recebeu peça incorreta",
    channel: "manual",
    status: "laudo",
    priority: "media",
    slaHours: 48,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    updatedAt: now(),
    attachments: [],
    audit: [
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(), actor: "João Lima", action: "Ticket criado manualmente" },
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(), actor: "Carla Mendes", action: "Em laudo técnico" },
    ],
    assignee: "Carla Mendes",
  },
  {
    id: uid(),
    code: "VP-2026-0138",
    customer: "Garage Premium",
    part: "Velas de Ignição (kit 4)",
    partCode: "VI-7788",
    reason: "Falha de ignição reportada",
    channel: "whatsapp",
    status: "concluido",
    priority: "baixa",
    slaHours: 72,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(),
    rootCause: "cliente",
    rootCauseJustification: "Instalação incorreta confirmada — torque acima do especificado.",
    technicalReport: "Inspeção identificou rosca danificada por aperto excessivo durante instalação.",
    attachments: [],
    nps: 7,
    audit: [
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), actor: "WhatsApp Bot", action: "Ticket criado" },
      { id: uid(), at: new Date(Date.now() - 1000 * 60 * 60 * 80).toISOString(), actor: "Maria Souza", action: "Concluído — causa: Cliente" },
    ],
    assignee: "Maria Souza",
  },
];

interface NewTicketInput {
  customer: string;
  customerDoc?: string;
  city?: string;
  state?: string;
  part: string;
  partCode: string;
  quantity?: number;
  unitValue?: number;
  reason: string;
  occurrenceReason?: OccurrenceReason;
  responsibleSector?: ResponsibleSector;
  origin?: OccurrenceOrigin;
  channel: TicketChannel;
  priority: TicketPriority;
  slaHours: number;
}

interface NewInternalTicketInput {
  targetDepartment: InternalDepartment;
  priority: InternalPriority;
  subject: string;
  description: string;
  linkedOccurrenceId?: string;
  slaHours: number;
}

interface StoreCtx {
  tickets: Ticket[];
  internalTickets: InternalTicket[];
  currentUser: string;
  createTicket: (i: NewTicketInput) => Ticket;
  updateStatus: (id: string, status: TicketStatus) => void;
  resolveTicket: (id: string, data: { rootCause: RootCause; justification: string; report: string }) => void;
  setNps: (id: string, score: number) => void;
  createInternalTicket: (i: NewInternalTicketInput) => InternalTicket;
  respondInternalTicket: (id: string, text: string) => void;
  updateInternalStatus: (id: string, status: InternalTicketStatus, resolutionSummary?: string) => void;
}

const Ctx = createContext<StoreCtx | null>(null);

const internalSeed: InternalTicket[] = [];

export function StoreProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(seed);
  const [internalTickets, setInternalTickets] = useState<InternalTicket[]>(internalSeed);
  const currentUser = "Maria Souza";

  const append = useCallback((id: string, action: string, detail?: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, updatedAt: now(), audit: [...t.audit, { id: uid(), at: now(), actor: currentUser, action, detail }] }
          : t,
      ),
    );
  }, []);

  const createTicket = useCallback<StoreCtx["createTicket"]>((i) => {
    const code = `VP-2026-${String(143 + Math.floor(Math.random() * 900)).padStart(4, "0")}`;
    const t: Ticket = {
      id: uid(),
      code,
      ...i,
      status: "aberto",
      createdAt: now(),
      updatedAt: now(),
      attachments: [],
      audit: [{ id: uid(), at: now(), actor: currentUser, action: `Ticket criado (${i.channel === "whatsapp" ? "WhatsApp" : "Manual"})` }],
      assignee: currentUser,
    };
    setTickets((prev) => [t, ...prev]);
    return t;
  }, []);

  const updateStatus = useCallback<StoreCtx["updateStatus"]>(
    (id, status) => {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status, updatedAt: now() } : t)),
      );
      append(id, `Status alterado para: ${status}`);
    },
    [append],
  );

  const resolveTicket = useCallback<StoreCtx["resolveTicket"]>(
    (id, data) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "concluido",
                rootCause: data.rootCause,
                rootCauseJustification: data.justification,
                technicalReport: data.report,
                resolvedAt: now(),
                updatedAt: now(),
              }
            : t,
        ),
      );
      append(id, `Ticket concluído — Causa raiz: ${data.rootCause}`, data.justification);
    },
    [append],
  );

  const setNps = useCallback<StoreCtx["setNps"]>(
    (id, score) => {
      setTickets((prev) => prev.map((t) => (t.id === id ? { ...t, nps: score, npsSentAt: now() } : t)));
      append(id, `NPS registrado: ${score}`);
    },
    [append],
  );

  const createInternalTicket = useCallback<StoreCtx["createInternalTicket"]>((i) => {
    const code = `INT-2026-${String(1 + Math.floor(Math.random() * 900)).padStart(4, "0")}`;
    const it: InternalTicket = {
      id: uid(),
      code,
      openedBy: currentUser,
      openedAt: now(),
      ...i,
      status: "aberto",
      responses: [],
    };
    setInternalTickets((prev) => [it, ...prev]);
    if (i.linkedOccurrenceId) {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === i.linkedOccurrenceId
            ? { ...t, internalTicketIds: [...(t.internalTicketIds ?? []), it.id], updatedAt: now() }
            : t,
        ),
      );
      append(
        i.linkedOccurrenceId,
        `Ticket interno aberto: ${code} → ${i.targetDepartment}`,
        i.subject,
      );
    }
    return it;
  }, [append]);

  const respondInternalTicket = useCallback<StoreCtx["respondInternalTicket"]>((id, text) => {
    setInternalTickets((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              status: t.status === "aberto" ? "andamento" : t.status,
              responses: [...t.responses, { id: uid(), at: now(), responder: currentUser, text }],
            }
          : t,
      ),
    );
  }, []);

  const updateInternalStatus = useCallback<StoreCtx["updateInternalStatus"]>(
    (id, status, resolutionSummary) => {
      setInternalTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                status,
                resolutionSummary: resolutionSummary ?? t.resolutionSummary,
                closedAt: status === "resolvido" ? now() : t.closedAt,
              }
            : t,
        ),
      );
    },
    [],
  );

  return (
    <Ctx.Provider
      value={{
        tickets,
        internalTickets,
        currentUser,
        createTicket,
        updateStatus,
        resolveTicket,
        setNps,
        createInternalTicket,
        respondInternalTicket,
        updateInternalStatus,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("StoreProvider missing");
  return c;
}

export function slaStatus(t: Ticket): { pct: number; label: string; tone: "ok" | "warn" | "danger" } {
  const elapsed = (Date.now() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60);
  const pct = Math.min(100, (elapsed / t.slaHours) * 100);
  if (t.status === "concluido") return { pct: 100, label: "SLA cumprido", tone: "ok" };
  if (pct >= 100) return { pct: 100, label: "SLA estourado", tone: "danger" };
  if (pct >= 75) return { pct, label: `${Math.max(0, t.slaHours - elapsed).toFixed(1)}h restantes`, tone: "warn" };
  return { pct, label: `${Math.max(0, t.slaHours - elapsed).toFixed(1)}h restantes`, tone: "ok" };
}

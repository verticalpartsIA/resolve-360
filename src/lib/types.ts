export type TicketStatus = "aberto" | "analise" | "laudo" | "concluido";
export type TicketPriority = "baixa" | "media" | "alta" | "critica";
export type RootCause =
  | "venda"
  | "expedicao"
  | "engenharia"
  | "cliente"
  | "fornecedor";
export type TicketChannel = "whatsapp" | "manual";

export interface AuditLog {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail?: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: number;
}

export interface Ticket {
  id: string;
  code: string;
  customer: string;
  customerDoc?: string;
  part: string;
  partCode: string;
  reason: string;
  channel: TicketChannel;
  status: TicketStatus;
  priority: TicketPriority;
  slaHours: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  rootCause?: RootCause;
  rootCauseJustification?: string;
  technicalReport?: string;
  attachments: Attachment[];
  nps?: number;
  npsSentAt?: string;
  audit: AuditLog[];
  assignee?: string;
}

export const ROOT_CAUSE_LABEL: Record<RootCause, string> = {
  venda: "Venda",
  expedicao: "Expedição",
  engenharia: "Engenharia",
  cliente: "Cliente",
  fornecedor: "Fornecedor",
};

export const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto",
  analise: "Em análise",
  laudo: "Laudo técnico",
  concluido: "Concluído",
};

export const PRIORITY_LABEL: Record<TicketPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

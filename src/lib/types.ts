export type TicketStatus = "aberto" | "analise" | "laudo" | "concluido";
export type TicketPriority = "baixa" | "media" | "alta" | "critica";
export type RootCause =
  | "venda"
  | "expedicao"
  | "engenharia"
  | "cliente"
  | "fornecedor";
export type TicketChannel = "whatsapp" | "manual";

// ===== v2: FO-OEA-Q-502 =====
export type OccurrenceReason =
  | "devolucao_total"
  | "devolucao_parcial"
  | "reparo"
  | "menor_quantidade"
  | "destinatario_errado"
  | "troca_material";

export type ResponsibleSector =
  | "comercial"
  | "expedicao"
  | "engenharia"
  | "producao"
  | "almoxarifado"
  | "fornecedor"
  | "motorista"
  | "nao_aplica";

export type OccurrenceOrigin = "interno" | "externo";

export const OCCURRENCE_REASON_LABEL: Record<OccurrenceReason, string> = {
  devolucao_total: "Devolução Total",
  devolucao_parcial: "Devolução Parcial",
  reparo: "Reparo",
  menor_quantidade: "Material enviado em menor quantidade",
  destinatario_errado: "Destinatário errado",
  troca_material: "Troca de material",
};

export const RESPONSIBLE_SECTOR_LABEL: Record<ResponsibleSector, string> = {
  comercial: "Comercial",
  expedicao: "Expedição",
  engenharia: "Engenharia",
  producao: "Produção",
  almoxarifado: "Almoxarifado",
  fornecedor: "Fornecedor",
  motorista: "Motorista",
  nao_aplica: "Não se aplica",
};

// ===== Internal Ticket (colaboração entre setores) =====
export type InternalDepartment =
  | "comercial"
  | "expedicao"
  | "engenharia"
  | "producao"
  | "compras"
  | "qualidade";

export type InternalTicketStatus =
  | "aberto"
  | "andamento"
  | "aguardando"
  | "resolvido"
  | "escalado";

export type InternalPriority = "baixa" | "media" | "alta" | "critica";

export const INTERNAL_DEPT_LABEL: Record<InternalDepartment, string> = {
  comercial: "Comercial",
  expedicao: "Expedição",
  engenharia: "Engenharia",
  producao: "Produção",
  compras: "Compras",
  qualidade: "Qualidade",
};

export const INTERNAL_STATUS_LABEL: Record<InternalTicketStatus, string> = {
  aberto: "Aberto",
  andamento: "Em andamento",
  aguardando: "Aguardando info",
  resolvido: "Resolvido",
  escalado: "Escalado",
};

export interface InternalResponse {
  id: string;
  at: string;
  responder: string;
  text: string;
}

export interface InternalTicket {
  id: string;
  code: string; // INT-YYYY-NNN
  openedBy: string;
  openedAt: string;
  targetDepartment: InternalDepartment;
  priority: InternalPriority;
  subject: string;
  description: string;
  linkedOccurrenceId?: string;
  slaHours: number;
  status: InternalTicketStatus;
  responses: InternalResponse[];
  resolutionSummary?: string;
  closedAt?: string;
}

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
  freightCostVp?: number;
  freightCostCustomer?: number;
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
  internalTicketIds?: string[];
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

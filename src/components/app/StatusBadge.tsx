import { cn } from "@/lib/utils";
import { STATUS_LABEL, PRIORITY_LABEL, type TicketStatus, type TicketPriority } from "@/lib/types";

export function StatusBadge({ status }: { status: TicketStatus }) {
  const styles: Record<TicketStatus, string> = {
    aberto: "bg-destructive/10 text-destructive border-destructive/30",
    analise: "bg-warning/15 text-warning-foreground border-warning/40",
    laudo: "bg-warning/15 text-warning-foreground border-warning/40",
    concluido: "bg-success/10 text-success border-success/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", styles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const styles: Record<TicketPriority, string> = {
    baixa: "bg-muted text-muted-foreground",
    media: "bg-gold-soft text-gold-foreground",
    alta: "bg-warning/15 text-warning-foreground",
    critica: "bg-destructive/10 text-destructive",
  };
  return (
    <span className={cn("inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide", styles[priority])}>
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

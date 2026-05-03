import { slaStatus } from "@/lib/store";
import type { Ticket } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SlaBar({ ticket }: { ticket: Ticket }) {
  const s = slaStatus(ticket);
  const tone = {
    ok: "bg-success",
    warn: "bg-warning",
    danger: "bg-destructive",
  }[s.tone];
  return (
    <div className="space-y-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full transition-all", tone)} style={{ width: `${s.pct}%` }} />
      </div>
      <div className={cn("text-[10px] font-medium", s.tone === "danger" && "text-destructive", s.tone === "warn" && "text-warning-foreground")}>
        {s.label}
      </div>
    </div>
  );
}

import { Construction } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function PagePlaceholder({ title, kicker, description, children }: {
  title: string; kicker?: string; description?: string; children?: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div>
        {kicker && <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">{kicker}</p>}
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children ?? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <Construction className="mx-auto h-10 w-10 text-gold" />
          <p className="mt-3 text-sm font-medium">Esta página faz parte do mapa do produto</p>
          <p className="mt-1 text-xs text-muted-foreground">Será implementada nas próximas iterações.</p>
          <Link to="/dashboard" className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">
            Voltar ao dashboard
          </Link>
        </div>
      )}
    </div>
  );
}

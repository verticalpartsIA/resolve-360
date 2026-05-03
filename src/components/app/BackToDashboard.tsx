import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function BackToDashboard() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao dashboard
    </Link>
  );
}
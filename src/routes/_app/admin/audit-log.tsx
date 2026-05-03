import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/admin/audit-log")({
  component: () => <PagePlaceholder kicker="Admin" title="Audit Log" description="Trilha de auditoria de ações dos usuários." />,
});

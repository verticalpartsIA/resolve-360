import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/admin/sla-config")({
  component: () => <PagePlaceholder kicker="Admin" title="SLA por Departamento" description="Configuração de SLAs internos." />,
});

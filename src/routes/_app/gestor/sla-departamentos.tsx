import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/gestor/sla-departamentos")({
  component: () => <PagePlaceholder kicker="Gestor" title="SLA por Departamento" description="Cumprimento de SLA segmentado por área interna." />,
});

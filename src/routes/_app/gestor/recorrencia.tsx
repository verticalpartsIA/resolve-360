import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/gestor/recorrencia")({
  component: () => <PagePlaceholder kicker="Gestor" title="Recorrência" description="Análise de reincidência por causa raiz." />,
});

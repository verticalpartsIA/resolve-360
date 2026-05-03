import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/gestor/relatorios-fo504")({
  component: () => <PagePlaceholder kicker="Gestor" title="Relatórios FO-504" description="Relatórios padronizados FO-OEA-Q-504." />,
});

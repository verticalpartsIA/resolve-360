import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/nps/relatorios")({
  component: () => <PagePlaceholder kicker="NPS" title="Relatórios NPS" description="Relatórios e exportações da pesquisa de satisfação." />,
});

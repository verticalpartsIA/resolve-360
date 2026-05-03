import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/produto/$codigo")({
  component: () => <PagePlaceholder kicker="Catálogo" title="Detalhe do Produto" description="Histórico, ocorrências e qualidade do produto." />,
});

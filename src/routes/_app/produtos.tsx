import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/produtos")({
  component: () => <PagePlaceholder kicker="Catálogo" title="Catálogo de Produtos" description="Busca de peças sincronizadas com o ERP." />,
});

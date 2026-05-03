import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/cliente/$cnpj/historico")({
  component: () => <PagePlaceholder kicker="Clientes" title="Histórico do Cliente" description="Histórico completo de ocorrências e NPS." />,
});

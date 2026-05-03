import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/clientes")({
  component: () => <PagePlaceholder kicker="Clientes" title="Clientes" description="Base de clientes ativa, com histórico e tier." />,
});

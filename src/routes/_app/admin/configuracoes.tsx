import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/admin/configuracoes")({
  component: () => <PagePlaceholder kicker="Admin" title="Configurações" description="Parâmetros gerais do sistema." />,
});

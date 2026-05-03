import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/ocorrencia/$ro/editar")({
  component: () => <PagePlaceholder kicker="Ocorrências" title="Editar Ocorrência" description="Editar dados do registro de ocorrência (FO-OEA-Q-502)." />,
});

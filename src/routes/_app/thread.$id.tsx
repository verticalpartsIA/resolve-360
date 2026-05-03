import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/thread/$id")({
  component: () => <PagePlaceholder kicker="Comunicação" title="Conversa" description="Histórico completo da conversa." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/nps/dashboard")({
  component: () => <PagePlaceholder kicker="NPS" title="NPS Dashboard" description="Visão consolidada de promotores, neutros e detratores." />,
});

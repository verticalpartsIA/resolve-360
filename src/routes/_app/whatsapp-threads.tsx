import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/whatsapp-threads")({
  component: () => <PagePlaceholder kicker="Comunicação" title="WhatsApp Threads" description="Conversas em andamento via WhatsApp." />,
});

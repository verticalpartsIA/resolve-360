import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/admin/integracoes")({
  component: () => <PagePlaceholder kicker="Admin" title="Integrações" description="WhatsApp, ERP, e-mail e outras integrações." />,
});

import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/admin/usuarios")({
  component: () => <PagePlaceholder kicker="Admin" title="Usuários" description="Gestão de usuários, papéis e permissões." />,
});

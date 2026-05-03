import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/cliente/$cnpj")({
  component: () => <PagePlaceholder kicker="Clientes" title="Detalhe do Cliente" description="Cadastro, contatos e relacionamento." />,
});

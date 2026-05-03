import { createFileRoute } from "@tanstack/react-router";
import { PagePlaceholder } from "@/components/app/PagePlaceholder";

export const Route = createFileRoute("/_app/gestor/custo-nao-qualidade")({
  component: () => <PagePlaceholder kicker="Gestor" title="Custo da Não Qualidade" description="CNQ — frete, retrabalho, sucata, abatimentos." />,
});

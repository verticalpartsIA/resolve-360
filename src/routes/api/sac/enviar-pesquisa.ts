import { createAPIFileRoute } from "@tanstack/react-start/api";
import { dispararPesquisaSatisfacao } from "@/lib/sac-engine";

export const APIRoute = createAPIFileRoute("/api/sac/enviar-pesquisa")({
  POST: async ({ request }) => {
    let body: { nf_id?: string };
    try {
      body = (await request.json()) as { nf_id?: string };
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    if (!body.nf_id) return new Response("nf_id obrigatório", { status: 400 });

    try {
      await dispararPesquisaSatisfacao(body.nf_id);
      return Response.json({ ok: true });
    } catch (err) {
      console.error("[api/sac/enviar-pesquisa]", err);
      return new Response("Erro interno", { status: 500 });
    }
  },
});

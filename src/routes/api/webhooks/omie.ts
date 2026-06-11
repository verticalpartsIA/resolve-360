import { createAPIFileRoute } from "@tanstack/react-start/api";
import { consultarCliente } from "@/lib/omie-client";
import { ingerirNFdoOmie } from "@/lib/sac-engine";

// Payload que o Omie envia via webhook (topic: OrdemServicoProduto, PedidoVendaProduto, etc.)
type OmieWebhookPayload = {
  topic?: string;
  event?: string;
  appKey?: string;
  ping?: string;
  pedido?: {
    codigo_pedido?: number;
    numero_pedido?: string;
    codigo_cliente?: number;
    valor?: number;
    etapa?: string;
  };
  // Omie pode variar o payload por versão — guardamos o raw
  [key: string]: unknown;
};

export const APIRoute = createAPIFileRoute("/api/webhooks/omie")({
  GET: async () => new Response("Omie Webhook OK", { status: 200 }),

  POST: async ({ request }) => {
    let payload: OmieWebhookPayload;
    try {
      payload = (await request.json()) as OmieWebhookPayload;
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    console.log("[webhook/omie] payload recebido:", JSON.stringify(payload).slice(0, 300));

    // Omie envia ping para validar a URL — retorna 200 imediatamente
    if (payload.ping) {
      console.log("[webhook/omie] ping recebido:", payload.ping);
      return new Response("OK", { status: 200 });
    }

    // Validar App Key
    const expectedKey = process.env.OMIE_APP_KEY;
    if (expectedKey && payload.appKey && payload.appKey !== expectedKey) {
      console.warn("[webhook/omie] appKey inválida");
      return new Response("Unauthorized", { status: 401 });
    }

    // Processar eventos de pedido/NF faturada em background
    const codigoPedido = payload.pedido?.codigo_pedido;
    const codigoCliente = payload.pedido?.codigo_cliente;

    if (codigoPedido && codigoCliente) {
      // Fire-and-forget — não bloqueia o 200 para o Omie
      void (async () => {
        try {
          const { listarPedidosFaturados, consultarPedido } = await import("@/lib/omie-client");
          const pedido = await consultarPedido(codigoPedido);
          const cliente = await consultarCliente(codigoCliente);
          const resultado = await ingerirNFdoOmie(pedido, cliente);
          console.log(`[webhook/omie] NF ${pedido.cabecalho.numero_pedido} ingerida — classe ${resultado.classeAbc}`);
        } catch (err) {
          console.error("[webhook/omie] erro ao processar pedido:", err);
        }
      })();
    } else {
      // Payload sem pedido identificado — registrar para debug
      console.log("[webhook/omie] evento sem codigo_pedido/codigo_cliente:", payload.topic ?? payload.event ?? "unknown");
    }

    return new Response("OK", { status: 200 });
  },
});

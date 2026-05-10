import { createServerFn } from '@tanstack/start';

export const fetchClientesAtivosFn = createServerFn().handler(async () => {
  const { serverFetchClientesAtivos } = await import('./erp-client.server');
  return serverFetchClientesAtivos();
});

export const fetchProdutosAtivosFn = createServerFn().handler(async () => {
  const { serverFetchProdutosAtivos } = await import('./erp-client.server');
  return serverFetchProdutosAtivos();
});

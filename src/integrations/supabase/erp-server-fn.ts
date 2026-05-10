import { createServerFn } from '@tanstack/react-start';
import { serverFetchClientesAtivos, serverFetchProdutosAtivos } from './erp-client.server';

export const fetchClientesAtivosFn = createServerFn().handler(serverFetchClientesAtivos);
export const fetchProdutosAtivosFn = createServerFn().handler(serverFetchProdutosAtivos);

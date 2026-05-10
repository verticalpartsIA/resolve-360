// Server-side ERP client — usa service role para bypassar RLS.
// NUNCA importe este arquivo em código client-side.
import { createClient } from '@supabase/supabase-js';
import type { OmieCliente, OmieProduto } from './erp-client';

function tryGetClient() {
  const url = process.env.ERP_URL;
  const key = process.env.ERP_SERVICE_KEY;
  if (!url || !key) {
    console.warn('[ERP Server] ERP_URL ou ERP_SERVICE_KEY não configurado — retornando lista vazia');
    return null;
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function serverFetchClientesAtivos(): Promise<OmieCliente[]> {
  const client = tryGetClient();
  if (!client) return [];

  const { data, error } = await client
    .from('omie_crm_contas')
    .select('id,cnpj_cpf,nome,email,telefone,cidade,estado,inativo,segmento,updated_at')
    .eq('inativo', false)
    .order('nome', { ascending: true });

  if (error) {
    console.error('[ERP Server] Erro ao carregar clientes:', error.message);
    return [];
  }
  return (data ?? []) as OmieCliente[];
}

export async function serverFetchProdutosAtivos(): Promise<OmieProduto[]> {
  const client = tryGetClient();
  if (!client) return [];

  const { data, error } = await client
    .from('omie_produtos')
    .select(
      'codigo,codigo_produto,descricao,unidade,valor_unitario,marca,codigo_familia,inativo,bloqueado,tipo_item,ncm,ean,origem_mercadoria',
    )
    .eq('inativo', false)
    .order('descricao', { ascending: true });

  if (error) {
    console.error('[ERP Server] Erro ao carregar produtos:', error.message);
    return [];
  }
  return (data ?? []) as OmieProduto[];
}

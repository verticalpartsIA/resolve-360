// Server-side ERP client — usa service role para bypassar RLS.
// NUNCA importe este arquivo em código client-side.
import { createClient } from '@supabase/supabase-js';
import type { OmieCliente, OmieProduto } from './erp-client';

function createErpAdminClient() {
  const url = process.env.ERP_URL;
  const key = process.env.ERP_SERVICE_KEY;

  if (!url || !key) {
    throw new Error('[ERP] ERP_URL ou ERP_SERVICE_KEY não configurado no servidor');
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let _client: ReturnType<typeof createErpAdminClient> | undefined;
function getClient() {
  if (!_client) _client = createErpAdminClient();
  return _client;
}

export async function serverFetchClientesAtivos(): Promise<OmieCliente[]> {
  const { data, error } = await getClient()
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
  const { data, error } = await getClient()
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

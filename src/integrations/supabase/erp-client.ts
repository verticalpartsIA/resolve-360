import { createClient } from '@supabase/supabase-js';

const ERP_URL =
  import.meta.env.VITE_ERP_URL ||
  (typeof process !== 'undefined' ? process.env.ERP_URL : undefined);
const ERP_ANON_KEY =
  import.meta.env.VITE_ERP_ANON_KEY ||
  (typeof process !== 'undefined' ? process.env.ERP_ANON_KEY : undefined);

function createErpClient() {
  if (!ERP_URL || !ERP_ANON_KEY) {
    console.error('[ERP] VITE_ERP_URL ou VITE_ERP_ANON_KEY não configurado');
    throw new Error('ERP Supabase não configurado');
  }
  return createClient(ERP_URL, ERP_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-client-info': 'resolve-360-erp' } },
  });
}

let _erpClient: ReturnType<typeof createErpClient> | undefined;

export const erpClient = new Proxy({} as ReturnType<typeof createErpClient>, {
  get(_, prop, receiver) {
    if (!_erpClient) _erpClient = createErpClient();
    return Reflect.get(_erpClient, prop, receiver);
  },
});

// --- Tipos das tabelas ERP (bd_Omie) ---

export type OmieCliente = {
  id: string;
  cnpj_cpf: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cidade: string | null;
  estado: string | null;
  inativo: boolean;
  segmento: string | null;
  updated_at: string | null;
};

export type OmieProduto = {
  codigo: string;
  codigo_produto: string;
  codigo_produto_integracao: string | null;
  descricao: string;
  unidade: string | null;
  valor_unitario: number | null;
  marca: string | null;
  codigo_familia: string | null;
  inativo: boolean;
  bloqueado: boolean | null;
  tipo_item: string | null;
  ncm: string | null;
  ean: string | null;
  origem_mercadoria: string | null;
};

// Helpers de consulta

export async function fetchClientesAtivos(): Promise<OmieCliente[]> {
  const { data, error } = await erpClient
    .from('omie_crm_contas')
    .select('id,cnpj_cpf,nome,email,telefone,cidade,estado,inativo,segmento,updated_at')
    .eq('inativo', false)
    .order('nome', { ascending: true });

  if (error) {
    console.error('[ERP] Erro ao carregar clientes:', error.message);
    return [];
  }
  return (data ?? []) as OmieCliente[];
}

export async function fetchProdutosAtivos(): Promise<OmieProduto[]> {
  const { data, error } = await erpClient
    .from('omie_produtos')
    .select(
      'codigo,codigo_produto,descricao,unidade,valor_unitario,marca,codigo_familia,inativo,bloqueado,tipo_item,ncm,ean,origem_mercadoria',
    )
    .eq('inativo', false)
    .order('descricao', { ascending: true });

  if (error) {
    console.error('[ERP] Erro ao carregar produtos:', error.message);
    return [];
  }
  return (data ?? []) as OmieProduto[];
}

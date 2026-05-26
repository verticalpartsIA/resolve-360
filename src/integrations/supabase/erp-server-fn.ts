import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { OmieCliente, OmieProduto } from './erp-client';

function segmentoFromTags(tags: unknown): string | null {
  if (!Array.isArray(tags)) return null;
  const outros = (tags as { tag: string }[])
    .filter((t) => t.tag !== 'Cliente' && t.tag !== 'Fornecedor')
    .map((t) => t.tag);
  return outros.length > 0 ? outros.join(', ') : null;
}

// Service key inside handler body — TanStack Start strips handler code from client bundle.
// Using createClient (not fetch) so this works on Node.js < 18 (no global fetch).

export const fetchClientesAtivosFn = createServerFn().handler(async (): Promise<OmieCliente[]> => {
  const url = process.env.ERP_URL || 'https://kgecbycsyrtdhmdziuul.supabase.co';
  const key =
    process.env.ERP_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWNieWNzeXJ0ZGhtZHppdXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyMzE5NiwiZXhwIjoyMDkzNDk5MTk2fQ.mF6ApvDd3dcxjZ1OEgYC86ShpIdMTIMNJCfbZYrX87o';

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // ClientesReais: only real clients (no suppliers), 1408 rows, clean data
  const { data, error } = await client
    .from('ClientesReais')
    .select(
      'codigo_cliente_omie,codigo_cliente_integracao,cnpj_cpf,razao_social,email,telefone,cidade,estado,tags',
    )
    .not('cnpj_cpf', 'is', null)
    .order('razao_social', { ascending: true });

  if (error) {
    console.error('[ERP] clientes error:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: String(row.codigo_cliente_omie),
    codigo_integracao: row.codigo_cliente_integracao ?? null,
    cnpj_cpf: row.cnpj_cpf ?? '',
    nome: row.razao_social ?? '',
    email: row.email || null,
    telefone: row.telefone || null,
    cidade: row.cidade || null,
    estado: row.estado || null,
    inativo: false,
    segmento: segmentoFromTags(row.tags),
    updated_at: null,
  })) as OmieCliente[];
});

export const fetchProdutosAtivosFn = createServerFn().handler(async (): Promise<OmieProduto[]> => {
  const url = process.env.ERP_URL || 'https://kgecbycsyrtdhmdziuul.supabase.co';
  const key =
    process.env.ERP_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWNieWNzeXJ0ZGhtZHppdXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyMzE5NiwiZXhwIjoyMDkzNDk5MTk2fQ.mF6ApvDd3dcxjZ1OEgYC86ShpIdMTIMNJCfbZYrX87o';

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // Produtos_VP: 4140 rows — replaces non-existent PosVenda view
  const { data, error } = await client
    .from('Produtos_VP')
    .select(
      'codigo_produto,codigo,descricao,unidade,ncm,ean,valor_unitario,codigo_familia,marca,bloqueado,tipo_item,quantidade_estoque',
    )
    .eq('bloqueado', false)
    .order('descricao', { ascending: true });

  if (error) {
    console.error('[ERP] produtos error:', error.message);
    return [];
  }

  return (data ?? [])
    .filter((p) => {
      const desc = (p.descricao ?? '').toUpperCase();
      return !desc.startsWith('(NÃO USAR)') && !desc.startsWith('(NAO USAR)');
    })
    .map((p) => ({
      codigo_produto: String(p.codigo_produto),
      codigo: p.codigo ?? '',
      codigo_produto_integracao: null,
      descricao: p.descricao ?? '',
      unidade: p.unidade ?? null,
      valor_unitario: (p.valor_unitario as number | null) ?? null,
      marca: p.marca ?? null,
      codigo_familia: p.codigo_familia ? String(p.codigo_familia) : null,
      inativo: false,
      bloqueado: p.bloqueado ?? null,
      tipo_item: p.tipo_item ?? null,
      ncm: p.ncm ?? null,
      ean: p.ean ?? null,
      origem_mercadoria: null,
      estoque: (p.quantidade_estoque as number | null) ?? null,
    })) as OmieProduto[];
});

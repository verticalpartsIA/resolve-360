import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { OmieCliente, OmieProduto } from './erp-client';

function telefoneStr(ddd?: string | null, num?: string | null): string | null {
  if (!ddd && !num) return null;
  return ddd ? `(${ddd}) ${num ?? ''}`.trim() : (num ?? null);
}

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

  const { data, error } = await client
    .from('omie_customers')
    .select(
      'codigo_cliente_omie,codigo_cliente_integracao,cnpj_cpf,razao_social,email,telefone1_ddd,telefone1_numero,cidade,estado,inativo,tags,updated_at',
    )
    .eq('inativo', false)
    .not('codigo_cliente_integracao', 'is', null)
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
    telefone: telefoneStr(row.telefone1_ddd, row.telefone1_numero),
    cidade: row.cidade || null,
    estado: row.estado || null,
    inativo: row.inativo ?? false,
    segmento: segmentoFromTags(row.tags),
    updated_at: row.updated_at ?? null,
  })) as OmieCliente[];
});

export const fetchProdutosAtivosFn = createServerFn().handler(async (): Promise<OmieProduto[]> => {
  const url = process.env.ERP_URL || 'https://kgecbycsyrtdhmdziuul.supabase.co';
  const key =
    process.env.ERP_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWNieWNzeXJ0ZGhtZHppdXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyMzE5NiwiZXhwIjoyMDkzNDk5MTk2fQ.mF6ApvDd3dcxjZ1OEgYC86ShpIdMTIMNJCfbZYrX87o';

  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data, error } = await client
    .from('listar_produtos')
    .select(
      'codigo,codigo_produto,codigo_produto_integracao,descricao,unidade,valor_unitario,marca,codigo_familia,inativo,bloqueado,tipo_item,ncm,ean,origem_mercadoria',
    )
    .eq('inativo', false)
    .order('descricao', { ascending: true });

  if (error) {
    console.error('[ERP] produtos error:', error.message);
    return [];
  }

  const produtos = data ?? [];

  const codigos = produtos.map((p) => p.codigo_produto).filter(Boolean);
  const estoqueMap: Record<string, number | null> = {};
  if (codigos.length > 0) {
    const { data: saldos } = await client
      .from('omie_estoque_saldos')
      .select('codigo_produto,qtde_em_estoque,quantidade,disponivel')
      .in('codigo_produto', codigos.slice(0, 500));
    for (const s of saldos ?? []) {
      estoqueMap[s.codigo_produto] =
        (s.qtde_em_estoque ?? s.quantidade ?? s.disponivel) ?? null;
    }
  }

  return produtos.map((p) => ({
    ...(p as OmieProduto),
    estoque: estoqueMap[p.codigo_produto] ?? null,
  }));
});

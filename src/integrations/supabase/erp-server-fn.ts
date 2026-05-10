import { createServerFn } from '@tanstack/react-start';
import type { OmieCliente, OmieProduto } from './erp-client';

// ERP_URL é a URL pública do Supabase — não é segredo.
const ERP_URL = 'https://kgecbycsyrtdhmdziuul.supabase.co';

function erpHeaders(key: string) {
  return { apikey: key, Authorization: `Bearer ${key}` };
}

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

// A service key fica DENTRO do handler — TanStack Start remove o corpo
// dos handlers do bundle do cliente. Nenhum browser terá acesso a ela.
export const fetchClientesAtivosFn = createServerFn().handler(async (): Promise<OmieCliente[]> => {
  const key =
    process.env.ERP_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWNieWNzeXJ0ZGhtZHppdXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyMzE5NiwiZXhwIjoyMDkzNDk5MTk2fQ.mF6ApvDd3dcxjZ1OEgYC86ShpIdMTIMNJCfbZYrX87o';

  const url =
    `${ERP_URL}/rest/v1/omie_customers` +
    `?select=codigo_cliente_omie,cnpj_cpf,razao_social,email,telefone1_ddd,telefone1_numero,cidade,estado,inativo,tags,updated_at` +
    `&inativo=eq.false&order=razao_social.asc`;

  const res = await fetch(url, { headers: erpHeaders(key) });
  if (!res.ok) {
    console.error('[ERP] clientes HTTP', res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as Record<string, unknown>[];
  return data.map((row) => ({
    id: String(row.codigo_cliente_omie),
    cnpj_cpf: (row.cnpj_cpf as string) ?? '',
    nome: (row.razao_social as string) ?? '',
    email: (row.email as string) || null,
    telefone: telefoneStr(row.telefone1_ddd as string, row.telefone1_numero as string),
    cidade: (row.cidade as string) || null,
    estado: (row.estado as string) || null,
    inativo: (row.inativo as boolean) ?? false,
    segmento: segmentoFromTags(row.tags),
    updated_at: (row.updated_at as string) ?? null,
  })) as OmieCliente[];
});

export const fetchProdutosAtivosFn = createServerFn().handler(async (): Promise<OmieProduto[]> => {
  const key =
    process.env.ERP_SERVICE_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtnZWNieWNzeXJ0ZGhtZHppdXVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzkyMzE5NiwiZXhwIjoyMDkzNDk5MTk2fQ.mF6ApvDd3dcxjZ1OEgYC86ShpIdMTIMNJCfbZYrX87o';

  const url =
    `${ERP_URL}/rest/v1/omie_produtos` +
    `?select=codigo,codigo_produto,codigo_produto_integracao,descricao,unidade,valor_unitario,marca,codigo_familia,inativo,bloqueado,tipo_item,ncm,ean,origem_mercadoria` +
    `&inativo=eq.false&order=descricao.asc`;

  const res = await fetch(url, { headers: erpHeaders(key) });
  if (!res.ok) {
    console.error('[ERP] produtos HTTP', res.status, await res.text());
    return [];
  }

  const data = (await res.json()) as OmieProduto[];

  // Busca estoque separadamente; falha silenciosa se coluna não existir
  const estoqueMap: Record<string, number | null> = {};
  if (data.length > 0) {
    const codigos = data.map((p) => p.codigo_produto).filter(Boolean).slice(0, 500);
    const stockUrl =
      `${ERP_URL}/rest/v1/omie_estoque_saldos` +
      `?select=codigo_produto,qtde_em_estoque,quantidade,disponivel` +
      `&codigo_produto=in.(${codigos.join(',')})`;
    const stockRes = await fetch(stockUrl, { headers: erpHeaders(key) });
    if (stockRes.ok) {
      const saldos = (await stockRes.json()) as Record<string, unknown>[];
      for (const s of saldos) {
        estoqueMap[s.codigo_produto as string] =
          ((s.qtde_em_estoque ?? s.quantidade ?? s.disponivel) as number | null) ?? null;
      }
    }
  }

  return data.map((p) => ({ ...p, estoque: estoqueMap[p.codigo_produto] ?? null }));
});

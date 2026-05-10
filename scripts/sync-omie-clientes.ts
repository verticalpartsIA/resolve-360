/**
 * Sync OMIE → Supabase: omie_customers
 *
 * Busca contas com tag "Cliente" e inativo=N na API OMIE e faz upsert
 * em massa na tabela omie_customers do bd_Omie Supabase.
 *
 * Variáveis de ambiente:
 *   OMIE_APP_KEY, OMIE_APP_SECRET
 *   ERP_URL, ERP_SERVICE_KEY
 */

const OMIE_URL = "https://app.omie.com.br/api/v1/geral/clientes/";
const APP_KEY = process.env.OMIE_APP_KEY!;
const APP_SECRET = process.env.OMIE_APP_SECRET!;
const SUPABASE_URL = process.env.ERP_URL!;
const SUPABASE_KEY = process.env.ERP_SERVICE_KEY!;

const POR_PAGINA = 100;

interface OmieClienteRaw {
  codigo_cliente_omie: number;
  codigo_cliente_integracao?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj_cpf?: string;
  email?: string;
  telefone1_ddd?: string;
  telefone1_numero?: string;
  telefone2_ddd?: string;
  telefone2_numero?: string;
  contato?: string;
  endereco?: string;
  endereco_numero?: string;
  complemento?: string;
  bairro?: string;
  cep?: string;
  cidade?: string;
  cidade_ibge?: string;
  estado?: string;
  codigo_pais?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  homepage?: string;
  pessoa_fisica?: string;
  inativo: string;
  bloquear_faturamento?: string;
  tags?: { tag: string }[];
  caracteristicas?: unknown[];
  dadosBancarios?: unknown;
  recomendacoes?: unknown;
  info?: { dAlt?: string; hAlt?: string; dInc?: string; hInc?: string };
  [key: string]: unknown;
}

interface OmieResponse {
  total_de_paginas: number;
  total_de_registros: number;
  clientes_cadastro: OmieClienteRaw[];
}

async function fetchPage(pagina: number): Promise<OmieResponse> {
  const res = await fetch(OMIE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      call: "ListarClientes",
      app_key: APP_KEY,
      app_secret: APP_SECRET,
      param: [{
        pagina,
        registros_por_pagina: POR_PAGINA,
        clientesFiltro: {
          inativo: "N",
          tags: [{ tag: "Cliente" }],
        },
        exibir_caracteristicas: "N",
      }],
    }),
  });

  if (!res.ok) throw new Error(`OMIE HTTP ${res.status}: ${await res.text()}`);
  const data = await res.json() as OmieResponse;
  if (!data.clientes_cadastro) throw new Error(`OMIE erro: ${JSON.stringify(data)}`);
  return data;
}

function parseDate(dAlt?: string, hAlt?: string): string | null {
  if (!dAlt) return null;
  const [d, m, y] = dAlt.split("/");
  return new Date(`${y}-${m}-${d}T${hAlt ?? "00:00:00"}-03:00`).toISOString();
}

function parseCidade(raw?: string): string {
  if (!raw) return "";
  return raw.replace(/\s*\([A-Z]{2}\)\s*$/, "").trim();
}

function mapear(c: OmieClienteRaw): Record<string, unknown> {
  return {
    codigo_cliente_omie: c.codigo_cliente_omie,
    codigo_cliente_integracao: c.codigo_cliente_integracao ?? "",
    razao_social: c.razao_social || "",
    nome_fantasia: c.nome_fantasia ?? "",
    cnpj_cpf: c.cnpj_cpf ?? "",
    email: c.email ?? "",
    telefone1_ddd: c.telefone1_ddd ?? "",
    telefone1_numero: c.telefone1_numero ?? "",
    telefone2_ddd: c.telefone2_ddd ?? "",
    telefone2_numero: c.telefone2_numero ?? "",
    contato: c.contato ?? "",
    endereco: c.endereco ?? "",
    endereco_numero: c.endereco_numero ?? "",
    complemento: c.complemento ?? "",
    bairro: c.bairro ?? "",
    cep: c.cep ?? "",
    cidade: parseCidade(c.cidade),
    cidade_ibge: c.cidade_ibge ?? "",
    estado: c.estado ?? "",
    codigo_pais: c.codigo_pais ?? "",
    inscricao_estadual: c.inscricao_estadual ?? "",
    inscricao_municipal: c.inscricao_municipal ?? "",
    homepage: c.homepage ?? "",
    pessoa_fisica: c.pessoa_fisica === "S",
    inativo: c.inativo === "S",
    bloquear_faturamento: c.bloquear_faturamento === "S",
    tags: c.tags ?? [],
    caracteristicas: c.caracteristicas ?? [],
    dados_bancarios: c.dadosBancarios ?? {},
    recomendacoes: c.recomendacoes ?? {},
    info: c.info ?? {},
    omie_payload_bruto: c,
    data_inclusao_omie: c.info?.dInc
      ? (() => { const [d, m, y] = c.info!.dInc!.split("/"); return `${y}-${m}-${d}`; })()
      : null,
    data_alteracao_omie: c.info?.dAlt
      ? (() => { const [d, m, y] = c.info!.dAlt!.split("/"); return `${y}-${m}-${d}`; })()
      : null,
    sincronizado_em: new Date().toISOString(),
    updated_at: parseDate(c.info?.dAlt, c.info?.hAlt) ?? new Date().toISOString(),
  };
}

async function upsertLote(registros: Record<string, unknown>[]): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/omie_customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(registros),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase upsert falhou (${res.status}): ${body}`);
  }
}

async function main() {
  if (!APP_KEY || !APP_SECRET) throw new Error("OMIE_APP_KEY / OMIE_APP_SECRET não definidos");
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("ERP_URL / ERP_SERVICE_KEY não definidos");

  console.log("[sync-omie-clientes] Iniciando...");

  const primeira = await fetchPage(1);
  const totalPaginas = primeira.total_de_paginas;
  const totalRegistros = primeira.total_de_registros;
  console.log(`[sync-omie-clientes] ${totalRegistros} clientes · ${totalPaginas} páginas`);

  let sincronizados = 0;

  const lote1 = primeira.clientes_cadastro.map(mapear);
  await upsertLote(lote1);
  sincronizados += lote1.length;
  console.log(`  Página 1/${totalPaginas} — ${sincronizados} ok`);

  for (let p = 2; p <= totalPaginas; p++) {
    const pagina = await fetchPage(p);
    const lote = pagina.clientes_cadastro.map(mapear);
    await upsertLote(lote);
    sincronizados += lote.length;
    console.log(`  Página ${p}/${totalPaginas} — ${sincronizados} ok`);
    // Rate limit OMIE: ~500 req/min
    await new Promise((r) => setTimeout(r, 150));
  }

  console.log(`[sync-omie-clientes] ✓ ${sincronizados}/${totalRegistros} clientes sincronizados.`);
}

main().catch((err) => {
  console.error("[sync-omie-clientes] ERRO:", err);
  process.exit(1);
});

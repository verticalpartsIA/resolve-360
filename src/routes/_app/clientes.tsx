import { createFileRoute, Link } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import type { OmieCliente } from "@/integrations/supabase/erp-client";
import { serverFetchClientesAtivos } from "@/integrations/supabase/erp-client.server";
import { Building2, RefreshCw, Search, AlertCircle, ExternalLink } from "lucide-react";

const fetchClientes = createServerFn().handler((): Promise<OmieCliente[]> =>
  serverFetchClientesAtivos(),
);

export const Route = createFileRoute("/_app/clientes")({
  loader: () => fetchClientes(),
  component: ClientesPage,
});

function ClientesPage() {
  const initial = Route.useLoaderData();
  const [clientes, setClientes] = useState<OmieCliente[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchClientes();
      setClientes(data);
    } catch (e) {
      setError("Falha ao recarregar clientes do ERP.");
      console.error("[Clientes ERP]", e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      clientes.filter((c) =>
        [c.cnpj_cpf, c.nome, c.email ?? "", c.cidade ?? "", c.estado ?? "", c.segmento ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [clientes, q],
  );

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">ERP · Omie</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Carregando..." : `${clientes.length} clientes ativos sincronizados do ERP`}
          </p>
        </div>
        <button
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Recarregar
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por CNPJ/CPF, razão social, cidade, segmento..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">CNPJ / CPF</th>
              <th className="px-4 py-3 text-left">Razão Social</th>
              <th className="px-4 py-3 text-left">Cidade / UF</th>
              <th className="px-4 py-3 text-left">Segmento</th>
              <th className="px-4 py-3 text-left">Contato</th>
              <th className="px-4 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading && !error &&
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{c.cnpj_cpf || "—"}</td>
                  <td className="px-4 py-3 font-medium">{c.nome}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {c.segmento ? (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {c.segmento}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.email && <div>{c.email}</div>}
                    {c.telefone && <div className="text-muted-foreground">{c.telefone}</div>}
                    {!c.email && !c.telefone && <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to="/cliente/$cnpj"
                      params={{ cnpj: encodeURIComponent(c.cnpj_cpf || c.id) }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Ver histórico <ExternalLink className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            {(loading || filtered.length === 0) && !error && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  {loading
                    ? "Carregando clientes do ERP..."
                    : clientes.length === 0
                      ? "Nenhum cliente ativo no ERP. Aguarde a sincronização com o Omie."
                      : "Nenhum cliente encontrado para essa busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

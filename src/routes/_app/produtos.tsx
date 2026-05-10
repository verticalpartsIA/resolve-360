import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import type { OmieProduto } from "@/integrations/supabase/erp-client";
import { Package, RefreshCw, Search, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_app/produtos")({
  loader: async () => {
    const { serverFetchProdutosAtivos } = await import(
      "@/integrations/supabase/erp-client.server"
    );
    return serverFetchProdutosAtivos();
  },
  component: ProdutosPage,
});

function ProdutosPage() {
  const initial = Route.useLoaderData();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  async function reload() {
    setLoading(true);
    setError(null);
    try {
      await router.invalidate();
    } catch {
      setError("Falha ao recarregar produtos do ERP.");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(
    () =>
      initial.filter((p) =>
        [p.codigo, p.codigo_produto, p.descricao, p.marca ?? "", p.codigo_familia ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [initial, q],
  );

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">ERP · Omie</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading ? "Recarregando..." : `${initial.length} produtos ativos sincronizados do ERP`}
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
          placeholder="Buscar por código, descrição, marca ou família..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left">Família</th>
              <th className="px-4 py-3 text-left">Marca</th>
              <th className="px-4 py-3 text-left">Un.</th>
              <th className="px-4 py-3 text-left">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading && !error &&
              filtered.map((p) => (
                <tr key={p.codigo} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{p.codigo_produto || p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.descricao}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.codigo_familia || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.marca || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.unidade || "—"}</td>
                  <td className="px-4 py-3">
                    {p.tipo_item ? (
                      <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        {p.tipo_item}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            {(loading || filtered.length === 0) && !error && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  {loading
                    ? "Carregando produtos do ERP..."
                    : initial.length === 0
                      ? "Nenhum produto ativo no ERP."
                      : "Nenhum produto encontrado para essa busca."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

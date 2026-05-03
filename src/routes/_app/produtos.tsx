import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Package, RefreshCw, Search } from "lucide-react";

type Produto = {
  id: string;
  codigo: string;
  descricao: string;
  categoria: string;
  preco: number;
  fornecedor?: string;
  origem: "erp" | "manual";
};

export const Route = createFileRoute("/_app/produtos")({ component: ProdutosPage });

function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  async function loadProdutos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .order("descricao", { ascending: true });

    if (error) {
      console.error("[Produtos] Failed to load produtos", error);
      setLoading(false);
      return;
    }

    setProdutos(
      (data ?? []).map((item) => ({
        id: item.id,
        codigo: item.codigo,
        descricao: item.descricao,
        categoria: item.categoria ?? "",
        preco: item.preco ?? 0,
        fornecedor: item.fornecedor ?? undefined,
        origem: item.origem === "manual" ? "manual" : "erp",
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadProdutos();
  }, []);

  const filtered = useMemo(
    () =>
      produtos.filter((p) =>
        [p.codigo, p.descricao, p.categoria, p.fornecedor ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [produtos, q],
  );

  async function handleSave(produto: Omit<Produto, "id" | "origem">) {
    setSaving(true);
    const { error } = await supabase.from("produtos").insert({
      codigo: produto.codigo,
      descricao: produto.descricao,
      categoria: produto.categoria || null,
      preco: produto.preco || null,
      fornecedor: produto.fornecedor || null,
      origem: "manual",
    });

    if (error) {
      console.error("[Produtos] Failed to create produto", error);
      setSaving(false);
      return;
    }

    setOpen(false);
    setSaving(false);
    await loadProdutos();
  }

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Catalogo</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {produtos.length} produtos carregados do Supabase oficial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadProdutos()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Recarregar
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por codigo, descricao ou categoria..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Codigo</th>
              <th className="px-4 py-3 text-left">Descricao</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-left">Fornecedor</th>
              <th className="px-4 py-3 text-right">Preco</th>
              <th className="px-4 py-3 text-left">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading &&
              filtered.map((p) => (
                <tr key={p.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                  <td className="px-4 py-3 font-medium">{p.descricao}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.categoria || "-"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.fornecedor || "-"}</td>
                  <td className="px-4 py-3 text-right">
                    {p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        p.origem === "erp" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold"
                      }`}
                    >
                      {p.origem === "erp" ? "ERP" : "Manual"}
                    </span>
                  </td>
                </tr>
              ))}
            {(loading || filtered.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Package className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  {loading ? "Carregando produtos..." : "Nenhum produto encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <NovoProdutoDialog onClose={() => setOpen(false)} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}

function NovoProdutoDialog({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (p: Omit<Produto, "id" | "origem">) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    codigo: "",
    descricao: "",
    categoria: "",
    preco: 0,
    fornecedor: "",
  });
  const valid = form.codigo.trim() && form.descricao.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Novo produto</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cadastro manual no Supabase oficial.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Codigo">
            <input
              value={form.codigo}
              onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
              className={inp}
              placeholder="EX-1234"
            />
          </Field>
          <Field label="Descricao">
            <input
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className={inp}
            />
          </Field>
          <Field label="Categoria">
            <input
              value={form.categoria}
              onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              className={inp}
            />
          </Field>
          <Field label="Fornecedor">
            <input
              value={form.fornecedor}
              onChange={(e) => setForm({ ...form, fornecedor: e.target.value })}
              className={inp}
            />
          </Field>
          <Field label="Preco (R$)">
            <input
              type="number"
              step="0.01"
              value={form.preco}
              onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })}
              className={inp}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">
            Cancelar
          </button>
          <button
            disabled={!valid || saving}
            onClick={() => void onSave(form)}
            className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

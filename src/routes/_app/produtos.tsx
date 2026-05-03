import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import { Plus, Package, RefreshCw, Search } from "lucide-react";

type Produto = {
  codigo: string;
  descricao: string;
  categoria: string;
  estoque: number;
  preco: number;
  origem: "erp" | "manual";
};

const seed: Produto[] = [
  { codigo: "PF-3421", descricao: "Pastilha de Freio Dianteira", categoria: "Freios", estoque: 145, preco: 89.9, origem: "erp" },
  { codigo: "FO-1102", descricao: "Filtro de Óleo", categoria: "Filtros", estoque: 320, preco: 24.5, origem: "erp" },
  { codigo: "AM-9921", descricao: "Amortecedor Traseiro", categoria: "Suspensão", estoque: 42, preco: 459.0, origem: "erp" },
  { codigo: "CD-5510", descricao: "Correia Dentada", categoria: "Motor", estoque: 78, preco: 132.0, origem: "erp" },
  { codigo: "VI-7788", descricao: "Velas de Ignição (kit 4)", categoria: "Ignição", estoque: 210, preco: 96.0, origem: "erp" },
];

export const Route = createFileRoute("/_app/produtos")({ component: ProdutosPage });

function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>(seed);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = produtos.filter((p) =>
    [p.codigo, p.descricao, p.categoria].some((s) => s.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Catálogo</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Produtos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {produtos.length} peças · sincronização com ERP + cadastro manual
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted">
            <RefreshCw className="h-4 w-4" /> Sincronizar ERP
          </button>
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4" /> Novo produto
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, descrição ou categoria…" className="flex-1 bg-transparent text-sm outline-none" />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Código</th>
              <th className="px-4 py-3 text-left">Descrição</th>
              <th className="px-4 py-3 text-left">Categoria</th>
              <th className="px-4 py-3 text-right">Estoque</th>
              <th className="px-4 py-3 text-right">Preço</th>
              <th className="px-4 py-3 text-left">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((p) => (
              <tr key={p.codigo} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{p.codigo}</td>
                <td className="px-4 py-3 font-medium">{p.descricao}</td>
                <td className="px-4 py-3 text-muted-foreground">{p.categoria}</td>
                <td className="px-4 py-3 text-right">{p.estoque}</td>
                <td className="px-4 py-3 text-right">{p.preco.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${p.origem === "erp" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold"}`}>
                    {p.origem === "erp" ? "ERP" : "Manual"}
                  </span>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                <Package className="mx-auto mb-2 h-6 w-6 opacity-50" /> Nenhum produto encontrado.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <NovoProdutoDialog
          onClose={() => setOpen(false)}
          onSave={(p) => { setProdutos((prev) => [{ ...p, origem: "manual" }, ...prev]); setOpen(false); }}
        />
      )}
    </div>
  );
}

function NovoProdutoDialog({ onClose, onSave }: { onClose: () => void; onSave: (p: Omit<Produto, "origem">) => void }) {
  const [form, setForm] = useState({ codigo: "", descricao: "", categoria: "", estoque: 0, preco: 0 });
  const valid = form.codigo.trim() && form.descricao.trim();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Novo produto</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cadastro manual — peça que não está no ERP.</p>
        <div className="mt-4 grid gap-3">
          <Field label="Código"><input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value.toUpperCase() })} className={inp} placeholder="EX-1234" /></Field>
          <Field label="Descrição"><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} className={inp} /></Field>
          <Field label="Categoria"><input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inp} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Estoque"><input type="number" value={form.estoque} onChange={(e) => setForm({ ...form, estoque: Number(e.target.value) })} className={inp} /></Field>
            <Field label="Preço (R$)"><input type="number" step="0.01" value={form.preco} onChange={(e) => setForm({ ...form, preco: Number(e.target.value) })} className={inp} /></Field>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border px-4 py-2 text-sm hover:bg-muted">Cancelar</button>
          <button disabled={!valid} onClick={() => onSave(form)} className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">Salvar</button>
        </div>
      </div>
    </div>
  );
}

const inp = "mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm";
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}

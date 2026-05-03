import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Building2, RefreshCw, Search } from "lucide-react";

type Cliente = {
  id: string;
  cnpj: string;
  razao: string;
  cidade: string;
  uf: string;
  tier: "A" | "B" | "C";
  contato: string;
  telefone: string;
  email?: string;
  origem: "erp" | "manual";
};

export const Route = createFileRoute("/_app/clientes")({ component: ClientesPage });

function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  async function loadClientes() {
    setLoading(true);
    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .order("razao_social", { ascending: true });

    if (error) {
      console.error("[Clientes] Failed to load clientes", error);
      setLoading(false);
      return;
    }

    setClientes(
      (data ?? []).map((item) => ({
        id: item.id,
        cnpj: item.cnpj,
        razao: item.razao_social,
        cidade: item.cidade ?? "",
        uf: item.estado ?? "",
        tier: item.tier ?? "B",
        contato: item.contato ?? "",
        telefone: item.telefone ?? "",
        email: item.email ?? undefined,
        origem: item.origem === "manual" ? "manual" : "erp",
      })),
    );
    setLoading(false);
  }

  useEffect(() => {
    void loadClientes();
  }, []);

  const filtered = useMemo(
    () =>
      clientes.filter((c) =>
        [c.cnpj, c.razao, c.cidade, c.uf, c.contato, c.telefone]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
      ),
    [clientes, q],
  );

  async function handleSave(cliente: Omit<Cliente, "id" | "origem">) {
    setSaving(true);
    const { error } = await supabase.from("clientes").insert({
      cnpj: cliente.cnpj,
      razao_social: cliente.razao,
      cidade: cliente.cidade || null,
      estado: cliente.uf || null,
      tier: cliente.tier,
      contato: cliente.contato || null,
      telefone: cliente.telefone || null,
      email: cliente.email || null,
      origem: "manual",
    });

    if (error) {
      console.error("[Clientes] Failed to create cliente", error);
      setSaving(false);
      return;
    }

    setOpen(false);
    setSaving(false);
    await loadClientes();
  }

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Base</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientes.length} clientes carregados do Supabase oficial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => void loadClientes()}
            className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" /> Recarregar
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Novo cliente
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por CNPJ, razao, cidade..."
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">CNPJ</th>
              <th className="px-4 py-3 text-left">Razao Social</th>
              <th className="px-4 py-3 text-left">Cidade/UF</th>
              <th className="px-4 py-3 text-left">Tier</th>
              <th className="px-4 py-3 text-left">Contato</th>
              <th className="px-4 py-3 text-left">Origem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {!loading &&
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs">{c.cnpj}</td>
                  <td className="px-4 py-3 font-medium">{c.razao}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.cidade || "-"} / {c.uf || "-"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold text-gold">
                      {c.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {c.contato || "-"}
                    <br />
                    <span className="text-muted-foreground">{c.telefone || c.email || "-"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        c.origem === "erp" ? "bg-primary/10 text-primary" : "bg-gold/15 text-gold"
                      }`}
                    >
                      {c.origem}
                    </span>
                  </td>
                </tr>
              ))}
            {(loading || filtered.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  <Building2 className="mx-auto mb-2 h-6 w-6 opacity-50" />
                  {loading ? "Carregando clientes..." : "Nenhum cliente encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {open && (
        <NovoClienteDialog onClose={() => setOpen(false)} onSave={handleSave} saving={saving} />
      )}
    </div>
  );
}

function NovoClienteDialog({
  onClose,
  onSave,
  saving,
}: {
  onClose: () => void;
  onSave: (c: Omit<Cliente, "id" | "origem">) => Promise<void>;
  saving: boolean;
}) {
  const [form, setForm] = useState<Omit<Cliente, "id" | "origem">>({
    cnpj: "",
    razao: "",
    cidade: "",
    uf: "",
    tier: "B",
    contato: "",
    telefone: "",
    email: "",
  });
  const valid = form.cnpj.trim() && form.razao.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Novo cliente</h2>
        <p className="mt-1 text-xs text-muted-foreground">Cadastro manual no Supabase oficial.</p>
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="CNPJ">
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className={inp}
                placeholder="00.000.000/0000-00"
              />
            </Field>
            <Field label="Tier">
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as "A" | "B" | "C" })}
                className={inp}
              >
                <option value="A">A</option>
                <option value="B">B</option>
                <option value="C">C</option>
              </select>
            </Field>
          </div>
          <Field label="Razao social">
            <input
              value={form.razao}
              onChange={(e) => setForm({ ...form, razao: e.target.value })}
              className={inp}
            />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <Field label="Cidade">
                <input
                  value={form.cidade}
                  onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  className={inp}
                />
              </Field>
            </div>
            <Field label="UF">
              <input
                value={form.uf}
                maxLength={2}
                onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                className={inp}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Contato">
              <input
                value={form.contato}
                onChange={(e) => setForm({ ...form, contato: e.target.value })}
                className={inp}
              />
            </Field>
            <Field label="Telefone">
              <input
                value={form.telefone}
                onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                className={inp}
              />
            </Field>
          </div>
          <Field label="E-mail">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
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

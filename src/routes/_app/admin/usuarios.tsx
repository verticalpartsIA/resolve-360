import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BackToDashboard } from "@/components/app/BackToDashboard";
import { Plus, Shield, Trash2 } from "lucide-react";

type Role = "operador" | "qualidade" | "gestor" | "admin";
const ROLE_LABEL: Record<Role, string> = {
  operador: "Operador",
  qualidade: "Qualidade",
  gestor: "Gestor",
  admin: "Administrador",
};
const ROLE_DESC: Record<Role, string> = {
  operador: "Cria e atende ocorrências, abre tickets internos.",
  qualidade: "Preenche FO-504, define causa raiz, fecha ocorrências.",
  gestor: "Acessa KPIs, relatórios e custo da não qualidade.",
  admin: "Gerencia usuários, configurações e integrações.",
};

type Usuario = {
  id: string;
  nome: string;
  email: string;
  departamento: string;
  roles: Role[];
  ativo: boolean;
};

const seed: Usuario[] = [
  { id: "1", nome: "Maria Souza", email: "maria@verticalparts.com", departamento: "Pós-Venda", roles: ["operador", "gestor"], ativo: true },
  { id: "2", nome: "João Lima", email: "joao@verticalparts.com", departamento: "Pós-Venda", roles: ["operador"], ativo: true },
  { id: "3", nome: "Carla Mendes", email: "carla@verticalparts.com", departamento: "Qualidade", roles: ["qualidade"], ativo: true },
  { id: "4", nome: "Admin Master", email: "admin@verticalparts.com", departamento: "TI", roles: ["admin"], ativo: true },
];

export const Route = createFileRoute("/_app/admin/usuarios")({ component: UsuariosPage });

function UsuariosPage() {
  const [users, setUsers] = useState<Usuario[]>(seed);
  const [open, setOpen] = useState(false);

  function toggleRole(id: string, role: Role) {
    setUsers((prev) => prev.map((u) => u.id === id ? {
      ...u,
      roles: u.roles.includes(role) ? u.roles.filter((r) => r !== role) : [...u.roles, role],
    } : u));
  }
  function toggleAtivo(id: string) {
    setUsers((prev) => prev.map((u) => u.id === id ? { ...u, ativo: !u.ativo } : u));
  }
  function remover(id: string) {
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  return (
    <div className="space-y-6">
      <BackToDashboard />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Usuários e permissões</h1>
          <p className="mt-1 text-sm text-muted-foreground">{users.length} usuários · alçadas por papel (Operador, Qualidade, Gestor, Admin)</p>
        </div>
        <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Plus className="h-4 w-4" /> Novo usuário
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
          <div key={r} className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-gold" />
              <span className="text-sm font-semibold">{ROLE_LABEL[r]}</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{ROLE_DESC[r]}</p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-elegant)]">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Usuário</th>
              <th className="px-4 py-3 text-left">Departamento</th>
              <th className="px-4 py-3 text-left">Papéis (alçadas)</th>
              <th className="px-4 py-3 text-center">Ativo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <div className="font-medium">{u.nome}</div>
                  <div className="text-xs text-muted-foreground">{u.email}</div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.departamento}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {(Object.keys(ROLE_LABEL) as Role[]).map((r) => {
                      const has = u.roles.includes(r);
                      return (
                        <button
                          key={r}
                          onClick={() => toggleRole(u.id, r)}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${has ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent hover:border-border"}`}
                        >
                          {ROLE_LABEL[r]}
                        </button>
                      );
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => toggleAtivo(u.id)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${u.ativo ? "bg-success/15 text-success" : "bg-muted text-muted-foreground"}`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => remover(u.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <NovoUsuarioDialog
          onClose={() => setOpen(false)}
          onSave={(u) => { setUsers((prev) => [{ ...u, id: Math.random().toString(36).slice(2, 8), ativo: true }, ...prev]); setOpen(false); }}
        />
      )}
    </div>
  );
}

function NovoUsuarioDialog({ onClose, onSave }: { onClose: () => void; onSave: (u: Omit<Usuario, "id" | "ativo">) => void }) {
  const [form, setForm] = useState<Omit<Usuario, "id" | "ativo">>({ nome: "", email: "", departamento: "", roles: ["operador"] });
  const valid = form.nome.trim() && form.email.trim();
  function toggle(r: Role) {
    setForm((f) => ({ ...f, roles: f.roles.includes(r) ? f.roles.filter((x) => x !== r) : [...f.roles, r] }));
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-[var(--shadow-elegant)]">
        <h2 className="text-lg font-semibold">Novo usuário</h2>
        <div className="mt-4 grid gap-3">
          <Field label="Nome"><input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} className={inp} /></Field>
          <Field label="Email"><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inp} /></Field>
          <Field label="Departamento"><input value={form.departamento} onChange={(e) => setForm({ ...form, departamento: e.target.value })} className={inp} /></Field>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Papéis (alçadas)</span>
            <div className="mt-2 flex flex-wrap gap-1">
              {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
                <button key={r} type="button" onClick={() => toggle(r)} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${form.roles.includes(r) ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent"}`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
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

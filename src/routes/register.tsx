import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field } from "./login";
import { toast } from "sonner";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password, name);
    setLoading(false);
    if (error) { toast.error(error); return; }
    toast.success("Conta criada! Verifique seu e-mail se necessário.");
    navigate({ to: "/login" });
  };

  return (
    <AuthShell title="Criar conta" subtitle="Cadastro de novos operadores (gestão e admin precisam ser promovidos por um admin)">
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Nome" value={name} onChange={setName} required autoFocus />
        <Field label="E-mail corporativo" type="email" value={email} onChange={setEmail} required />
        <Field label="Senha" type="password" value={password} onChange={setPassword} required />
        <button disabled={loading} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
          {loading ? "Criando..." : "Criar conta"}
        </button>
      </form>
      <div className="mt-4 text-center text-xs text-muted-foreground">
        Já tem conta? <Link to="/login" className="font-medium text-gold hover:underline">Entrar</Link>
      </div>
    </AuthShell>
  );
}

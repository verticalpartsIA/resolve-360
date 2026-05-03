import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { AuthShell, Field } from "./login";
import { toast } from "sonner";

export const Route = createFileRoute("/recover-password")({ component: RecoverPage });

function RecoverPage() {
  const { recoverPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await recoverPassword(email);
    setLoading(false);
    if (error) { toast.error(error); return; }
    setSent(true);
    toast.success("Se o e-mail existir, você receberá instruções.");
  };

  return (
    <AuthShell title="Recuperar senha" subtitle="Enviaremos um link para redefinir sua senha">
      {sent ? (
        <div className="rounded-md border border-success/30 bg-success/10 p-4 text-sm">
          Verifique sua caixa de entrada e siga as instruções para criar uma nova senha.
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="E-mail" type="email" value={email} onChange={setEmail} required autoFocus />
          <button disabled={loading} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
            {loading ? "Enviando..." : "Enviar link"}
          </button>
        </form>
      )}
      <div className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/login" className="font-medium text-gold hover:underline">Voltar para login</Link>
      </div>
    </AuthShell>
  );
}

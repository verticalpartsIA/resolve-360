import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { STATUS_LABEL } from "@/lib/types";
import { Ticket as TicketIcon } from "lucide-react";

export const Route = createFileRoute("/_app/meus-tickets")({ component: MyTickets });

function MyTickets() {
  const { tickets } = useStore();
  const { user } = useAuth();
  const email = user?.email ?? "";
  const mine = tickets.filter(
    (t) => t.assignee && (t.assignee === email || email.startsWith(t.assignee.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gold">Minha fila</p>
        <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Meus tickets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ocorrências atribuídas a você ({email || "—"}).
        </p>
      </div>

      {mine.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-card p-10 text-center">
          <TicketIcon className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Nenhum ticket atribuído a você no momento.</p>
          <Link to="/ocorrencias" className="mt-4 inline-block text-sm font-medium text-gold hover:underline">
            Ver todas as ocorrências →
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left">RO</th>
                <th className="px-4 py-3 text-left">Cliente</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {mine.map((t) => (
                <tr key={t.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    <Link to="/ocorrencia/$ro" params={{ ro: t.roNumber ?? t.code }} className="hover:text-gold">
                      {t.roNumber ?? t.code}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{t.customer}</td>
                  <td className="px-4 py-3">{STATUS_LABEL[t.status]}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleDateString("pt-BR")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
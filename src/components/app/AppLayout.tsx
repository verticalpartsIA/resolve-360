import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Ticket, PlusCircle, BarChart3, Bell, Search, Users, Smile } from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";

const nav = [
  { to: "/", label: "Operador", icon: LayoutDashboard },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/internos", label: "Internos", icon: Users },
  { to: "/tickets/novo", label: "Novo Ticket", icon: PlusCircle },
  { to: "/nps", label: "NPS", icon: Smile },
  { to: "/gestor", label: "Gestor", icon: BarChart3 },
];

export function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Sidebar - desktop */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 px-3 py-5">
          {nav.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {n.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-gold" />}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-4 text-xs text-sidebar-foreground/60">
          <div className="font-medium text-sidebar-foreground">Maria Souza</div>
          <div>Operadora · Pós-Venda</div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-black px-4 py-3 lg:hidden">
        <Logo />
        <button className="rounded-md border border-sidebar-border p-2 text-white hover:text-gold hover:border-gold"><Bell className="h-4 w-4" /></button>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-6 border-t bg-background lg:hidden">
        {nav.map((n) => {
          const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
          const Icon = n.icon;
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors hover:text-gold",
                active ? "text-gold" : "text-muted-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <main className="lg:pl-64">
        {/* Desktop top bar */}
        <div className="sticky top-0 z-20 hidden items-center justify-between border-b bg-background/80 px-8 py-4 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input
              placeholder="Buscar ticket, cliente, peça..."
              className="w-80 bg-transparent outline-none placeholder:text-muted-foreground/60"
            />
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 hover:bg-muted"><Bell className="h-4 w-4" /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">MS</div>
          </div>
        </div>

        <div className="px-4 pb-24 pt-6 sm:px-6 lg:px-8 lg:pb-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

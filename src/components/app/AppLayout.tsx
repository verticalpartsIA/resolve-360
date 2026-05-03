import { Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, PlusCircle, Ticket, Smile, Package, Building2,
  BarChart3, MessageCircle, Settings, Bell, Search, LogOut, ChevronDown,
} from "lucide-react";
import { Logo } from "./Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useState } from "react";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; roles?: ("operador" | "gestor" | "admin")[] };
type NavGroup = { title: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    title: "Operação",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/nova-ocorrencia", label: "Nova Ocorrência", icon: PlusCircle },
      { to: "/ocorrencias", label: "Ocorrências", icon: FileText },
      { to: "/tickets-internos", label: "Tickets Internos", icon: Ticket },
      { to: "/meus-tickets", label: "Meus Tickets", icon: Ticket },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { to: "/produtos", label: "Produtos", icon: Package },
      { to: "/clientes", label: "Clientes", icon: Building2 },
    ],
  },
  {
    title: "Análise",
    items: [
      { to: "/nps/dashboard", label: "NPS", icon: Smile },
      { to: "/gestor/kpis", label: "KPIs Gestor", icon: BarChart3, roles: ["gestor", "admin"] },
    ],
  },
  {
    title: "Comunicação",
    items: [
      { to: "/whatsapp-threads", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    title: "Admin",
    items: [
      { to: "/admin/usuarios", label: "Usuários", icon: Settings, roles: ["admin"] },
      { to: "/admin/configuracoes", label: "Configurações", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function AppLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, roles, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const visible = groups
    .map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || i.roles.some((r) => roles.includes(r))),
    }))
    .filter((g) => g.items.length > 0);

  const initials = (user?.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="border-b border-sidebar-border px-5 py-5">
          <Logo />
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {visible.map((g) => (
            <div key={g.title}>
              <div className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/40">
                {g.title}
              </div>
              <div className="space-y-0.5">
                {g.items.map((n) => {
                  const active = path === n.to || path.startsWith(n.to + "/");
                  const Icon = n.icon;
                  return (
                    <Link
                      key={n.to}
                      to={n.to}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-black text-xs font-bold">{initials}</div>
            <div className="flex-1 min-w-0">
              <div className="truncate text-xs font-medium text-sidebar-foreground">{user?.email}</div>
              <div className="text-[10px] text-sidebar-foreground/60 uppercase tracking-wider">{roles.join(" · ") || "—"}</div>
            </div>
            <button
              onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
              className="rounded-md p-1.5 text-sidebar-foreground/60 hover:text-gold"
              title="Sair"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-sidebar-border bg-black px-4 py-3 lg:hidden">
        <Logo />
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-md border border-sidebar-border p-2 text-white hover:text-gold hover:border-gold"
        >
          <ChevronDown className={cn("h-4 w-4 transition-transform", menuOpen && "rotate-180")} />
        </button>
      </header>
      {menuOpen && (
        <div className="lg:hidden border-b bg-background p-3 space-y-3">
          {visible.map((g) => (
            <div key={g.title}>
              <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{g.title}</div>
              <div className="grid grid-cols-2 gap-1">
                {g.items.map((n) => {
                  const Icon = n.icon;
                  const active = path === n.to || path.startsWith(n.to + "/");
                  return (
                    <Link key={n.to} to={n.to} onClick={() => setMenuOpen(false)}
                      className={cn("flex items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium",
                        active ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70")}>
                      <Icon className="h-3.5 w-3.5" />{n.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
          <button onClick={async () => { await signOut(); navigate({ to: "/login" }); }}
            className="w-full flex items-center justify-center gap-2 rounded-md border border-border py-2 text-sm font-medium">
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}

      <main className="lg:pl-64">
        <div className="sticky top-0 z-20 hidden items-center justify-between border-b bg-background/80 px-8 py-4 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Search className="h-4 w-4" />
            <input placeholder="Buscar ticket, cliente, peça..." className="w-80 bg-transparent outline-none placeholder:text-muted-foreground/60" />
          </div>
          <div className="flex items-center gap-3">
            <button className="rounded-md p-2 hover:bg-muted"><Bell className="h-4 w-4" /></button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">{initials}</div>
          </div>
        </div>

        <div className="px-4 pb-10 pt-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

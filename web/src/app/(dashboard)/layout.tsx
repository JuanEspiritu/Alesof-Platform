"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getUser, clearAuth, type User } from "@/lib/auth";
import {
  LayoutDashboard,
  Users,
  UserCog,
  HardDrive,
  Receipt,
  Headset,
  BarChart3,
  LogOut,
  Network,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/empleados", label: "Empleados", icon: UserCog, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/inventario", label: "Inventario", icon: HardDrive, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/facturacion", label: "Facturación", icon: Receipt, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/soporte", label: "Soporte", icon: Headset, roles: ["administrador", "supervisor", "tecnico", "cliente"] },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3, roles: ["administrador", "supervisor"] },
];

const rolLabels: Record<string, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  tecnico: "Técnico",
  cliente: "Cliente",
};

const rolBadgeColors: Record<string, string> = {
  administrador: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  supervisor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  tecnico: "bg-green-500/20 text-green-300 border-green-500/30",
  cliente: "bg-purple-500/20 text-purple-300 border-purple-500/30",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) { router.push("/login"); return; }
    setUser(u);
  }, [router]);

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  if (!user) return null;

  const filteredNav = navItems.filter((item) => item.roles.includes(user.rol));
  const currentNav = filteredNav.find(
    (n) => pathname === n.href || (n.href !== "/dashboard" && pathname.startsWith(n.href))
  );

  const initials = user.nombre
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-[oklch(0.975_0.003_247)]">
      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "linear-gradient(180deg, #0f1f33 0%, #1a2f4a 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 shadow-lg">
              <Network className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold text-white">Alesof</span>
              <p className="text-[10px] text-slate-400 -mt-0.5">Perú S.A.C.</p>
            </div>
          </div>
          <button
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Divider */}
        <div className="mx-5 h-px bg-white/10" />

        {/* Nav section label */}
        <p className="mt-4 mb-1 px-5 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
          Navegación
        </p>

        {/* Nav items */}
        <nav className="flex-1 space-y-0.5 px-3 pb-4">
          {filteredNav.map((item) => {
            const active =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? "bg-orange-500 text-white shadow-lg shadow-orange-500/25"
                    : "text-slate-400 hover:bg-white/8 hover:text-white"
                }`}
              >
                <item.icon className={`h-4.5 w-4.5 flex-shrink-0 ${active ? "text-white" : "text-slate-500 group-hover:text-slate-300"}`} />
                <span className="flex-1">{item.label}</span>
                {active && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
              </Link>
            );
          })}
        </nav>

        {/* Bottom user card */}
        <div className="mx-3 mb-4">
          <div className="rounded-xl bg-white/6 p-3 border border-white/8">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-9 w-9 ring-2 ring-orange-500/40">
                <AvatarFallback className="bg-gradient-to-br from-orange-500 to-orange-600 text-white text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.nombre.split(" ")[0]} {user.nombre.split(" ")[1]}</p>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium border ${rolBadgeColors[user.rol]}`}>
                  {rolLabels[user.rol]}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/6 px-3 py-2 text-xs font-medium text-slate-400 hover:bg-red-500/15 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-14 items-center justify-between border-b border-border/60 bg-white/80 backdrop-blur-sm px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:block">Panel /</span>
              <h1 className="text-sm font-semibold text-foreground">
                {currentNav?.label ?? "Panel"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-600 border border-green-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Sistema operativo
            </div>
            <Avatar className="h-8 w-8 cursor-pointer ring-2 ring-orange-500/30">
              <AvatarFallback className="bg-gradient-to-br from-[#1e3a5f] to-[#2d5087] text-white text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

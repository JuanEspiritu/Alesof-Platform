"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { getUser, clearAuth, type User } from "@/lib/auth";
import {
  applyPreferences,
  getPreferences,
  savePreferences,
  type AppPreferences,
} from "@/lib/preferences";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  DatabaseBackup,
  Gauge,
  HardDrive,
  FileCheck2,
  FolderKanban,
  Headset,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorCog,
  Network,
  Receipt,
  Radio,
  Server,
  Settings,
  ShieldCheck,
  ShieldAlert,
  UserCog,
  Users,
  X,
} from "lucide-react";

interface NotificationItem {
  id: string;
  type: "critical" | "warning" | "info" | "success";
  title: string;
  message: string;
  href: string;
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/noc", label: "NOC Live", icon: Activity, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/alertas", label: "Alert Center", icon: ShieldAlert, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/hypervisores", label: "Hipervisores", icon: MonitorCog, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/vms", label: "VM Control", icon: HardDrive, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/red", label: "Network Health", icon: Radio, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/dispositivos", label: "Dispositivos", icon: Server, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/agentes", label: "Agente Hibrido", icon: Bot, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/riesgo", label: "Riesgo", icon: Gauge, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/sedes", label: "Sedes", icon: Building2, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/servicios", label: "Servicios TI", icon: BriefcaseBusiness, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/contratos", label: "Contratos SLA", icon: FileCheck2, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/proyectos", label: "Proyectos", icon: FolderKanban, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/backups", label: "Backups", icon: DatabaseBackup, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/seguridad", label: "Seguridad", icon: ShieldCheck, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/clientes", label: "Clientes", icon: Users, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/empleados", label: "Empleados", icon: UserCog, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/inventario", label: "Inventario", icon: Server, roles: ["administrador", "supervisor", "tecnico"] },
  { href: "/dashboard/facturacion", label: "Facturacion", icon: Receipt, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/soporte", label: "Soporte", icon: Headset, roles: ["administrador", "supervisor", "tecnico", "cliente"] },
  { href: "/dashboard/reportes", label: "Reportes", icon: BarChart3, roles: ["administrador", "supervisor"] },
  { href: "/dashboard/configuracion", label: "Configuracion", icon: Settings, roles: ["administrador", "supervisor", "tecnico", "cliente"] },
];

const rolLabels: Record<string, string> = {
  administrador: "Administrador",
  supervisor: "Supervisor",
  tecnico: "Tecnico",
  cliente: "Cliente",
};

const roleHome: Record<string, string> = {
  administrador: "/dashboard",
  supervisor: "/dashboard",
  tecnico: "/dashboard/soporte",
  cliente: "/dashboard/soporte",
};

const toneMap = {
  critical: "border-red-200 bg-red-50 text-red-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user] = useState<User | null>(() => getUser());
  const [preferences, setPreferences] = useState<AppPreferences>(() => getPreferences());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    applyPreferences(preferences);
    window.dispatchEvent(new CustomEvent("alesof-preferences", { detail: preferences }));
  }, [preferences]);

  useEffect(() => {
    const handlePreferences = (event: Event) => {
      const next = (event as CustomEvent<AppPreferences>).detail;
      if (next) setPreferences(next);
    };
    window.addEventListener("alesof-preferences", handlePreferences);
    return () => window.removeEventListener("alesof-preferences", handlePreferences);
  }, []);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [router, user]);

  useEffect(() => {
    if (!user) return;
    const allowed = navItems.filter((item) => item.roles.includes(user.rol));
    const canViewCurrent = allowed.some(
      (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
    );
    if (!canViewCurrent && allowed[0]) {
      router.replace(roleHome[user.rol] ?? allowed[0].href);
    }
  }, [pathname, router, user]);

  useEffect(() => {
    if (!user || !preferences.notificationsEnabled) return;
    let active = true;
    api.get("/api/reportes/notificaciones")
      .then(({ data }) => {
        if (active) setNotifications(data);
      })
      .catch(() => {
        if (active) setNotifications([]);
      });
    return () => {
      active = false;
    };
  }, [user, pathname, preferences.notificationsEnabled]);

  if (!user) return null;

  const collapsed = preferences.sidebarCollapsed;
  const filteredNav = navItems.filter((item) => item.roles.includes(user.rol));
  const currentNav = filteredNav.find(
    (item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)),
  );
  const initials = user.nombre
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const activeAlerts = notifications.filter((item) => item.type === "critical" || item.type === "warning").length;
  const status = !preferences.notificationsEnabled
    ? { label: "Notificaciones pausadas", tone: "bg-slate-100 text-slate-600 border-slate-200" }
    : notifications.some((item) => item.type === "critical")
      ? { label: "Atencion requerida", tone: "bg-red-50 text-red-700 border-red-200" }
      : notifications.some((item) => item.type === "warning")
        ? { label: "Pendientes operativos", tone: "bg-amber-50 text-amber-700 border-amber-200" }
        : { label: "Operacion estable", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" };

  function updatePreferences(next: Partial<AppPreferences>) {
    const updated = { ...preferences, ...next };
    setPreferences(updated);
    savePreferences(updated);
  }

  function handleLogout() {
    clearAuth();
    router.push("/login");
  }

  return (
    <div className="dashboard-shell min-h-screen text-[var(--app-text)]" style={{ background: "var(--app-bg)" }}>
      {sidebarOpen && (
        <button
          aria-label="Cerrar menu"
          className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col border-r shadow-xl shadow-slate-950/5 transition-all duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-[84px]" : "lg:w-[280px]"} w-[280px]`}
        style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}
      >
        <div className="flex h-16 items-center justify-between border-b px-5" style={{ borderColor: "var(--app-border)" }}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: "var(--app-brand)" }}>
              <Network className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-black leading-none">Alesof Platform</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: "var(--app-muted)" }}>Operaciones IT</p>
              </div>
            )}
          </Link>
          <button className="rounded-lg p-2 hover:opacity-80 lg:hidden" style={{ color: "var(--app-muted)" }} onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center justify-between px-4 py-3">
          {!collapsed && (
            <p className="text-[11px] font-black uppercase tracking-[0.18em]" style={{ color: "var(--app-muted)" }}>
              Modulos
            </p>
          )}
          <button
            type="button"
            onClick={() => updatePreferences({ sidebarCollapsed: !collapsed })}
            className="hidden rounded-lg border p-2 hover:opacity-80 lg:flex"
            style={{ background: "var(--app-surface-soft)", borderColor: "var(--app-border)", color: "var(--app-muted)" }}
            title={collapsed ? "Mostrar modulos" : "Ocultar modulos"}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {filteredNav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => setSidebarOpen(false)}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-bold hover:opacity-90 ${
                  active ? "shadow-sm" : ""
                } ${collapsed ? "justify-center px-0" : ""}`}
                style={active
                  ? { background: "var(--app-brand)", color: "#ffffff" }
                  : { color: "var(--app-muted)" }}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {active && !collapsed && <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--app-accent)" }} />}
              </Link>
            );
          })}
        </nav>

        <div className="border-t p-3" style={{ borderColor: "var(--app-border)" }}>
          {!collapsed && (
            <div className={`mb-3 rounded-xl border px-3 py-2 text-xs font-bold ${status.tone}`}>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-current" />
                <span>{status.label}</span>
              </div>
            </div>
          )}
          <div className={`flex items-center gap-3 rounded-xl p-3 ${collapsed ? "justify-center" : ""}`} style={{ background: "var(--app-surface-soft)" }}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-xs font-black text-white" style={{ background: "var(--app-brand)" }}>{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black">{user.nombre}</p>
                <p className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>{rolLabels[user.rol]}</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-black hover:bg-red-50 hover:text-red-600"
              style={{ color: "var(--app-muted)" }}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesion
            </button>
          )}
        </div>
      </aside>

      <div className={`transition-all duration-300 ${collapsed ? "lg:pl-[84px]" : "lg:pl-[280px]"}`}>
        <header className="sticky top-0 z-30 border-b px-4 backdrop-blur lg:px-7" style={{ background: "color-mix(in srgb, var(--app-surface) 92%, transparent)", borderColor: "var(--app-border)" }}>
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button className="rounded-xl border p-2.5 shadow-sm lg:hidden" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", color: "var(--app-muted)" }} onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--app-muted)" }}>
                  Panel <ChevronRight className="h-3 w-3" /> {currentNav?.label ?? "Vista"}
                </div>
                <h1 className="mt-0.5 truncate text-xl font-black tracking-tight">{currentNav?.label ?? "Panel"}</h1>
              </div>
            </div>

            <div className="relative flex items-center gap-2">
              <Badge className={`hidden rounded-full border px-3 py-1.5 sm:inline-flex ${status.tone}`}>
                <span className="mr-2 h-1.5 w-1.5 rounded-full bg-current" />
                {status.label}
              </Badge>
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border shadow-sm hover:opacity-85"
                style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", color: "var(--app-muted)" }}
                aria-label="Ver notificaciones"
              >
                <Bell className="h-4 w-4" />
                {activeAlerts > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">
                    {activeAlerts}
                  </span>
                )}
              </button>
              <Avatar className="h-10 w-10 border-2 shadow-sm" style={{ borderColor: "var(--app-surface)" }}>
                <AvatarFallback className="text-xs font-black text-white" style={{ background: "var(--app-brand)" }}>{initials}</AvatarFallback>
              </Avatar>

              {notificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border p-3 shadow-2xl shadow-slate-950/15" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
                  <div className="flex items-center justify-between px-2 py-2">
                    <div>
                      <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>Notificaciones</p>
                      <p className="text-xs" style={{ color: "var(--app-muted)" }}>Eventos reales del sistema</p>
                    </div>
                    <button className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" onClick={() => setNotificationsOpen(false)}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-96 space-y-2 overflow-y-auto p-1">
                    {(preferences.notificationsEnabled ? notifications : []).map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={() => setNotificationsOpen(false)}
                        className={`block rounded-xl border p-3 ${toneMap[item.type]}`}
                      >
                        <div className="flex items-start gap-3">
                          {item.type === "critical" ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
                          <div>
                            <p className="text-sm font-black">{item.title}</p>
                            <p className="mt-1 text-xs opacity-80">{item.message}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                    {!preferences.notificationsEnabled && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                        Las notificaciones estan pausadas desde Configuracion.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

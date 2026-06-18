"use client";

import { useEffect, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import { toast } from "sonner";
import { getUser } from "@/lib/auth";
import {
  applyPreferences,
  defaultPreferences,
  getPreferences,
  savePreferences,
  themes,
  type AppPreferences,
} from "@/lib/preferences";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  CheckCircle2,
  Eye,
  LayoutPanelLeft,
  MonitorCog,
  Palette,
  ShieldCheck,
  UserRound,
} from "lucide-react";

export default function ConfiguracionPage() {
  const [preferences, setPreferences] = useState<AppPreferences>(() => getPreferences());
  const user = getUser();

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  function updatePreferences(next: Partial<AppPreferences>) {
    const updated = { ...preferences, ...next };
    setPreferences(updated);
    savePreferences(updated);
    window.dispatchEvent(new CustomEvent("alesof-preferences", { detail: updated }));
    toast.success("Preferencias actualizadas");
  }

  function resetPreferences() {
    setPreferences(defaultPreferences);
    savePreferences(defaultPreferences);
    toast.success("Configuración restaurada");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[1.5rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-teal-100">
              <MonitorCog className="h-3.5 w-3.5" />
              Centro de configuración
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight">Preferencias de la plataforma</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Personaliza apariencia, lectura, módulos visibles y notificaciones operativas sin afectar los datos del sistema.
            </p>
          </div>
          <button
            type="button"
            onClick={resetPreferences}
            className="h-11 rounded-2xl border border-white/10 bg-white/8 px-5 text-sm font-black text-white hover:bg-white/12"
          >
            Restaurar valores
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm" style={{ borderColor: "var(--app-border)" }}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ background: "var(--app-brand)" }}>
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-950">Tema visual</h2>
                <p className="text-xs text-slate-500">Elige entre Light, Dark y Classic.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {themes.map((theme) => {
                const active = preferences.theme === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => updatePreferences({ theme: theme.id })}
                    className="rounded-2xl border p-4 text-left shadow-sm hover:-translate-y-1 hover:shadow-lg"
                    style={{
                      background: active ? "var(--app-surface-soft)" : "var(--app-surface)",
                      borderColor: active ? "var(--app-accent)" : "var(--app-border)",
                      boxShadow: active
                        ? "0 0 0 4px color-mix(in srgb, var(--app-accent) 18%, transparent)"
                        : undefined,
                    }}
                  >
                    <div className="mb-5 flex items-center justify-between">
                      <div className="flex -space-x-2">
                        {theme.swatches.map((color) => (
                          <span
                            key={color}
                            className="h-7 w-7 rounded-full border-2"
                            style={{ background: color, borderColor: "var(--app-surface)" }}
                          />
                        ))}
                      </div>
                      {active && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                    </div>
                    <p className="text-sm font-black text-slate-950">{theme.name}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{theme.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm" style={{ borderColor: "var(--app-border)" }}>
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: "var(--app-surface-soft)", color: "var(--app-text)" }}
              >
                <LayoutPanelLeft className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-950">Módulos y lectura</h2>
                <p className="text-xs text-slate-500">Controla la navegación y densidad visual del panel.</p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <PreferenceCard
                icon={LayoutPanelLeft}
                title="Ocultar módulos"
                text="Contrae la barra lateral en escritorio para ganar espacio."
                active={preferences.sidebarCollapsed}
                onClick={() => updatePreferences({ sidebarCollapsed: !preferences.sidebarCollapsed })}
              />
              <PreferenceCard
                icon={Eye}
                title="Vista compacta"
                text="Reduce densidad para tablas y pantallas operativas."
                active={preferences.density === "compact"}
                onClick={() => updatePreferences({ density: preferences.density === "compact" ? "comfortable" : "compact" })}
              />
              <PreferenceCard
                icon={Bell}
                title="Notificaciones"
                text="Activa o pausa alertas de tickets, facturas y equipos."
                active={preferences.notificationsEnabled}
                onClick={() => updatePreferences({ notificationsEnabled: !preferences.notificationsEnabled })}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm" style={{ borderColor: "var(--app-border)" }}>
            <div className="mb-6 flex items-center gap-3">
              <AvatarBlock name={user?.nombre ?? "Usuario"} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950">{user?.nombre ?? "Usuario"}</p>
                <p className="text-xs font-semibold text-slate-500">{user?.email ?? "Sin correo"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <InfoRow label="Rol" value={user?.rol ?? "-"} />
              <InfoRow label="Autenticación" value="JWT + refresh token" />
              <InfoRow label="Alcance" value="Permisos por rol" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border bg-white p-5 shadow-sm" style={{ borderColor: "var(--app-border)" }}>
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-black text-slate-950">Información operativa</h2>
            </div>
            <div className="space-y-3 text-sm leading-6 text-slate-600">
              <p>Los indicadores provienen de la API local: tickets, facturación, inventario y clientes.</p>
              <p>Las notificaciones se calculan por rol, para evitar mostrar módulos no autorizados.</p>
              <p>Los temas se guardan en este navegador y no modifican la base de datos.</p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}

function PreferenceCard({
  icon: Icon,
  title,
  text,
  active,
  onClick,
}: {
  icon: ComponentType<{ className?: string; style?: CSSProperties }>;
  title: string;
  text: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-2xl border p-4 text-left shadow-sm hover:-translate-y-1 hover:shadow-lg"
      style={{
        background: active ? "var(--app-brand)" : "var(--app-surface)",
        borderColor: active ? "var(--app-brand)" : "var(--app-border)",
        color: active ? "#ffffff" : "var(--app-text)",
      }}
    >
      <div className="mb-6 flex items-center justify-between">
        <Icon className="h-5 w-5" style={{ color: active ? "#99f6e4" : "var(--app-muted)" }} />
        <Badge className={active ? "bg-teal-200 text-slate-950 hover:bg-teal-200" : "bg-slate-100 text-slate-500 hover:bg-slate-100"}>
          {active ? "Activo" : "Off"}
        </Badge>
      </div>
      <p className="text-sm font-black">{title}</p>
      <p className="mt-2 text-xs leading-5" style={{ color: active ? "rgba(255, 255, 255, 0.82)" : "var(--app-muted)" }}>
        {text}
      </p>
    </button>
  );
}

function AvatarBlock({ name }: { name: string }) {
  const initials = name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return (
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xs font-black text-white" style={{ background: "var(--app-brand)" }}>
      {initials || <UserRound className="h-5 w-5" />}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl px-4 py-3" style={{ background: "var(--app-surface-soft)" }}>
      <span className="text-xs font-bold" style={{ color: "var(--app-muted)" }}>{label}</span>
      <span className="text-xs font-black capitalize" style={{ color: "var(--app-text)" }}>{value}</span>
    </div>
  );
}

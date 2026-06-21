"use client";

import { useEffect, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
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
  Vibrate,
  Volume2,
} from "lucide-react";

type IntegrationStatus = Record<string, { configured: boolean }>;

export default function ConfiguracionPage() {
  const [preferences, setPreferences] = useState<AppPreferences>(() => getPreferences());
  const [integrations, setIntegrations] = useState<IntegrationStatus>({});
  const user = getUser();

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    api.get<IntegrationStatus>("/api/integrations/status").then(({ data }) => setIntegrations(data)).catch(() => setIntegrations({}));
  }, []);

  async function syncIntegration(name: "aws" | "veeam") {
    try {
      await api.post(`/api/integrations/${name}/sync`);
      toast.success(`${name.toUpperCase()} sincronizado`);
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Integracion no disponible");
    }
  }

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
          <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl text-white" style={{ background: "var(--app-brand)" }}>
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Tema visual</h2>
                <p className="text-xs" style={{ color: "var(--app-muted)" }}>Elige entre Light, Dark y Classic.</p>
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
                    <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{theme.name}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: "var(--app-muted)" }}>{theme.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}>
            <div className="mb-5 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: "var(--app-surface-soft)", color: "var(--app-text)" }}
              >
                <LayoutPanelLeft className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Módulos y lectura</h2>
                <p className="text-xs" style={{ color: "var(--app-muted)" }}>Controla la navegación y densidad visual del panel.</p>
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
              <PreferenceCard
                icon={Volume2}
                title="Sonido NOC"
                text="Reproduce alarma cuando llega una alerta critica."
                active={preferences.soundEnabled}
                onClick={() => updatePreferences({ soundEnabled: !preferences.soundEnabled })}
              />
              <PreferenceCard
                icon={Vibrate}
                title="Vibracion"
                text="Vibra en celulares compatibles ante eventos prioritarios."
                active={preferences.vibrationEnabled}
                onClick={() => updatePreferences({ vibrationEnabled: !preferences.vibrationEnabled })}
              />
              <div className="rounded-2xl border p-4" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
                <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>Actualizacion NOC</p>
                <p className="mt-2 text-xs leading-5" style={{ color: "var(--app-muted)" }}>Intervalo de respaldo cuando WebSocket no esta disponible.</p>
                <div className="mt-4 flex gap-2">
                  {[5, 7, 10, 15].map((seconds) => (
                    <button key={seconds} type="button" onClick={() => updatePreferences({ nocRefreshSeconds: seconds })}
                      className="h-8 flex-1 rounded-lg text-xs font-black"
                      style={{ background: preferences.nocRefreshSeconds === seconds ? "var(--app-brand)" : "var(--app-surface-soft)", color: preferences.nocRefreshSeconds === seconds ? "#fff" : "var(--app-text)" }}>
                      {seconds}s
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}>
            <div className="mb-6 flex items-center gap-3">
              <AvatarBlock name={user?.nombre ?? "Usuario"} />
              <div className="min-w-0">
                <p className="truncate text-sm font-black" style={{ color: "var(--app-text)" }}>{user?.nombre ?? "Usuario"}</p>
                <p className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>{user?.email ?? "Sin correo"}</p>
              </div>
            </div>
            <div className="space-y-3">
              <InfoRow label="Rol" value={user?.rol ?? "-"} />
              <InfoRow label="Autenticación" value="JWT + refresh token" />
              <InfoRow label="Alcance" value="Permisos por rol" />
            </div>
          </div>

          <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}>
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Información operativa</h2>
            </div>
            <div className="space-y-3 text-sm leading-6" style={{ color: "var(--app-muted)" }}>
              <p>Los indicadores provienen de la API local: tickets, facturación, inventario y clientes.</p>
              <p>Las notificaciones se calculan por rol, para evitar mostrar módulos no autorizados.</p>
              <p>Los temas se guardan en este navegador y no modifican la base de datos.</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ borderColor: "var(--app-border)", background: "var(--app-surface)" }}>
            <div className="mb-5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" style={{ color: "var(--app-accent)" }} />
              <div>
                <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Integraciones reales</h2>
                <p className="text-xs" style={{ color: "var(--app-muted)" }}>Estado leído desde el backend.</p>
              </div>
            </div>
            <div className="space-y-2">
              {Object.entries(integrations).map(([name, state]) => (
                <div key={name} className="flex items-center justify-between rounded-xl px-3 py-2.5" style={{ background: "var(--app-surface-soft)" }}>
                  <span className="text-xs font-black uppercase" style={{ color: "var(--app-text)" }}>{name.replaceAll("_", " ")}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${state.configured ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-300 bg-slate-100 text-slate-600"}`}>
                    {state.configured ? "Configurado" : "Pendiente"}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => syncIntegration("aws")} className="h-9 rounded-xl text-xs font-black text-white" style={{ background: "var(--app-brand)" }}>Sincronizar AWS</button>
              <button type="button" onClick={() => syncIntegration("veeam")} className="h-9 rounded-xl text-xs font-black text-white" style={{ background: "var(--app-accent)" }}>Sincronizar Veeam</button>
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, AlertTriangle, CheckCircle2, Network, Play, Power, RefreshCw,
  Search, Server, ShieldAlert, Wifi,
} from "lucide-react";

export type OperationsKind = "hypervisors" | "vms" | "network" | "devices" | "services" | "alerts" | "agents" | "risk" | "sla" | "backups" | "security";

const config = {
  hypervisors: { title: "Hypervisor Monitor", description: "Estado de ESXi y vCenter, capacidad, datastores y VMs.", endpoint: "/api/hypervisors", icon: Server },
  vms: { title: "VM Control Center", description: "Control autorizado de maquinas virtuales y servicios asociados.", endpoint: "/api/vms", icon: Power },
  network: { title: "Network Health", description: "Salud de sedes, enlaces, DNS, puertos y servicios publicados.", endpoint: "/api/network/health", icon: Network },
  devices: { title: "Device Monitor", description: "Routers, switches, access point y hosts fisicos permitidos.", endpoint: "/api/devices", icon: Wifi },
  services: { title: "Servicios TI", description: "Servicios CORE, internos, DMZ y AWS relacionados con VMs y SLA.", endpoint: "/api/services", icon: Activity },
  alerts: { title: "Alert Center", description: "Reconocimiento, resolucion, asignacion y tickets desde alertas.", endpoint: "/api/alerts", icon: ShieldAlert },
  agents: { title: "Hybrid Agent", description: "Estado y capacidades del recolector ALESOF-AGENT-LIMA.", endpoint: "/api/agents", icon: Activity },
  risk: { title: "Risk Score", description: "Riesgo operativo de plataforma, DMZ, AWS y sedes.", endpoint: "/api/risk", icon: AlertTriangle },
  sla: { title: "SLA Impact", description: "Contratos, disponibilidad comprometida, riesgo y penalidad estimada.", endpoint: "/api/sla", icon: CheckCircle2 },
  backups: { title: "Backups y continuidad", description: "Jobs persistentes, RTO, RPO y pruebas de restauracion.", endpoint: "/api/backups", icon: RefreshCw },
  security: { title: "Seguridad y cumplimiento", description: "Controles, evidencia, riesgo y auditoria operativa.", endpoint: "/api/security/controls", icon: ShieldAlert },
} satisfies Record<OperationsKind, { title: string; description: string; endpoint: string; icon: typeof Activity }>;

function flatten(kind: OperationsKind, payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  const object = payload as Record<string, unknown>;
  if (kind === "network") {
    return [
      ...((object.sites as Record<string, unknown>[]) ?? []).map((item) => ({ ...item, resource_type: "SITE" })),
      ...((object.devices as Record<string, unknown>[]) ?? []).map((item) => ({ ...item, resource_type: "DEVICE" })),
      ...((object.checks as Record<string, unknown>[]) ?? []).map((item) => ({ ...item, resource_type: "CHECK" })),
    ];
  }
  if (kind === "risk") {
    const rows: Record<string, unknown>[] = [{ id: "platform", name: "Plataforma", score: object.score, status: object.level }];
    for (const site of (object.sites as Record<string, unknown>[]) ?? []) rows.push({ id: `site-${site.site}`, name: site.site, score: site.score, status: site.level });
    rows.push({ id: "dmz", name: "DMZ VLAN90", score: object.dmz, status: riskLevel(Number(object.dmz ?? 0)) });
    rows.push({ id: "aws", name: "AWS", score: object.aws, status: riskLevel(Number(object.aws ?? 0)) });
    return rows;
  }
  return [];
}

function riskLevel(score: number) {
  return score <= 30 ? "Bajo" : score <= 60 ? "Medio" : score <= 80 ? "Alto" : "Critico";
}

function label(item: Record<string, unknown>) {
  return String(item.name ?? item.title ?? item.affected_resource ?? item.resource ?? `Registro #${item.id}`);
}

function state(item: Record<string, unknown>) {
  return String(item.status ?? item.power_state ?? item.level ?? "INFO");
}

function displayState(kind: OperationsKind, item: Record<string, unknown>) {
  return kind === "sla" ? (item.at_risk ? "Con riesgo" : "Vigente") : state(item);
}

const statusTone: Record<string, string> = {
  ONLINE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  poweredOn: "border-emerald-200 bg-emerald-50 text-emerald-700",
  ACTIVE: "border-red-200 bg-red-50 text-red-700",
  ACKNOWLEDGED: "border-amber-200 bg-amber-50 text-amber-700",
  OFFLINE: "border-red-200 bg-red-50 text-red-700",
  poweredOff: "border-red-200 bg-red-50 text-red-700",
  WARNING: "border-amber-200 bg-amber-50 text-amber-700",
  Critico: "border-red-200 bg-red-50 text-red-700",
  Alto: "border-orange-200 bg-orange-50 text-orange-700",
  Medio: "border-amber-200 bg-amber-50 text-amber-700",
  Bajo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Vigente: "border-emerald-200 bg-emerald-50 text-emerald-700",
  "Con riesgo": "border-red-200 bg-red-50 text-red-700",
};

export function OperationsPage({ kind }: { kind: OperationsKind }) {
  const cfg = config[kind];
  const Icon = cfg.icon;
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const user = getUser();

  async function load() {
    try {
      const { data } = await api.get(cfg.endpoint);
      setItems(flatten(kind, data));
    } catch {
      toast.error(`No se pudo cargar ${cfg.title}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    api.get(cfg.endpoint).then(({ data }) => active && setItems(flatten(kind, data))).catch(() => toast.error(`No se pudo cargar ${cfg.title}`)).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [cfg.endpoint, cfg.title, kind]);

  const filtered = useMemo(() => items.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase())), [items, query]);
  const online = items.filter((item) => ["ONLINE", "poweredOn", "RESOLVED", "Bajo", "Vigente"].includes(displayState(kind, item))).length;
  const critical = items.filter((item) => ["OFFLINE", "poweredOff", "ACTIVE", "CRITICAL", "Critico", "Con riesgo"].includes(displayState(kind, item))).length;

  async function action(path: string, success: string, confirmation?: string) {
    if (confirmation && !window.confirm(confirmation)) return;
    try {
      await api.post(path);
      toast.success(success);
      await load();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "La accion no pudo completarse");
    }
  }

  if (loading) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>;

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] border p-6 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ background: "var(--app-brand)" }}><Icon className="h-5 w-5" /></div>
            <h1 className="mt-5 text-4xl font-black" style={{ color: "var(--app-text)" }}>{cfg.title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: "var(--app-muted)" }}>{cfg.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Metric value={items.length} label="Recursos" />
            <Metric value={online} label="Saludables" />
            <Metric value={critical} label="Atencion" critical={critical > 0} />
          </div>
        </div>
      </section>

      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--app-muted)" }} /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar recurso, IP, VLAN, sede o estado" className="h-12 rounded-2xl pl-11" /></div>

      <section className="grid gap-4 xl:grid-cols-2">
        {filtered.map((item, index) => {
          const itemState = displayState(kind, item);
          const id = Number(item.id ?? index);
          return (
            <article key={`${kind}-${id}-${index}`} className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone[itemState] ?? "border-sky-200 bg-sky-50 text-sky-700"}`}>{itemState}</span><h2 className="mt-3 truncate text-lg font-black" style={{ color: "var(--app-text)" }}>{label(item)}</h2><p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>{String(item.service_name ?? item.description ?? item.device_type ?? item.resource_type ?? item.source ?? "Alesof Platform")}</p></div>
                {itemState === "ONLINE" || itemState === "poweredOn" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {Object.entries(item).filter(([key, value]) => !["id", "name", "title", "description", "status", "power_state"].includes(key) && value !== null && typeof value !== "object").slice(0, 6).map(([key, value]) => <Data key={key} label={key.replaceAll("_", " ")} value={String(value)} />)}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {kind === "vms" && user?.permissions?.includes("can_power_on_vm") && itemState !== "poweredOn" && <Action label="Encender" onClick={() => action(`/api/vms/${id}/power-on?confirm=true`, "VM encendida", `¿Encender ${label(item)} en VMware?`)} />}
                {kind === "vms" && user?.permissions?.includes("can_restart_vm") && itemState === "poweredOn" && <Action label="Reiniciar" onClick={() => action(`/api/vms/${id}/restart?confirm=true`, "VM reiniciada", `¿Reiniciar ${label(item)} en VMware? El servicio se interrumpira.`)} />}
                {kind === "vms" && user?.permissions?.includes("can_power_off_vm") && itemState === "poweredOn" && <Action label="Apagar" danger onClick={() => action(`/api/vms/${id}/power-off?confirm=true`, "VM apagada", `¿Apagar ${label(item)} en VMware? Esta accion afecta servicios.`)} />}
                {kind === "devices" && user?.permissions?.includes("can_run_network_tests") && <Action label="Probar conectividad" onClick={() => action(`/api/devices/${id}/ping`, "Prueba completada")} />}
                {kind === "hypervisors" && user?.permissions?.includes("can_run_network_tests") && <Action label="Probar host" onClick={() => action(`/api/hypervisors/${id}/ping`, "Host verificado")} />}
                {kind === "hypervisors" && user?.permissions?.includes("can_manage_vms") && <Action label="Sincronizar VMware" onClick={() => action(`/api/hypervisors/${id}/sync`, "Inventario VMware sincronizado")} />}
                {kind === "alerts" && itemState === "ACTIVE" && user?.permissions?.includes("can_acknowledge_alert") && <Action label="Reconocer" onClick={() => action(`/api/alerts/${id}/acknowledge`, "Alerta reconocida")} />}
                {kind === "alerts" && itemState !== "RESOLVED" && user?.permissions?.includes("can_resolve_alert") && <Action label="Resolver" onClick={() => action(`/api/alerts/${id}/resolve`, "Alerta resuelta")} />}
                {kind === "alerts" && user?.permissions?.includes("can_create_ticket") && <Action label="Crear ticket" onClick={() => action(`/api/alerts/${id}/create-ticket`, "Ticket relacionado")} />}
                {kind === "alerts" && itemState !== "RESOLVED" && user?.permissions?.includes("can_acknowledge_alert") && <Action label="Escalar" danger onClick={() => action(`/api/alerts/${id}/notify`, "Escalamiento procesado", `¿Enviar esta alerta por las integraciones configuradas?`)} />}
                {kind === "backups" && user?.permissions?.includes("can_manage_services") && <Action label="Ejecutar" onClick={() => action(`/api/backups/${id}/simulate-run`, "Backup completado")} />}
                {kind === "backups" && user?.permissions?.includes("can_manage_services") && <Action label="Marcar restore" onClick={() => action(`/api/backups/${id}/mark-tested`, "Prueba registrada")} />}
              </div>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function Metric({ value, label, critical = false }: { value: number; label: string; critical?: boolean }) { return <div className="rounded-2xl p-4" style={{ background: critical ? "#dc2626" : "var(--app-surface-soft)", color: critical ? "white" : "var(--app-text)" }}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[11px] font-bold opacity-70">{label}</p></div>; }
function Data({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl px-3 py-2.5" style={{ background: "var(--app-surface-soft)" }}><p className="truncate text-[10px] font-black uppercase" style={{ color: "var(--app-muted)" }}>{label}</p><p className="mt-1 truncate text-xs font-bold" style={{ color: "var(--app-text)" }}>{value}</p></div>; }
function Action({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black text-white" style={{ background: danger ? "#dc2626" : "var(--app-brand)" }}><Play className="h-3.5 w-3.5" />{label}</button>; }

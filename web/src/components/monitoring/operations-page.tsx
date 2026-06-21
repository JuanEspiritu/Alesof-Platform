"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Loader2, Network, Play, Power, RefreshCw,
  Search, Server, ShieldAlert, Wifi,
} from "lucide-react";

export type OperationsKind = "hypervisors" | "vms" | "network" | "devices" | "services" | "alerts" | "agents" | "risk" | "sla" | "backups" | "security";

const config = {
  hypervisors: { title: "Hipervisores", description: "Estado de ESXi y vCenter, capacidad, datastores y VMs.", endpoint: "/api/hypervisors", icon: Server },
  vms: { title: "Control de maquinas virtuales", description: "Control autorizado de maquinas virtuales y servicios asociados.", endpoint: "/api/vms", icon: Power },
  network: { title: "Salud de red", description: "Salud de sedes, enlaces, DNS, puertos y servicios publicados.", endpoint: "/api/network/health", icon: Network },
  devices: { title: "Dispositivos", description: "Routers, switches y puntos de acceso administrados.", endpoint: "/api/devices", icon: Wifi },
  services: { title: "Servicios TI", description: "Servicios CORE, internos, DMZ y AWS relacionados con VMs y SLA.", endpoint: "/api/services", icon: Activity },
  alerts: { title: "Centro de alertas", description: "Reconocimiento, resolucion, asignacion y tickets desde alertas.", endpoint: "/api/alerts", icon: ShieldAlert },
  agents: { title: "Agente hibrido", description: "Estado y capacidades del recolector ALESOF-AGENT-LIMA.", endpoint: "/api/agents", icon: Activity },
  risk: { title: "Riesgo operativo", description: "Riesgo operativo de plataforma, DMZ, AWS y sedes.", endpoint: "/api/risk", icon: AlertTriangle },
  sla: { title: "Impacto SLA", description: "Contratos, disponibilidad comprometida, riesgo y penalidad estimada.", endpoint: "/api/sla", icon: CheckCircle2 },
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

const fieldLabels: Record<string, string> = {
  site: "Sede", hypervisor: "Hipervisor", ip: "Direccion IP", operating_system: "Sistema operativo",
  cpu_count: "vCPU", ram_gb: "Memoria RAM", disk_gb: "Disco", vlan: "VLAN", criticality: "Criticidad",
  brand: "Fabricante", model: "Modelo", latency_ms: "Latencia", management_port: "Puerto de gestion",
  version: "Version", vm_count: "Maquinas virtuales", cpu_percent: "CPU", ram_percent: "Memoria",
  datastore_percent: "Datastore", last_heartbeat: "Ultimo heartbeat", capabilities: "Capacidades",
  last_check: "Ultima comprobacion", management_ip: "IP de gestion",
};

const preferredFields: Partial<Record<OperationsKind, string[]>> = {
  vms: ["hypervisor", "site", "ip", "operating_system", "cpu_count", "ram_gb", "disk_gb", "vlan", "criticality"],
  devices: ["site", "ip", "brand", "model", "last_check", "latency_ms", "management_port", "criticality"],
  hypervisors: ["site", "management_ip", "version", "vm_count", "last_check", "cpu_percent", "ram_percent", "datastore_percent"],
  agents: ["site", "version", "ip", "last_heartbeat", "capabilities"],
};

function visibleData(kind: OperationsKind, item: Record<string, unknown>) {
  const preferred = preferredFields[kind];
  if (preferred) return preferred.filter((key) => item[key] !== null && item[key] !== undefined).map((key) => [key, item[key]] as const).slice(0, 6);
  return Object.entries(item).filter(([key, value]) => !["id", "name", "title", "description", "status", "power_state", "site_id", "hypervisor_id"].includes(key) && value !== null && typeof value !== "object").slice(0, 6);
}

function formatFieldValue(key: string, value: unknown) {
  if (Array.isArray(value)) return value.join(", ");
  if (key === "last_check" || key === "last_heartbeat") return new Date(String(value)).toLocaleString();
  if (key === "latency_ms") return `${value} ms`;
  if (["cpu_percent", "ram_percent", "datastore_percent"].includes(key)) return `${value}%`;
  if (["ram_gb", "disk_gb"].includes(key)) return `${value} GB`;
  return String(value);
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

const healthyStates = new Set(["ONLINE", "poweredOn", "RESOLVED", "Bajo", "Vigente", "COMPLIANT", "SUCCESS"]);
const attentionStates = new Set(["OFFLINE", "poweredOff", "ACTIVE", "ACKNOWLEDGED", "CRITICAL", "WARNING", "FAILED", "Critico", "Alto", "Con riesgo", "NON_COMPLIANT"]);
const PAGE_SIZE = 8;

export function OperationsPage({ kind }: { kind: OperationsKind }) {
  const cfg = config[kind];
  const Icon = cfg.icon;
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [query, setQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "healthy" | "attention">("all");
  const [sortBy, setSortBy] = useState<"name" | "status">("name");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ path: string; success: string; confirmation: string; mode: "default" | "connectivity" } | null>(null);
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

  const filtered = useMemo(() => items
    .filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()))
    .filter((item) => {
      const itemState = displayState(kind, item);
      if (healthFilter === "healthy") return healthyStates.has(itemState);
      if (healthFilter === "attention") return attentionStates.has(itemState);
      return true;
    })
    .sort((a, b) => (sortBy === "status" ? displayState(kind, a).localeCompare(displayState(kind, b)) : label(a).localeCompare(label(b)))),
  [healthFilter, items, kind, query, sortBy]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const online = items.filter((item) => ["ONLINE", "poweredOn", "RESOLVED", "Bajo", "Vigente"].includes(displayState(kind, item))).length;
  const critical = items.filter((item) => ["OFFLINE", "poweredOff", "ACTIVE", "CRITICAL", "Critico", "Con riesgo"].includes(displayState(kind, item))).length;

  async function executeAction(path: string, success: string, mode: "default" | "connectivity" = "default") {
    setActing(true);
    try {
      const { data } = await api.post(path);
      if (mode === "connectivity") {
        const result = data.check ?? data;
        const isOnline = ["ONLINE", "UP"].includes(String(result.status).toUpperCase());
        if (isOnline) toast.success(`Conectividad confirmada${result.latency_ms != null ? ` · ${result.latency_ms} ms` : ""}`);
        else toast.error(`Sin respuesta del recurso${result.error ? ` · ${result.error}` : ""}`);
      } else {
        toast.success(success);
      }
      await load();
    } catch (error: unknown) {
      const detail = (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "La accion no pudo completarse");
    } finally {
      setActing(false);
      setPendingAction(null);
    }
  }

  function action(path: string, success: string, confirmation?: string, mode: "default" | "connectivity" = "default") {
    if (confirmation) setPendingAction({ path, success, confirmation, mode });
    else void executeAction(path, success, mode);
  }

  if (loading) return <div className="grid gap-4 lg:grid-cols-2"><Skeleton className="h-80 rounded-3xl" /><Skeleton className="h-80 rounded-3xl" /></div>;

  return (
    <div className="space-y-5">
      <section className="border p-6 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
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

      <section className="flex flex-col gap-3 border p-3 lg:flex-row lg:items-center" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--app-muted)" }} />
          <Input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Buscar recurso, IP, VLAN, sede o estado" className="h-10 rounded-lg pl-11" />
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-lg p-1" style={{ background: "var(--app-surface-soft)" }}>
          {(["all", "healthy", "attention"] as const).map((value) => (
            <button key={value} type="button" onClick={() => { setHealthFilter(value); setPage(1); }}
              className="h-8 rounded-md px-3 text-[11px] font-black"
              style={{ background: healthFilter === value ? "var(--app-surface)" : "transparent", color: healthFilter === value ? "var(--app-text)" : "var(--app-muted)", boxShadow: healthFilter === value ? "0 1px 3px rgba(15,23,42,.12)" : "none" }}>
              {{ all: "Todos", healthy: "Saludables", attention: "Atencion" }[value]}
            </button>
          ))}
        </div>
        <select aria-label="Ordenar recursos" value={sortBy} onChange={(event) => { setSortBy(event.target.value as "name" | "status"); setPage(1); }}
          className="h-10 rounded-lg border px-3 text-xs font-bold outline-none" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", color: "var(--app-text)" }}>
          <option value="name">Ordenar por nombre</option>
          <option value="status">Ordenar por estado</option>
        </select>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {visibleItems.map((item, index) => {
          const itemState = displayState(kind, item);
          const id = Number(item.id ?? index);
          return (
            <article key={`${kind}-${id}-${index}`} className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0"><span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${statusTone[itemState] ?? "border-sky-200 bg-sky-50 text-sky-700"}`}>{itemState}</span><h2 className="mt-3 truncate text-lg font-black" style={{ color: "var(--app-text)" }}>{label(item)}</h2><p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>{String(item.service_name ?? item.description ?? item.device_type ?? item.resource_type ?? item.source ?? "Alesof Platform")}</p></div>
                {itemState === "ONLINE" || itemState === "poweredOn" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {visibleData(kind, item).map(([key, value]) => <Data key={key} label={fieldLabels[key] ?? key.replaceAll("_", " ")} value={formatFieldValue(key, value)} />)}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {kind === "vms" && user?.permissions?.includes("can_power_on_vm") && itemState !== "poweredOn" && <Action label="Encender" onClick={() => action(`/api/vms/${id}/power-on?confirm=true`, "VM encendida", `¿Encender ${label(item)} en VMware?`)} />}
                {kind === "vms" && user?.permissions?.includes("can_restart_vm") && itemState === "poweredOn" && <Action label="Reiniciar" onClick={() => action(`/api/vms/${id}/restart?confirm=true`, "VM reiniciada", `¿Reiniciar ${label(item)} en VMware? El servicio se interrumpira.`)} />}
                {kind === "vms" && user?.permissions?.includes("can_power_off_vm") && itemState === "poweredOn" && <Action label="Apagar" danger onClick={() => action(`/api/vms/${id}/power-off?confirm=true`, "VM apagada", `¿Apagar ${label(item)} en VMware? Esta accion afecta servicios.`)} />}
                {kind === "devices" && user?.permissions?.includes("can_run_network_tests") && <Action label="Probar conectividad" onClick={() => action(`/api/devices/${id}/ping`, "Conectividad verificada", undefined, "connectivity")} />}
                {kind === "hypervisors" && user?.permissions?.includes("can_run_network_tests") && <Action label="Probar host" onClick={() => action(`/api/hypervisors/${id}/ping`, "Host verificado", undefined, "connectivity")} />}
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

      {filtered.length === 0 && (
        <div className="flex min-h-48 flex-col items-center justify-center border border-dashed p-6 text-center" style={{ borderColor: "var(--app-border)", borderRadius: 8 }}>
          <Search className="h-6 w-6" style={{ color: "var(--app-muted)" }} />
          <p className="mt-3 text-sm font-black" style={{ color: "var(--app-text)" }}>No se encontraron recursos</p>
          <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>Cambia la busqueda o el filtro de estado.</p>
        </div>
      )}

      {filtered.length > PAGE_SIZE && (
        <div className="flex items-center justify-between border px-3 py-2" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <p className="text-xs font-bold" style={{ color: "var(--app-muted)" }}>{(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filtered.length)} de {filtered.length}</p>
          <div className="flex items-center gap-2">
            <button type="button" title="Pagina anterior" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-35" style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}><ChevronLeft className="h-4 w-4" /></button>
            <span className="min-w-16 text-center text-xs font-black" style={{ color: "var(--app-text)" }}>{currentPage} / {totalPages}</span>
            <button type="button" title="Pagina siguiente" disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-lg border disabled:opacity-35" style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(pendingAction)} onOpenChange={(open) => !open && !acting && setPendingAction(null)}>
        <DialogContent className="max-w-md border p-0" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <div className="border-b p-5" style={{ borderColor: "var(--app-border)" }}>
            <DialogHeader>
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle style={{ color: "var(--app-text)" }}>Confirmar accion operativa</DialogTitle>
            </DialogHeader>
            <p className="mt-3 text-sm leading-6" style={{ color: "var(--app-muted)" }}>{pendingAction?.confirmation}</p>
          </div>
          <div className="flex justify-end gap-2 p-4">
            <button type="button" disabled={acting} onClick={() => setPendingAction(null)} className="h-10 rounded-lg border px-4 text-xs font-black disabled:opacity-50" style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}>Cancelar</button>
            <button type="button" disabled={acting || !pendingAction} onClick={() => pendingAction && void executeAction(pendingAction.path, pendingAction.success, pendingAction.mode)} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-xs font-black text-white disabled:opacity-50">
              {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {acting ? "Procesando" : "Confirmar"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({ value, label, critical = false }: { value: number; label: string; critical?: boolean }) { return <div className="rounded-2xl p-4" style={{ background: critical ? "#dc2626" : "var(--app-surface-soft)", color: critical ? "white" : "var(--app-text)" }}><p className="text-2xl font-black">{value}</p><p className="mt-1 text-[11px] font-bold opacity-70">{label}</p></div>; }
function Data({ label, value }: { label: string; value: string }) { return <div className="rounded-lg px-3 py-2.5" style={{ background: "var(--app-surface-soft)" }}><p className="truncate text-[10px] font-black uppercase" style={{ color: "var(--app-muted)" }}>{label}</p><p className="mt-1 truncate text-xs font-bold" style={{ color: "var(--app-text)" }}>{value}</p></div>; }
function Action({ label, onClick, danger = false }: { label: string; onClick: () => void; danger?: boolean }) { return <button type="button" onClick={onClick} className="inline-flex h-9 items-center gap-2 rounded-xl px-3 text-xs font-black text-white" style={{ background: danger ? "#dc2626" : "var(--app-brand)" }}><Play className="h-3.5 w-3.5" />{label}</button>; }

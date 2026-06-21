"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { getUser } from "@/lib/auth";
import { getPreferences } from "@/lib/preferences";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  BellRing,
  CheckCircle2,
  DatabaseBackup,
  Headphones,
  PhoneCall,
  RadioTower,
  RefreshCw,
  ShieldCheck,
  Siren,
  Server,
  Wifi,
  X,
} from "lucide-react";

type Severity = "success" | "info" | "warning" | "critical";
type SiteStatus = "online" | "degraded" | "critical" | "unknown";

interface NocEvent {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  source: string;
  href: string;
}

interface NocSite {
  name: string;
  role: string;
  cidr: string;
  latency_ms: number;
  devices_total: number;
  devices_online: number;
  availability: number;
  status: SiteStatus;
  source: string;
}

interface NocService {
  name: string;
  owner: string;
  target: string;
  status: SiteStatus;
  metric: string;
  source: string;
}

interface VpnLink {
  name: string;
  type: string;
  latency_ms: number | null;
  packet_loss: number | null;
  status: SiteStatus;
  source: string;
}

interface EnterpriseModule {
  name: string;
  summary: string;
  priority: string;
}

interface NocData {
  updated_at: string;
  status: Severity;
  alert_signature: string;
  kpis: {
    availability: number;
    open_tickets: number;
    critical_tickets: number;
    devices_total: number;
    devices_online: number;
    devices_maintenance: number;
    overdue_invoices: number;
    pending_invoices: number;
  };
  sites: NocSite[];
  services: NocService[];
  vpn_links: VpnLink[];
  events: NocEvent[];
  enterprise_modules: EnterpriseModule[];
}

const severityStyle: Record<Severity, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-sky-200 bg-sky-50 text-sky-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  critical: "border-red-200 bg-red-50 text-red-700",
};

const statusCopy: Record<Severity, { title: string; detail: string }> = {
  success: { title: "Operacion estable", detail: "Servicios y sedes dentro de parametros normales." },
  info: { title: "Eventos informativos", detail: "Hay cambios menores para revisar durante la jornada." },
  warning: { title: "Atencion preventiva", detail: "Existe degradacion o pendientes que deben atenderse." },
  critical: { title: "Incidente critico", detail: "El NOC debe responder y escalar inmediatamente." },
};

function playNocAlarm() {
  const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) return;
  const context = new AudioContextClass();
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 2.8);
  gain.connect(context.destination);

  [0, 0.46, 0.92, 1.38, 1.84, 2.3].forEach((offset, index) => {
    const osc = context.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(index % 2 === 0 ? 880 : 660, context.currentTime + offset);
    osc.connect(gain);
    osc.start(context.currentTime + offset);
    osc.stop(context.currentTime + offset + 0.28);
  });

  window.setTimeout(() => void context.close(), 3200);
}

function requestBrowserNotification(event: NocEvent) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    new Notification(`Alesof NOC: ${event.title}`, { body: event.message, tag: event.id });
  }
}

export default function NocPage() {
  const preferences = getPreferences();
  const user = getUser();
  const [data, setData] = useState<NocData | null>(null);
  const [loading, setLoading] = useState(true);
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [incomingEvent, setIncomingEvent] = useState<NocEvent | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [liveMode, setLiveMode] = useState<"connecting" | "websocket" | "polling">("connecting");
  const lastSignature = useRef<string | null>(null);

  async function loadNoc() {
    try {
      const { data: nextData } = await api.get<NocData>("/api/noc/status");
      setData(nextData);
      setLastRefresh(new Date());
      const criticalEvent = nextData.events.find((event) => event.severity === "critical");
      const changed = lastSignature.current && lastSignature.current !== nextData.alert_signature;
      if (alarmEnabled && criticalEvent && (changed || !incomingEvent)) {
        playNocAlarm();
        if (preferences.vibrationEnabled) navigator.vibrate?.([350, 120, 350, 120, 700]);
        requestBrowserNotification(criticalEvent);
        setIncomingEvent(criticalEvent);
      }
      lastSignature.current = nextData.alert_signature;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadNoc();
    const timer = window.setInterval(() => void loadNoc(), preferences.nocRefreshSeconds * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmEnabled]);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let stopped = false;
    let reconnectTimer: number | null = null;
    const connect = async () => {
      try {
        const { data: ticketData } = await api.post<{ ticket: string }>("/api/noc/ws-ticket");
        if (stopped) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
        const wsUrl = `${apiUrl.replace(/^http/, "ws")}/ws/noc?ticket=${encodeURIComponent(ticketData.ticket)}`;
        socket = new WebSocket(wsUrl);
        socket.onopen = () => setLiveMode("websocket");
        socket.onmessage = (message) => {
      const event = JSON.parse(message.data) as {
        type: string; severity?: string; title?: string; affected_resource?: string; source?: string;
      };
      if (event.type === "connected") return;
      const critical = ["CRITICAL", "HIGH"].includes(event.severity ?? "");
      const incoming: NocEvent = {
          id: `${event.type}-${Date.now()}`,
          severity: event.severity === "CRITICAL" ? "critical" : critical ? "warning" : "info",
          title: event.title ?? "Evento NOC",
          message: `${event.affected_resource ?? "Recurso"} requiere atencion operativa.`,
          source: event.source ?? "NOC",
          href: "/dashboard/alertas",
      };
      setData((current) => current ? {
        ...current,
        status: incoming.severity === "critical" ? "critical" : incoming.severity === "warning" && current.status !== "critical" ? "warning" : current.status,
        events: [incoming, ...current.events.filter((item) => item.id !== incoming.id)].slice(0, 8),
      } : current);
      if (critical) {
        if (alarmEnabled && preferences.soundEnabled) playNocAlarm();
        if (preferences.vibrationEnabled) navigator.vibrate?.([350, 120, 350, 120, 700]);
        requestBrowserNotification(incoming);
        setIncomingEvent(incoming);
      }
      void loadNoc();
        };
        socket.onerror = () => setLiveMode("polling");
        socket.onclose = () => {
          setLiveMode("polling");
          if (!stopped) reconnectTimer = window.setTimeout(() => void connect(), 5000);
        };
      } catch {
        setLiveMode("polling");
        if (!stopped) reconnectTimer = window.setTimeout(() => void connect(), 5000);
      }
    };
    void connect();
    return () => {
      stopped = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      socket?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmEnabled]);

  const status = data ? statusCopy[data.status] : statusCopy.info;

  async function enableAlarm() {
    setAlarmEnabled(true);
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    playNocAlarm();
  }

  function simulateCriticalCall() {
    const event: NocEvent = {
      id: "demo-critical",
      severity: "critical",
      title: "Simulacion: VPN Lima - Trujillo degradada",
      message: "El canal de contingencia detecto perdida alta. Escalar al tecnico NOC de guardia.",
      source: "Demo NOC",
      href: "/dashboard/noc",
    };
    if (alarmEnabled) playNocAlarm();
    if (preferences.vibrationEnabled) navigator.vibrate?.([300, 100, 300, 100, 500]);
    requestBrowserNotification(event);
    setIncomingEvent(event);
  }

  async function runScenario(scenario: string) {
    try {
      await api.post(`/api/simulation/${scenario}`);
      toast.success(scenario === "reset" ? "Simulacion restablecida" : "Escenario NOC activado");
      await loadNoc();
    } catch {
      toast.error("No se pudo ejecutar el escenario");
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-72 rounded-[1.5rem]" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-72 rounded-[1.5rem]" />
          <Skeleton className="h-72 rounded-[1.5rem]" />
          <Skeleton className="h-72 rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[1.5rem] border p-6 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: data?.status === "critical" ? "#ef4444" : "linear-gradient(90deg, var(--app-brand), var(--app-accent))" }} />
        <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black ${severityStyle[data?.status ?? "info"]}`}>
              {data?.status === "critical" ? <Siren className="h-3.5 w-3.5" /> : <Activity className="h-3.5 w-3.5" />}
              NOC Live · {liveMode === "websocket" ? "WebSocket" : liveMode === "polling" ? "polling" : "conectando"}
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl" style={{ color: "var(--app-text)" }}>
              {status.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--app-muted)" }}>
              {status.detail} Los eventos llegan por WebSocket y la consola reconcilia el estado con la API en el intervalo configurado.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={enableAlarm}
                className="inline-flex h-11 items-center gap-2 rounded-2xl px-5 text-sm font-black text-white shadow-lg hover:-translate-y-0.5"
                style={{ background: alarmEnabled ? "var(--app-accent)" : "var(--app-brand)" }}
              >
                <BellRing className="h-4 w-4" />
                {alarmEnabled ? "Alerta NOC activa" : "Activar alerta NOC"}
              </button>
              <button
                type="button"
                onClick={simulateCriticalCall}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border px-5 text-sm font-black hover:-translate-y-0.5"
                style={{ borderColor: "var(--app-border)", color: "var(--app-text)", background: "var(--app-surface-soft)" }}
              >
                <PhoneCall className="h-4 w-4" />
                Simular llamada
              </button>
              <button
                type="button"
                onClick={() => loadNoc()}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border px-5 text-sm font-black hover:-translate-y-0.5"
                style={{ borderColor: "var(--app-border)", color: "var(--app-muted)" }}
              >
                <RefreshCw className="h-4 w-4" />
                Actualizar
              </button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Kpi label="Disponibilidad" value={`${data?.kpis.availability ?? 0}%`} icon={Wifi} tone="brand" />
            <Kpi label="Tickets abiertos" value={data?.kpis.open_tickets ?? 0} icon={Headphones} tone="soft" />
            <Kpi label="Criticos" value={data?.kpis.critical_tickets ?? 0} icon={AlertTriangle} tone="critical" />
            <Kpi label="Equipos online" value={`${data?.kpis.devices_online ?? 0}/${data?.kpis.devices_total ?? 0}`} icon={Server} tone="accent" />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_380px]">
        <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Sedes y enlaces</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Lima virtualizada, Arequipa fisica y Trujillo desplegada en AWS.</p>
            </div>
            <Badge className="rounded-full bg-teal-50 text-teal-700 hover:bg-teal-50">
              {lastRefresh ? lastRefresh.toLocaleTimeString() : "Live"}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data?.sites.map((site) => (
              <div key={site.name} className="rounded-2xl border p-4" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-soft)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{site.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>{site.role}</p>
                      <SourceBadge source={site.source} />
                    </div>
                  </div>
                  <StatusBadge status={site.status} />
                </div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-xs">
                  <MiniMetric label="CIDR" value={site.cidr} />
                  <MiniMetric label="Latencia" value={site.latency_ms == null ? "Sin datos" : `${site.latency_ms} ms`} />
                  <MiniMetric label="Activos" value={`${site.devices_online}/${site.devices_total}`} />
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full" style={{ background: "var(--app-surface)" }}>
                  <div className="h-full rounded-full" style={{ width: `${site.availability}%`, background: site.status === "critical" ? "#ef4444" : site.status === "degraded" ? "#f59e0b" : "var(--app-accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <div className="mb-5 flex items-center gap-3">
            <RadioTower className="h-5 w-5" style={{ color: "var(--app-accent)" }} />
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>VPN IPsec</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Túneles críticos entre sedes.</p>
            </div>
          </div>
          <div className="space-y-3">
            {data?.vpn_links.map((link) => (
              <div key={link.name} className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-soft)" }}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{link.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs" style={{ color: "var(--app-muted)" }}>{link.type} · {link.latency_ms == null ? "sin latencia" : `${link.latency_ms} ms`} · loss {link.packet_loss == null ? "sin datos" : `${link.packet_loss}%`}</p>
                      <SourceBadge source={link.source} />
                    </div>
                  </div>
                  <StatusBadge status={link.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <div className="mb-5 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5" style={{ color: "var(--app-accent)" }} />
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Servicios empresariales</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Servicios críticos descritos en el proyecto Alesof.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {data?.services.map((service) => (
              <div key={service.name} className="rounded-2xl border p-4" style={{ borderColor: "var(--app-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{service.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <p className="text-xs" style={{ color: "var(--app-muted)" }}>{service.owner} · Objetivo {service.target}</p>
                      <SourceBadge source={service.source} />
                    </div>
                  </div>
                  <StatusBadge status={service.status} />
                </div>
                <p className="mt-4 text-xs font-bold" style={{ color: "var(--app-muted)" }}>{service.metric}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <div className="mb-5 flex items-center gap-3">
            <Siren className="h-5 w-5 text-red-500" />
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Eventos activos</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Alertas que alimentan la llamada NOC.</p>
            </div>
          </div>
          <div className="space-y-3">
            {data?.events.map((event) => (
              <Link key={event.id} href={event.href} className={`block rounded-2xl border p-4 ${severityStyle[event.severity]}`}>
                <div className="flex items-start gap-3">
                  {event.severity === "critical" ? <AlertTriangle className="mt-0.5 h-4 w-4" /> : <CheckCircle2 className="mt-0.5 h-4 w-4" />}
                  <div>
                    <p className="text-sm font-black">{event.title}</p>
                    <p className="mt-1 text-xs opacity-80">{event.message}</p>
                    <p className="mt-3 text-[11px] font-black uppercase tracking-wide opacity-70">{event.source}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {data?.enterprise_modules.map((module) => (
          <div key={module.name} className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
            <DatabaseBackup className="mb-5 h-5 w-5" style={{ color: "var(--app-accent)" }} />
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-black" style={{ color: "var(--app-text)" }}>{module.name}</h3>
              <span className="rounded-full px-2 py-1 text-[10px] font-black" style={{ background: "var(--app-surface-soft)", color: "var(--app-muted)" }}>{module.priority}</span>
            </div>
            <p className="mt-3 text-xs leading-5" style={{ color: "var(--app-muted)" }}>{module.summary}</p>
          </div>
        ))}
      </section>

      {user?.permissions?.includes("can_manage_services") && (
        <section className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Escenarios de demostracion</h2>
              <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>Generan evento, alerta, WebSocket y ticket automatico cuando corresponde.</p>
            </div>
            <button type="button" onClick={() => runScenario("reset")} className="h-10 rounded-xl border px-4 text-xs font-black" style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}>Restablecer todo</button>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["haproxy-down", "HAProxy caido"], ["web-down", "Web DMZ caida"],
              ["vpn-down", "VPN Lima-Trujillo"], ["vm-down", "VM critica apagada"],
              ["backup-failed", "Backup fallido"], ["high-cpu", "CPU ESXi alta"],
              ["switch-down", "Switch core caido"], ["agent-offline", "Agente offline"],
            ].map(([scenario, label]) => (
              <button key={scenario} type="button" onClick={() => runScenario(scenario)}
                className="h-11 rounded-xl border px-3 text-left text-xs font-black hover:-translate-y-0.5"
                style={{ background: "var(--app-surface-soft)", borderColor: "var(--app-border)", color: "var(--app-text)" }}>
                {label}
              </button>
            ))}
          </div>
        </section>
      )}

      {incomingEvent && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm overflow-hidden rounded-[1.5rem] border border-red-200 bg-white shadow-2xl shadow-red-950/20">
            <div className="bg-red-600 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-black">
                    <PhoneCall className="h-3.5 w-3.5" />
                    Llamada NOC entrante
                  </div>
                  <h2 className="mt-5 text-2xl font-black">{incomingEvent.title}</h2>
                  <p className="mt-2 text-sm text-white/80">{incomingEvent.message}</p>
                </div>
                <button type="button" onClick={() => setIncomingEvent(null)} className="rounded-xl bg-white/15 p-2 hover:bg-white/25">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 p-4">
              <Link href={incomingEvent.href} onClick={() => setIncomingEvent(null)} className="flex h-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-black text-white">
                Atender
              </Link>
              <button type="button" onClick={() => setIncomingEvent(null)} className="h-11 rounded-2xl border border-slate-200 text-sm font-black text-slate-600">
                Silenciar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  icon: typeof Activity;
  tone: "brand" | "accent" | "critical" | "soft";
}) {
  const styles = {
    brand: { background: "var(--app-brand)", color: "#ffffff" },
    accent: { background: "var(--app-accent)", color: "#ffffff" },
    critical: { background: "#dc2626", color: "#ffffff" },
    soft: { background: "var(--app-surface-soft)", color: "var(--app-text)" },
  }[tone];

  return (
    <div className="rounded-2xl border p-4" style={{ ...styles, borderColor: "var(--app-border)" }}>
      <Icon className="mb-6 h-5 w-5 opacity-80" />
      <p className="text-3xl font-black leading-none">{value}</p>
      <p className="mt-2 text-xs font-semibold opacity-70">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: SiteStatus }) {
  const map = {
    online: "border-emerald-200 bg-emerald-50 text-emerald-700",
    degraded: "border-amber-200 bg-amber-50 text-amber-700",
    critical: "border-red-200 bg-red-50 text-red-700",
    unknown: "border-slate-200 bg-slate-100 text-slate-600",
  };
  const label = { online: "Online", degraded: "Degradado", critical: "Critico", unknown: "Sin datos" }[status];
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${map[status]}`}>{label}</span>;
}

function SourceBadge({ source }: { source: string }) {
  const normalized = source.toUpperCase();
  const isReal = ["AGENT", "VMWARE", "AWS", "VEEAM"].includes(normalized);
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase ${isReal ? "border-teal-200 bg-teal-50 text-teal-700" : "border-slate-200 bg-slate-100 text-slate-600"}`}>
      {normalized === "AGENT" ? "Agente" : normalized === "SIMULATED" ? "Simulado" : normalized}
    </span>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--app-muted)" }}>{label}</p>
      <p className="mt-1 truncate text-xs font-black" style={{ color: "var(--app-text)" }}>{value}</p>
    </div>
  );
}

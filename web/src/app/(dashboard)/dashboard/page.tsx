"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { getUser, type User } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Clock3,
  Headset,
  Server,
  ShieldCheck,
  Users,
  Wifi,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const prioridadConfig: Record<string, { label: string; cls: string }> = {
  baja: { label: "Baja", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  media: { label: "Media", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  alta: { label: "Alta", cls: "bg-orange-50 text-orange-700 border-orange-200" },
  crítica: { label: "Critica", cls: "bg-red-50 text-red-700 border-red-200" },
};

const estadoConfig: Record<string, { label: string; cls: string }> = {
  abierto: { label: "Abierto", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  en_proceso: { label: "En proceso", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resuelto: { label: "Resuelto", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cerrado: { label: "Cerrado", cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

interface DashData {
  total_clientes: number;
  total_empleados: number;
  tickets_abiertos: number;
  ingresos_mes: number;
}
interface TicketEstado { estado: string; cantidad: number; }
interface ClienteMes { anio: number; mes: number; total: number; label?: string; }
interface Ticket { id: number; titulo: string; prioridad: string; estado: string; cliente: string | null; tecnico: string | null; }
interface ExecutiveSummary {
  availability: number; services_down: number; vms_off: number; sites_with_alerts: number;
  dmz_services_at_risk: number; sla_at_risk: number; risk: { score: number; level: string };
}
interface NocSummary {
  status: "success" | "info" | "warning" | "critical";
  kpis: { availability: number; devices_total: number; devices_online: number; open_tickets: number; };
  sites: Array<{ name: string; role: string; devices_total: number; devices_online: number; availability: number; status: string; source: string; }>;
  events: Array<{ id: string; severity: "success" | "info" | "warning" | "critical"; title: string; message: string; source: string; href: string; }>;
}

export default function DashboardPage() {
  const [user] = useState<User | null>(() => getUser());
  const [data, setData] = useState<DashData | null>(null);
  const [ticketsEst, setTicketsEst] = useState<TicketEstado[]>([]);
  const [clientesMes, setClientesMes] = useState<ClienteMes[]>([]);
  const [noc, setNoc] = useState<NocSummary | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [executive, setExecutive] = useState<ExecutiveSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/reportes/dashboard"),
      api.get("/api/soporte/por-estado"),
      api.get("/api/reportes/clientes-por-mes"),
      api.get("/api/noc/status"),
      api.get("/api/reportes/ultimos-tickets"),
      api.get("/api/dashboard/summary"),
    ])
      .then(([d, e, c, s, t, summary]) => {
        setData(d.data);
        setTicketsEst(e.data);
        setClientesMes(c.data.map((x: ClienteMes) => ({ ...x, label: `${meses[x.mes - 1]}` })));
        setNoc(s.data);
        setTickets(t.data);
        setExecutive(summary.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const criticalTickets = useMemo(
    () => tickets.filter((ticket) => ticket.prioridad === "crítica" && ticket.estado !== "cerrado").length,
    [tickets],
  );
  const firstName = user?.nombre?.split(" ")[0] ?? "usuario";

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-52 rounded-[1.5rem]" />
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-96 rounded-[1.5rem]" />
          <Skeleton className="h-96 rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <div className="overflow-hidden rounded-[1.5rem] border shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <div className="relative min-h-[260px] p-6">
            <div className="absolute inset-x-0 top-0 h-1" style={{ background: "linear-gradient(90deg, var(--app-brand), var(--app-accent))" }} />
            <div className="relative z-10 flex h-full flex-col justify-between gap-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold" style={{ borderColor: "var(--app-border)", color: "var(--app-accent)", background: "var(--app-surface-soft)" }}>
                    <span className="h-1.5 w-1.5 rounded-full bg-teal-300" />
                    API operativa conectada
                  </div>
                  <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl" style={{ color: "var(--app-text)" }}>
                    Hola, {firstName}.
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-6" style={{ color: "var(--app-muted)" }}>
                    Esta es tu vista de trabajo para hoy: clientes, tickets, disponibilidad y cobros en un solo inicio.
                  </p>
                </div>
                <div className="rounded-2xl border p-4 text-right" style={{ background: "var(--app-surface-soft)", borderColor: "var(--app-border)" }}>
                  <p className="text-xs font-semibold" style={{ color: "var(--app-muted)" }}>Disponibilidad promedio</p>
                  <p className="mt-1 text-4xl font-black" style={{ color: "var(--app-accent)" }}>{noc?.kpis.availability ?? 0}%</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Clientes activos", value: data?.total_clientes ?? 0, icon: Users, tone: "brand" },
                  { label: "Tickets abiertos", value: data?.tickets_abiertos ?? 0, icon: Headset, tone: "accent" },
                  { label: "Servicios caidos", value: executive?.services_down ?? 0, icon: AlertTriangle, tone: "warning" },
                  { label: "Riesgo global", value: `${executive?.risk.score ?? 0}%`, icon: ShieldCheck, tone: "soft" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border p-4"
                    style={{
                      background: item.tone === "brand"
                        ? "var(--app-brand)"
                        : item.tone === "accent"
                          ? "var(--app-accent)"
                          : item.tone === "warning"
                            ? "#f97316"
                            : "var(--app-surface-soft)",
                      borderColor: "var(--app-border)",
                      color: item.tone === "soft" ? "var(--app-text)" : "#ffffff",
                    }}
                  >
                    <item.icon className="mb-5 h-5 w-5 opacity-80" />
                    <p className="text-2xl font-black leading-none">{item.value}</p>
                    <p className="mt-2 text-xs font-semibold opacity-65">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <aside className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Eventos NOC</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Información persistida en la API</p>
            </div>
            <Badge className="rounded-full bg-teal-50 text-teal-700 hover:bg-teal-50">Live</Badge>
          </div>
          <div className="space-y-3">
            {noc?.events.slice(0, 4).map((item) => {
              const tone = { critical: "border-red-200 bg-red-50 text-red-700", warning: "border-amber-200 bg-amber-50 text-amber-700", info: "border-sky-200 bg-sky-50 text-sky-700", success: "border-emerald-200 bg-emerald-50 text-emerald-700" }[item.severity];
              return <Link href={item.href} key={item.id} className={`block rounded-lg border p-4 ${tone}`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-sm font-black">{item.title}</p>
                    <p className="mt-1 text-xs opacity-75">{item.message}</p>
                    <p className="mt-2 text-[10px] font-black uppercase opacity-60">{item.source}</p>
                  </div>
                </div>
              </Link>;
            })}
          </div>
        </aside>
      </section>

      <section className="scroll-rise grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Crecimiento de clientes</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Altas registradas por mes</p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={clientesMes}>
              <defs>
                <linearGradient id="clientesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0891b2" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#0891b2" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)", fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#0891b2" strokeWidth={3} fill="url(#clientesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Tickets por estado</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Carga actual de soporte</p>
            </div>
            <Headset className="h-5 w-5 text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ticketsEst} barSize={34}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="estado" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)", fontSize: 12 }} />
              <Bar dataKey="cantidad" fill="#0f766e" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="scroll-reveal grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Infraestructura por sede</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Activos observados por fuente de telemetria</p>
            </div>
          </div>
          <div className="space-y-4">
            {noc?.sites.map((sede) => {
              const hasTelemetry = ["AGENT", "VMWARE", "AWS"].includes(sede.source);
              const color = !hasTelemetry ? "#94a3b8" : sede.availability >= 90 ? "#22c55e" : sede.availability >= 70 ? "#f59e0b" : "#ef4444";
              return (
                <div key={sede.name} className="rounded-lg border p-4" style={{ borderColor: "var(--app-border)" }}>
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{sede.name}</p>
                      <p className="text-xs" style={{ color: "var(--app-muted)" }}>{sede.devices_online} de {sede.devices_total} activos · {sede.source}</p>
                    </div>
                    <span className="text-lg font-black" style={{ color }}>{hasTelemetry ? `${sede.availability}%` : "Sin datos"}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${hasTelemetry ? sede.availability : 0}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden border shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
          <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--app-border)" }}>
            <div>
              <h2 className="text-sm font-black" style={{ color: "var(--app-text)" }}>Ultimos tickets</h2>
              <p className="text-xs" style={{ color: "var(--app-muted)" }}>Incidencias recientes del NOC</p>
            </div>
            <Link href="/dashboard/soporte" className="flex items-center gap-1 text-xs font-black hover:underline" style={{ color: "var(--app-text)" }}>
              Ver soporte <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow style={{ background: "var(--app-surface-soft)" }}>
                <TableHead className="text-xs">Ticket</TableHead>
                <TableHead className="hidden text-xs md:table-cell">Cliente</TableHead>
                <TableHead className="text-xs">Prioridad</TableHead>
                <TableHead className="text-xs">Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => {
                const prioridad = prioridadConfig[ticket.prioridad];
                const estado = estadoConfig[ticket.estado];
                return (
                  <TableRow key={ticket.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-black" style={{ background: "var(--app-surface-soft)", color: "var(--app-muted)" }}>
                          #{ticket.id}
                        </div>
                        <div>
                          <p className="max-w-[220px] truncate text-sm font-bold" style={{ color: "var(--app-text)" }}>{ticket.titulo}</p>
                          <p className="text-xs" style={{ color: "var(--app-muted)" }}>{ticket.tecnico ?? "Sin tecnico asignado"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell" style={{ color: "var(--app-muted)" }}>{ticket.cliente ?? "-"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${prioridad?.cls ?? ""}`}>
                        {prioridad?.label ?? ticket.prioridad}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${estado?.cls ?? ""}`}>
                        {estado?.label ?? ticket.estado}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="scroll-rise grid gap-4 md:grid-cols-3">
        {[
          { title: "Telemetria real", text: `${noc?.sites.filter((site) => ["AGENT", "VMWARE", "AWS"].includes(site.source)).length ?? 0} de ${noc?.sites.length ?? 0} sedes con fuente activa.`, icon: Wifi },
          { title: "Tickets criticos", text: `${criticalTickets} incidencias requieren seguimiento operativo.`, icon: Clock3 },
          { title: "Estado general", text: noc?.status === "critical" ? "Existe un incidente critico activo." : noc?.status === "warning" ? "Hay advertencias pendientes de revision." : "No hay alertas criticas activas.", icon: CheckCircle2 },
        ].map((item) => (
          <div key={item.title} className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
            <item.icon className="mb-5 h-5 w-5" style={{ color: "var(--app-muted)" }} />
            <h3 className="text-sm font-black" style={{ color: "var(--app-text)" }}>{item.title}</h3>
            <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-muted)" }}>{item.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

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
  Receipt,
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
interface Sede { sede: string; total_equipos: number; activos: number; disponibilidad: number; }
interface Ticket { id: number; titulo: string; prioridad: string; estado: string; cliente: string | null; tecnico: string | null; }

export default function DashboardPage() {
  const [user] = useState<User | null>(() => getUser());
  const [data, setData] = useState<DashData | null>(null);
  const [ticketsEst, setTicketsEst] = useState<TicketEstado[]>([]);
  const [clientesMes, setClientesMes] = useState<ClienteMes[]>([]);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/api/reportes/dashboard"),
      api.get("/api/soporte/por-estado"),
      api.get("/api/reportes/clientes-por-mes"),
      api.get("/api/reportes/disponibilidad-sedes"),
      api.get("/api/reportes/ultimos-tickets"),
    ])
      .then(([d, e, c, s, t]) => {
        setData(d.data);
        setTicketsEst(e.data);
        setClientesMes(c.data.map((x: ClienteMes) => ({ ...x, label: `${meses[x.mes - 1]}` })));
        setSedes(s.data);
        setTickets(t.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const criticalTickets = useMemo(
    () => tickets.filter((ticket) => ticket.prioridad === "crítica" && ticket.estado !== "cerrado").length,
    [tickets],
  );
  const avgAvailability = useMemo(() => {
    if (!sedes.length) return 0;
    return Math.round(sedes.reduce((acc, sede) => acc + sede.disponibilidad, 0) / sedes.length);
  }, [sedes]);
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
                    Centro operativo en linea
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
                  <p className="mt-1 text-4xl font-black" style={{ color: "var(--app-accent)" }}>{avgAvailability}%</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Clientes activos", value: data?.total_clientes ?? 0, icon: Users, tone: "brand" },
                  { label: "Tickets abiertos", value: data?.tickets_abiertos ?? 0, icon: Headset, tone: "accent" },
                  { label: "Criticos", value: criticalTickets, icon: AlertTriangle, tone: "warning" },
                  { label: "Cobrado mes", value: `S/ ${(data?.ingresos_mes ?? 0).toLocaleString()}`, icon: Receipt, tone: "soft" },
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

        <aside className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Notificaciones</h2>
              <p className="text-xs text-slate-500">Prioridad operativa</p>
            </div>
            <Badge className="rounded-full bg-teal-50 text-teal-700 hover:bg-teal-50">Live</Badge>
          </div>
          <div className="space-y-3">
            {[
              { icon: AlertTriangle, title: "Revisar tickets criticos", text: `${criticalTickets} incidencias requieren seguimiento`, tone: "border-red-200 bg-red-50 text-red-700" },
              { icon: Receipt, title: "Facturas pendientes", text: "Validar cartera y vencimientos del mes", tone: "border-amber-200 bg-amber-50 text-amber-700" },
              { icon: ShieldCheck, title: "Backups nocturnos", text: "Ultima ventana finalizo correctamente", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
              { icon: Wifi, title: "Enlaces de sede", text: "Monitoreo estable en sedes principales", tone: "border-cyan-200 bg-cyan-50 text-cyan-700" },
            ].map((item) => (
              <div key={item.title} className={`rounded-2xl border p-4 ${item.tone}`}>
                <div className="flex items-start gap-3">
                  <item.icon className="mt-0.5 h-4 w-4" />
                  <div>
                    <p className="text-sm font-black">{item.title}</p>
                    <p className="mt-1 text-xs opacity-75">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <section className="scroll-rise grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Crecimiento de clientes</h2>
              <p className="text-xs text-slate-500">Altas registradas por mes</p>
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
              <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Area type="monotone" dataKey="total" stroke="#0891b2" strokeWidth={3} fill="url(#clientesGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Tickets por estado</h2>
              <p className="text-xs text-slate-500">Carga actual de soporte</p>
            </div>
            <Headset className="h-5 w-5 text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={ticketsEst} barSize={34}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="estado" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="cantidad" fill="#0f766e" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="scroll-reveal grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-900">Infraestructura por sede</h2>
              <p className="text-xs text-slate-500">Equipos activos vs registrados</p>
            </div>
          </div>
          <div className="space-y-4">
            {sedes.map((sede) => {
              const color = sede.disponibilidad >= 90 ? "#22c55e" : sede.disponibilidad >= 70 ? "#f59e0b" : "#ef4444";
              return (
                <div key={sede.sede} className="rounded-2xl border border-slate-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-slate-900">{sede.sede}</p>
                      <p className="text-xs text-slate-500">{sede.activos} de {sede.total_equipos} equipos activos</p>
                    </div>
                    <span className="text-lg font-black" style={{ color }}>{sede.disponibilidad}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full" style={{ width: `${sede.disponibilidad}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-slate-900">Ultimos tickets</h2>
              <p className="text-xs text-slate-500">Incidencias recientes del NOC</p>
            </div>
            <Link href="/dashboard/soporte" className="flex items-center gap-1 text-xs font-black text-slate-900 hover:underline">
              Ver soporte <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 hover:bg-slate-50">
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
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500">
                          #{ticket.id}
                        </div>
                        <div>
                          <p className="max-w-[220px] truncate text-sm font-bold text-slate-900">{ticket.titulo}</p>
                          <p className="text-xs text-slate-400">{ticket.tecnico ?? "Sin tecnico asignado"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-slate-500 md:table-cell">{ticket.cliente ?? "-"}</TableCell>
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
          { title: "Politicas de seguridad", text: "Renovar claves VPN y revisar accesos de terceros.", icon: ShieldCheck },
          { title: "Ventana de mantenimiento", text: "Core Lima 2 requiere validacion posterior al cambio.", icon: Clock3 },
          { title: "Estado general", text: "Servicios principales operativos y sin degradacion mayor.", icon: CheckCircle2 },
        ].map((item) => (
          <div key={item.title} className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <item.icon className="mb-5 h-5 w-5 text-slate-400" />
            <h3 className="text-sm font-black text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">{item.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

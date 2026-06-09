"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserCog, Headset, TrendingUp, Server, ArrowUpRight } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";

const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const prioridadConfig: Record<string, { label: string; cls: string }> = {
  baja:    { label: "Baja",    cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  media:   { label: "Media",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  alta:    { label: "Alta",    cls: "bg-orange-50 text-orange-700 border-orange-200" },
  crítica: { label: "Crítica", cls: "bg-red-50 text-red-700 border-red-200" },
};
const estadoConfig: Record<string, { label: string; cls: string }> = {
  abierto:    { label: "Abierto",    cls: "bg-blue-50 text-blue-700 border-blue-200" },
  en_proceso: { label: "En proceso", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resuelto:   { label: "Resuelto",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  cerrado:    { label: "Cerrado",    cls: "bg-slate-100 text-slate-600 border-slate-200" },
};

interface DashData { total_clientes: number; total_empleados: number; tickets_abiertos: number; ingresos_mes: number; }
interface TicketEstado { estado: string; cantidad: number; }
interface ClienteMes { anio: number; mes: number; total: number; label?: string; }
interface Sede { sede: string; total_equipos: number; activos: number; disponibilidad: number; }
interface Ticket { id: number; titulo: string; prioridad: string; estado: string; cliente: string | null; tecnico: string | null; }

const metricCards = (d: DashData) => [
  {
    label: "Clientes activos",
    value: d.total_clientes,
    icon: Users,
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    text: "text-blue-600",
    link: "/dashboard/clientes",
  },
  {
    label: "Empleados",
    value: d.total_empleados,
    icon: UserCog,
    gradient: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    text: "text-violet-600",
    link: "/dashboard/empleados",
  },
  {
    label: "Tickets abiertos",
    value: d.tickets_abiertos,
    icon: Headset,
    gradient: "from-orange-500 to-orange-600",
    bg: "bg-orange-50",
    text: "text-orange-600",
    link: "/dashboard/soporte",
  },
  {
    label: "Ingresos cobrados",
    value: `S/ ${d.ingresos_mes.toLocaleString()}`,
    icon: TrendingUp,
    gradient: "from-emerald-500 to-emerald-600",
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    link: "/dashboard/facturacion",
  },
];

export default function DashboardPage() {
  const [data, setData]             = useState<DashData | null>(null);
  const [ticketsEst, setTicketsEst] = useState<TicketEstado[]>([]);
  const [clientesMes, setClientesMes] = useState<ClienteMes[]>([]);
  const [sedes, setSedes]           = useState<Sede[]>([]);
  const [tickets, setTickets]       = useState<Ticket[]>([]);
  const [loading, setLoading]       = useState(true);

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  const cards = data ? metricCards(data) : [];

  return (
    <div className="space-y-6">
      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((m) => (
          <Link key={m.label} href={m.link}>
            <div className="group relative overflow-hidden rounded-2xl bg-white border border-slate-200/70 p-5 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer">
              {/* gradient accent top */}
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${m.gradient}`} />
              <div className="flex items-start justify-between mb-4">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.bg} group-hover:scale-110 transition-transform duration-200`}>
                  <m.icon className={`h-5 w-5 ${m.text}`} />
                </div>
                <ArrowUpRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200" />
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">{m.label}</p>
              <p className="text-[1.65rem] font-extrabold text-slate-800 tracking-tight leading-none">{m.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white border border-border/60 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Clientes nuevos por mes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Histórico de incorporaciones</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={clientesMes}>
              <defs>
                <linearGradient id="colorClientes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }}
                cursor={{ stroke: "#1e3a5f", strokeWidth: 1.5, strokeDasharray: "4 2" }}
              />
              <Area type="monotone" dataKey="total" stroke="#1e3a5f" strokeWidth={2.5} fill="url(#colorClientes)" dot={{ r: 3, fill: "#1e3a5f" }} activeDot={{ r: 5 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl bg-white border border-border/60 p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Tickets por estado</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribución actual de tickets</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ticketsEst} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="estado" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: 12 }} cursor={{ fill: "#f8fafc" }} />
              <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                {ticketsEst.map((entry, i) => (
                  <rect key={i} fill={
                    entry.estado === "abierto"    ? "#3b82f6" :
                    entry.estado === "en_proceso" ? "#f59e0b" :
                    entry.estado === "resuelto"   ? "#10b981" : "#94a3b8"
                  } />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estado de sedes */}
      <div className="rounded-2xl bg-white border border-border/60 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <div className="rounded-lg bg-[#1e3a5f]/8 p-1.5">
            <Server className="h-4 w-4 text-[#1e3a5f]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Estado de infraestructura por sede</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Disponibilidad en tiempo real</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {sedes.map((s) => {
            const color = s.disponibilidad >= 90 ? "bg-emerald-500" : s.disponibilidad >= 70 ? "bg-amber-500" : "bg-red-500";
            const textColor = s.disponibilidad >= 90 ? "text-emerald-600" : s.disponibilidad >= 70 ? "text-amber-600" : "text-red-600";
            const bgColor = s.disponibilidad >= 90 ? "bg-emerald-50 border-emerald-100" : s.disponibilidad >= 70 ? "bg-amber-50 border-amber-100" : "bg-red-50 border-red-100";
            return (
              <div key={s.sede} className="rounded-xl border border-border/60 p-4 hover:border-border transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-foreground">{s.sede}</span>
                  <span className={`text-sm font-bold ${textColor}`}>{s.disponibilidad}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-700 ${color}`}
                    style={{ width: `${s.disponibilidad}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{s.activos} de {s.total_equipos} equipos activos</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Últimos tickets */}
      <div className="rounded-2xl bg-white border border-border/60 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Últimos tickets</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Incidencias más recientes</p>
          </div>
          <Link href="/dashboard/soporte">
            <button className="text-xs font-medium text-[#1e3a5f] hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight className="h-3 w-3" />
            </button>
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-xs">ID</TableHead>
              <TableHead className="text-xs">Título</TableHead>
              <TableHead className="text-xs hidden md:table-cell">Cliente</TableHead>
              <TableHead className="text-xs hidden lg:table-cell">Técnico</TableHead>
              <TableHead className="text-xs">Prioridad</TableHead>
              <TableHead className="text-xs">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((t) => {
              const p = prioridadConfig[t.prioridad];
              const e = estadoConfig[t.estado];
              return (
                <TableRow key={t.id} className="hover:bg-muted/20">
                  <TableCell className="font-mono text-xs text-muted-foreground">#{t.id}</TableCell>
                  <TableCell className="text-sm font-medium max-w-[180px] truncate">{t.titulo}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden md:table-cell">{t.cliente ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground hidden lg:table-cell">{t.tecnico ?? <span className="italic opacity-60">Sin asignar</span>}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${p?.cls ?? ""}`}>
                      {p?.label ?? t.prioridad}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border ${e?.cls ?? ""}`}>
                      {e?.label ?? t.estado}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

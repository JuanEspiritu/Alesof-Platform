"use client";

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  Download,
  RadioTower,
  Trophy,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface TecnicoData {
  tecnico: string;
  resueltos: number;
}

interface IngresoData {
  anio: number;
  mes: number;
  total: number;
}

interface SedeData {
  sede: string;
  total_equipos: number;
  activos: number;
  disponibilidad: number;
}

const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const COLORS = ["#0f1f33", "#0f766e", "#0891b2", "#f97316", "#22c55e"];

export default function ReportesPage() {
  const [tecnicos, setTecnicos] = useState<TecnicoData[]>([]);
  const [ingresos, setIngresos] = useState<(IngresoData & { label: string })[]>([]);
  const [sedes, setSedes] = useState<SedeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [tRes, iRes, sRes] = await Promise.all([
          api.get("/api/reportes/tickets-por-tecnico"),
          api.get("/api/facturacion/ingresos"),
          api.get("/api/reportes/disponibilidad-sedes"),
        ]);
        setTecnicos(tRes.data);
        setIngresos(iRes.data.map((i: IngresoData) => ({ ...i, label: `${meses[i.mes - 1]} ${i.anio}` })));
        setSedes(sRes.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalIngresos = useMemo(() => ingresos.reduce((acc, item) => acc + item.total, 0), [ingresos]);
  const avgDisponibilidad = useMemo(() => {
    if (!sedes.length) return 0;
    return Math.round(sedes.reduce((acc, item) => acc + item.disponibilidad, 0) / sedes.length);
  }, [sedes]);
  const totalResueltos = useMemo(() => tecnicos.reduce((acc, item) => acc + item.resueltos, 0), [tecnicos]);
  const bestTech = useMemo(() => [...tecnicos].sort((a, b) => b.resueltos - a.resueltos)[0], [tecnicos]);

  function handleExport() {
    const rows = [
      ["Tipo", "Nombre", "Valor"],
      ...ingresos.map((item) => ["Ingreso mensual", item.label, `S/ ${item.total}`]),
      ...sedes.map((item) => ["Disponibilidad", item.sede, `${item.disponibilidad}%`]),
      ...tecnicos.map((item) => ["Tickets resueltos", item.tecnico, String(item.resueltos)]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "alesof-reportes.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-44 rounded-[1.5rem]" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-96 rounded-[1.5rem]" />
          <Skeleton className="h-96 rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-[1.5rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-950/10">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-bold text-teal-100">
              <Activity className="h-3.5 w-3.5" />
              Reporte ejecutivo
            </div>
            <h1 className="mt-5 text-3xl font-black tracking-tight">Indicadores de operacion</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Resumen para evaluar ingresos cobrados, carga tecnica y disponibilidad por sede.
            </p>
          </div>
          <button
            type="button"
            onClick={handleExport}
            className="flex h-11 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-black text-slate-950 shadow-lg shadow-black/10 hover:bg-slate-100"
          >
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Ingresos cobrados", value: `S/ ${totalIngresos.toLocaleString()}`, icon: CircleDollarSign, color: "bg-white" },
          { label: "Disponibilidad", value: `${avgDisponibilidad}%`, icon: RadioTower, color: "bg-teal-50" },
          { label: "Tickets resueltos", value: totalResueltos, icon: CheckCircle2, color: "bg-white" },
          { label: "Mejor tecnico", value: bestTech?.tecnico?.split(" ")[0] ?? "-", icon: Trophy, color: "bg-white" },
        ].map((card) => (
          <div key={card.label} className={`rounded-[1.5rem] border border-slate-200 p-5 shadow-sm ${card.color}`}>
            <card.icon className="mb-7 h-5 w-5 text-slate-500" />
            <p className="text-2xl font-black text-slate-950">{card.value}</p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black text-slate-900">Ingresos mensuales</h2>
              <p className="text-xs text-slate-500">Facturas pagadas agrupadas por mes</p>
            </div>
            <BarChart3 className="h-5 w-5 text-slate-300" />
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={ingresos} barSize={38}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip formatter={(value) => [`S/ ${Number(value).toLocaleString()}`, "Total"]} contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
              <Bar dataKey="total" fill="#0f1f33" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5">
            <h2 className="text-sm font-black text-slate-900">Disponibilidad por sede</h2>
            <p className="text-xs text-slate-500">Porcentaje calculado con equipos activos</p>
          </div>
          <ResponsiveContainer width="100%" height={310}>
            <PieChart>
              <Pie data={sedes} dataKey="disponibilidad" nameKey="sede" cx="50%" cy="50%" outerRadius={108} innerRadius={62} paddingAngle={4}>
                {sedes.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`${value}%`, "Disponibilidad"]} contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid gap-2">
            {sedes.map((sede, index) => (
              <div key={sede.sede} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLORS[index % COLORS.length] }} />
                  <span className="text-sm font-bold text-slate-800">{sede.sede}</span>
                </div>
                <span className="text-sm font-black text-slate-950">{sede.disponibilidad}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-5">
          <h2 className="text-sm font-black text-slate-900">Tickets resueltos por tecnico</h2>
          <p className="text-xs text-slate-500">Rendimiento del equipo de soporte</p>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={tecnicos} layout="vertical" barSize={26}>
            <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
            <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8" }} />
            <YAxis type="category" dataKey="tecnico" width={150} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#64748b" }} />
            <Tooltip contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }} />
            <Bar dataKey="resueltos" fill="#f97316" radius={[0, 10, 10, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>
    </div>
  );
}

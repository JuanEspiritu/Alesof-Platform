"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
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
const COLORS = ["#1e3a5f", "#f97316", "#10b981", "#6366f1", "#ef4444"];

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
      } catch {}
      finally { setLoading(false); }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-80" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        {/* Ingresos por mes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Ingresos por mes (pagados)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={ingresos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [`S/ ${Number(v).toLocaleString()}`, "Total"]} />
                <Bar dataKey="total" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Tickets resueltos por técnico */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tickets resueltos por técnico</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tecnicos} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis type="category" dataKey="tecnico" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="resueltos" fill="#f97316" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Disponibilidad por sede */}
        <Card>
          <CardHeader><CardTitle className="text-base">Disponibilidad por sede</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={sedes}
                  dataKey="disponibilidad"
                  nameKey="sede"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ sede, disponibilidad }: any) => `${sede}: ${disponibilidad}%`}
                >
                  {sedes.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => [`${v}%`, "Disponibilidad"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resumen de sedes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Detalle por sede</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sedes.map(s => (
                <div key={s.sede} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{s.sede}</h4>
                    <span className="text-sm font-medium">{s.disponibilidad}%</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-200">
                    <div
                      className={`h-3 rounded-full ${s.disponibilidad >= 90 ? "bg-green-500" : s.disponibilidad >= 70 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${s.disponibilidad}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {s.activos} activos de {s.total_equipos} equipos
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

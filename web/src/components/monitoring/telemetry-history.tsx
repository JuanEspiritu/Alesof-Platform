"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Cpu, Database, MemoryStick, RefreshCw } from "lucide-react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface Hypervisor {
  id: number;
  name: string;
  provider: string;
  last_check: string;
}

interface MetricPoint {
  id: number;
  metric: "cpu_percent" | "ram_percent" | "datastore_percent";
  value: number;
  unit: string;
  provenance: string;
  created_at: string;
}

const charts = [
  { metric: "cpu_percent", label: "CPU", color: "#0f766e", icon: Cpu },
  { metric: "ram_percent", label: "Memoria", color: "#2563eb", icon: MemoryStick },
  { metric: "datastore_percent", label: "Datastore", color: "#d97706", icon: Database },
] as const;

export function TelemetryHistory() {
  const [hypervisors, setHypervisors] = useState<Hypervisor[]>([]);
  const [selected, setSelected] = useState("");
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [checkedAt, setCheckedAt] = useState(0);

  const loadMetrics = useCallback(async (resource: string, quiet = false) => {
    if (!resource) return;
    if (!quiet) setRefreshing(true);
    try {
      const { data } = await api.get<MetricPoint[]>(`/api/metrics/${encodeURIComponent(resource)}?limit=300`);
      setMetrics(data);
    } catch {
      if (!quiet) toast.error("No se pudo cargar la telemetria historica");
    } finally {
      setCheckedAt(Date.now());
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    api.get<Hypervisor[]>("/api/hypervisors")
      .then(({ data }) => {
        setHypervisors(data);
        setSelected(data[0]?.name ?? "");
        if (data[0]?.name) void loadMetrics(data[0].name);
      })
      .catch(() => {
        setLoading(false);
        toast.error("No se pudieron cargar los hipervisores");
      });
  }, [loadMetrics]);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setInterval(() => void loadMetrics(selected, true), 60_000);
    return () => window.clearInterval(timer);
  }, [loadMetrics, selected]);

  const latestSource = metrics[0]?.provenance ?? "SIN DATOS";
  const newest = metrics[0]?.created_at ? new Date(metrics[0].created_at) : null;
  const stale = !newest || !checkedAt || checkedAt - newest.getTime() > 5 * 60_000;

  function selectHypervisor(name: string) {
    setSelected(name);
    setLoading(true);
    void loadMetrics(name);
  }

  const series = useMemo(() => Object.fromEntries(charts.map((chart) => [chart.metric,
    metrics.filter((point) => point.metric === chart.metric).reverse().map((point) => ({
      value: point.value,
      time: new Date(point.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      source: point.provenance,
    })),
  ])), [metrics]);

  return (
    <section className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--app-accent)" }}>
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black" style={{ color: "var(--app-text)" }}>Telemetria historica</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>Muestras persistidas por el recolector VMware.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${stale ? "border-slate-300 bg-slate-100 text-slate-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {stale ? "SIN TELEMETRIA RECIENTE" : latestSource}
          </span>
          <button type="button" title="Actualizar telemetria" onClick={() => void loadMetrics(selected)} disabled={refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-50"
            style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
        {hypervisors.map((item) => (
          <button key={item.id} type="button" onClick={() => selectHypervisor(item.name)}
            className="h-9 shrink-0 rounded-lg border px-4 text-xs font-black"
            style={{ background: selected === item.name ? "var(--app-brand)" : "var(--app-surface-soft)",
              borderColor: selected === item.name ? "var(--app-brand)" : "var(--app-border)",
              color: selected === item.name ? "#fff" : "var(--app-text)" }}>
            {item.name}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-5 grid gap-3 xl:grid-cols-3">{charts.map((chart) => <Skeleton key={chart.metric} className="h-64 rounded-lg" />)}</div>
      ) : metrics.length === 0 ? (
        <div className="mt-5 flex min-h-52 flex-col items-center justify-center border border-dashed px-5 text-center" style={{ borderColor: "var(--app-border)", borderRadius: 8 }}>
          <Database className="h-7 w-7" style={{ color: "var(--app-muted)" }} />
          <p className="mt-3 text-sm font-black" style={{ color: "var(--app-text)" }}>Todavia no existen muestras para {selected}</p>
          <p className="mt-1 max-w-lg text-xs leading-5" style={{ color: "var(--app-muted)" }}>Configura VMware y deja activo el scheduler. La pagina mostrara datos cuando el backend confirme su procedencia.</p>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {charts.map((chart) => {
            const data = series[chart.metric] ?? [];
            const latest = data.at(-1)?.value;
            return (
              <article key={chart.metric} className="border p-4" style={{ borderColor: "var(--app-border)", borderRadius: 8 }}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <chart.icon className="h-4 w-4" style={{ color: chart.color }} />
                    <h3 className="text-xs font-black" style={{ color: "var(--app-text)" }}>{chart.label}</h3>
                  </div>
                  <strong className="text-lg" style={{ color: "var(--app-text)" }}>{latest == null ? "-" : `${latest.toFixed(1)}%`}</strong>
                </div>
                <div className="mt-4 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 8, left: -24, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--app-border)" strokeDasharray="3 3" />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} minTickGap={28} tick={{ fontSize: 10, fill: "var(--app-muted)" }} />
                      <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "var(--app-muted)" }} />
                      <Tooltip contentStyle={{ borderRadius: 8, borderColor: "var(--app-border)", background: "var(--app-surface)", color: "var(--app-text)", fontSize: 11 }} />
                      <Line type="monotone" dataKey="value" stroke={chart.color} strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

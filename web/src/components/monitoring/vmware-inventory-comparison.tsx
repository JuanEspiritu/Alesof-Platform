"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, CheckCircle2, CircleHelp, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

type ComparisonStatus = "CORRECT" | "MISSING" | "MOVE" | "RENAME" | "UNPLANNED" | "NO_DATA";

interface ComparisonData {
  summary: Record<ComparisonStatus, number>;
  hosts: Array<{ name: string; management_ip: string | null; collected_at: string | null; discovered_count: number }>;
  items: Array<{
    expected_name: string | null;
    role: string;
    expected_host: string | null;
    actual_name: string | null;
    actual_host: string | null;
    status: ComparisonStatus;
  }>;
}

const statusConfig: Record<ComparisonStatus, { label: string; className: string }> = {
  CORRECT: { label: "Correcto", className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  MISSING: { label: "Falta", className: "border-red-200 bg-red-50 text-red-700" },
  MOVE: { label: "Mover", className: "border-orange-200 bg-orange-50 text-orange-700" },
  RENAME: { label: "Renombrar", className: "border-amber-200 bg-amber-50 text-amber-700" },
  UNPLANNED: { label: "No planificada", className: "border-violet-200 bg-violet-50 text-violet-700" },
  NO_DATA: { label: "Sin datos", className: "border-slate-300 bg-slate-100 text-slate-600" },
};

export function VMwareInventoryComparison() {
  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const response = await api.get<ComparisonData>("/api/hypervisors/inventory/compare");
      setData(response.data);
    } catch {
      toast.error("No se pudo cargar la comparacion VMware");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    api.get<ComparisonData>("/api/hypervisors/inventory/compare")
      .then(({ data: nextData }) => active && setData(nextData))
      .catch(() => toast.error("No se pudo cargar la comparacion VMware"))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <Skeleton className="h-96 rounded-lg" />;
  if (!data) return null;

  const actionable = data.summary.MISSING + data.summary.MOVE + data.summary.RENAME + data.summary.UNPLANNED;
  const pendingSnapshots = data.summary.NO_DATA > 0;

  return (
    <section className="border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)", borderRadius: 8 }}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white" style={{ background: "var(--app-brand)" }}>
            <ArrowRightLeft className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-black" style={{ color: "var(--app-text)" }}>Inventario objetivo vs. VMware</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--app-muted)" }}>Comparacion de solo lectura. No mueve ni renombra maquinas virtuales.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black ${pendingSnapshots ? "border-slate-300 bg-slate-100 text-slate-600" : actionable ? "border-amber-200 bg-amber-50 text-amber-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {pendingSnapshots ? "Pendiente de sincronizar" : actionable ? `${actionable} diferencias` : "Topologia alineada"}
          </span>
          <button type="button" title="Actualizar comparacion" onClick={() => void load()} disabled={refreshing}
            className="flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-50"
            style={{ borderColor: "var(--app-border)", color: "var(--app-text)" }}>
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {(Object.keys(statusConfig) as ComparisonStatus[]).map((status) => (
          <div key={status} className="rounded-lg border p-3" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-soft)" }}>
            <p className="text-xl font-black" style={{ color: "var(--app-text)" }}>{data.summary[status] ?? 0}</p>
            <p className="mt-1 text-[10px] font-black uppercase" style={{ color: "var(--app-muted)" }}>{statusConfig[status].label}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 space-y-4">
        {data.hosts.map((host) => {
          const rows = data.items.filter((item) => item.expected_host === host.name || (!item.expected_host && item.actual_host === host.name));
          return (
            <article key={host.name} className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--app-border)" }}>
              <header className="flex flex-col justify-between gap-3 border-b px-4 py-3 sm:flex-row sm:items-center" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-soft)" }}>
                <div className="flex items-center gap-3">
                  <Server className="h-4 w-4" style={{ color: "var(--app-accent)" }} />
                  <div>
                    <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{host.name}</p>
                    <p className="text-[11px]" style={{ color: "var(--app-muted)" }}>{host.management_ip ?? "IP no registrada"} · {host.discovered_count} descubiertas</p>
                  </div>
                </div>
                <p className="text-[11px] font-bold" style={{ color: "var(--app-muted)" }}>
                  {host.collected_at ? `Ultimo inventario: ${new Date(host.collected_at).toLocaleString()}` : "Sin inventario VMware"}
                </p>
              </header>
              <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
                {rows.map((item, index) => (
                  <div key={`${host.name}-${item.expected_name ?? item.actual_name}-${index}`} className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_1fr_140px] md:items-center">
                    <div>
                      <p className="text-xs font-black" style={{ color: "var(--app-text)" }}>{item.expected_name ?? item.actual_name}</p>
                      <p className="mt-1 text-[11px]" style={{ color: "var(--app-muted)" }}>{item.role}</p>
                    </div>
                    <div className="text-[11px]" style={{ color: "var(--app-muted)" }}>
                      {item.status === "MOVE" && `${item.actual_name} esta en ${item.actual_host}`}
                      {item.status === "RENAME" && `${item.actual_name} debe llamarse ${item.expected_name}`}
                      {item.status === "MISSING" && `No encontrada en ${item.expected_host}`}
                      {item.status === "CORRECT" && `${item.actual_name} en ${item.actual_host}`}
                      {item.status === "UNPLANNED" && `${item.actual_name} en ${item.actual_host}`}
                      {item.status === "NO_DATA" && "Sin snapshot para comparar"}
                    </div>
                    <span className={`w-fit rounded-full border px-2.5 py-1 text-[10px] font-black ${statusConfig[item.status].className}`}>
                      {item.status === "CORRECT" ? <CheckCircle2 className="mr-1 inline h-3 w-3" /> : item.status === "NO_DATA" ? <CircleHelp className="mr-1 inline h-3 w-3" /> : <TriangleAlert className="mr-1 inline h-3 w-3" />}
                      {statusConfig[item.status].label}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowUpRight,
  BriefcaseBusiness,
  CheckCircle2,
  Filter,
  Search,
} from "lucide-react";

interface ModuleStat {
  label: string;
  value: string | number;
  tone: "brand" | "accent" | "success" | "warning" | "critical" | "soft";
}

interface ModuleFilter {
  key: string;
  label: string;
  options: string[];
}

interface ModuleRecord {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  priority: string;
  owner: string;
  category: string;
  href?: string;
  meta: Array<{ label: string; value: string | number }>;
  metrics: Array<{ label: string; value: string | number }>;
}

interface ModuleResponse {
  title: string;
  description: string;
  updated_at: string;
  stats: ModuleStat[];
  filters: ModuleFilter[];
  records: ModuleRecord[];
}

const statTone = {
  brand: { background: "var(--app-brand)", color: "#ffffff" },
  accent: { background: "var(--app-accent)", color: "#ffffff" },
  success: { background: "#059669", color: "#ffffff" },
  warning: { background: "#f97316", color: "#ffffff" },
  critical: { background: "#dc2626", color: "#ffffff" },
  soft: { background: "var(--app-surface-soft)", color: "var(--app-text)" },
};

const statusClass: Record<string, string> = {
  Operativo: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Vigente: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Cumple: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Exitoso: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Degradado: "border-amber-200 bg-amber-50 text-amber-700",
  Revision: "border-amber-200 bg-amber-50 text-amber-700",
  Pendiente: "border-amber-200 bg-amber-50 text-amber-700",
  "Con riesgo": "border-amber-200 bg-amber-50 text-amber-700",
  "En ejecucion": "border-sky-200 bg-sky-50 text-sky-700",
  Planificado: "border-indigo-200 bg-indigo-50 text-indigo-700",
  Critico: "border-red-200 bg-red-50 text-red-700",
  Atencion: "border-red-200 bg-red-50 text-red-700",
  Suspendido: "border-slate-200 bg-slate-100 text-slate-600",
};

export function EnterpriseModulePage({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState<ModuleResponse | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.get<ModuleResponse>(endpoint)
      .then(({ data: next }) => {
        if (active) setData(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint]);

  const firstFilter = data?.filters[0];
  const records = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.records ?? []).filter((record) => {
      const matchesQuery = !normalized || [
        record.title,
        record.subtitle,
        record.owner,
        record.category,
        record.status,
        record.priority,
        ...record.meta.map((item) => String(item.value)),
        ...record.metrics.map((item) => String(item.value)),
      ].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = status === "Todos" || record.status === status;
      return matchesQuery && matchesStatus;
    });
  }, [data?.records, query, status]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-64 rounded-[1.5rem]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-[1.5rem]" />
          <Skeleton className="h-72 rounded-[1.5rem]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-[1.5rem] border p-6" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>No se pudo cargar el modulo empresarial.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[1.5rem] border shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="h-1.5" style={{ background: "linear-gradient(90deg, var(--app-brand), var(--app-accent))" }} />
        <div className="grid gap-6 p-6 xl:grid-cols-[1fr_520px]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-black" style={{ borderColor: "var(--app-border)", color: "var(--app-accent)", background: "var(--app-surface-soft)" }}>
              <BriefcaseBusiness className="h-3.5 w-3.5" />
              Gestion empresarial Alesof
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl" style={{ color: "var(--app-text)" }}>{data.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6" style={{ color: "var(--app-muted)" }}>{data.description}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.stats.map((stat) => (
              <div key={stat.label} className="rounded-2xl border p-4" style={{ ...statTone[stat.tone], borderColor: "var(--app-border)" }}>
                <p className="text-3xl font-black leading-none">{stat.value}</p>
                <p className="mt-2 text-xs font-bold opacity-75">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[1.5rem] border p-4 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
        <div className="grid gap-3 md:grid-cols-[1fr_260px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--app-muted)" }} />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por cliente, sede, responsable, estado o metrica"
              className="h-11 rounded-2xl pl-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 rounded-2xl border px-3" style={{ borderColor: "var(--app-border)", background: "var(--app-surface-soft)" }}>
            <Filter className="h-4 w-4" style={{ color: "var(--app-muted)" }} />
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-10 flex-1 bg-transparent text-sm font-bold outline-none"
              style={{ color: "var(--app-text)" }}
            >
              <option>Todos</option>
              {firstFilter?.options.map((option) => <option key={option}>{option}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        {records.map((record) => (
          <article key={record.id} className="rounded-[1.5rem] border p-5 shadow-sm" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${statusClass[record.status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
                    {record.status}
                  </span>
                  <Badge className="rounded-full bg-slate-100 text-slate-600 hover:bg-slate-100">{record.priority}</Badge>
                </div>
                <h2 className="truncate text-lg font-black" style={{ color: "var(--app-text)" }}>{record.title}</h2>
                <p className="mt-2 text-sm leading-6" style={{ color: "var(--app-muted)" }}>{record.subtitle}</p>
              </div>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white" style={{ background: "var(--app-brand)" }}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {record.meta.map((item) => <InfoBlock key={`${record.id}-${item.label}`} label={item.label} value={item.value} />)}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {record.metrics.map((item) => <MetricBlock key={`${record.id}-${item.label}`} label={item.label} value={item.value} />)}
            </div>

            <div className="mt-5 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--app-border)" }}>
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide" style={{ color: "var(--app-muted)" }}>Responsable</p>
                <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>{record.owner}</p>
              </div>
              {record.href ? (
                <Link href={record.href} className="inline-flex items-center gap-1 text-sm font-black" style={{ color: "var(--app-accent)" }}>
                  Abrir <ArrowUpRight className="h-4 w-4" />
                </Link>
              ) : (
                <span className="text-xs font-bold" style={{ color: "var(--app-muted)" }}>{record.category}</span>
              )}
            </div>
          </article>
        ))}
      </section>

      {!records.length && (
        <div className="rounded-[1.5rem] border p-8 text-center" style={{ background: "var(--app-surface)", borderColor: "var(--app-border)" }}>
          <p className="text-sm font-black" style={{ color: "var(--app-text)" }}>No hay resultados con esos filtros.</p>
        </div>
      )}
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl px-4 py-3" style={{ background: "var(--app-surface-soft)" }}>
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--app-muted)" }}>{label}</p>
      <p className="mt-1 truncate text-sm font-black" style={{ color: "var(--app-text)" }}>{value}</p>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "var(--app-border)" }}>
      <p className="text-[10px] font-black uppercase tracking-wide" style={{ color: "var(--app-muted)" }}>{label}</p>
      <p className="mt-1 text-sm font-black" style={{ color: "var(--app-accent)" }}>{value}</p>
    </div>
  );
}

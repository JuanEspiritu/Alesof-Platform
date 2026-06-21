"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { getUser } from "@/lib/auth";
import { getErrorMessage } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Pencil, Trash2, Loader2, HardDrive, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Equipo {
  id: number; nombre: string; tipo: string; marca: string; modelo: string;
  serie: string; sede: string; vlan: string | null; ip: string | null; estado: string;
}

const tipos      = ["router", "switch", "servidor", "access_point", "aws_resource"];
const sedesOpts  = ["Lima", "Arequipa", "AWS"];
const estadosOpts = ["activo", "mantenimiento", "dañado", "retirado"];

const emptyForm = {
  nombre: "", tipo: "router", marca: "", modelo: "", serie: "", sede: "Lima", vlan: "", ip: "", estado: "activo",
};

const estadoBadge: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  activo:        { label: "Activo",        bg: "rgba(22,163,74,0.1)",   color: "#15803d", dot: "#16a34a" },
  mantenimiento: { label: "Mantenimiento", bg: "rgba(234,179,8,0.12)",  color: "#a16207", dot: "#ca8a04" },
  dañado:        { label: "Dañado",        bg: "rgba(220,38,38,0.1)",   color: "#b91c1c", dot: "#dc2626" },
  retirado:      { label: "Retirado",      bg: "rgba(100,116,139,0.1)", color: "#475569", dot: "#94a3b8" },
};
const tipoColor: Record<string, string> = {
  router: "#1e3a5f", switch: "#0891b2", servidor: "#059669", access_point: "#f97316", aws_resource: "#7c3aed",
};

export default function InventarioPage() {
  const [items, setItems]     = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [filterSede, setFilterSede] = useState("todos");
  const [filterEstado, setFilterEstado] = useState("todos");
  const [page, setPage]       = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Equipo | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);
  const user = getUser();
  const canWrite = user?.rol === "administrador" || user?.rol === "supervisor";
  const canDelete = user?.rol === "administrador";

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/inventario/", {
        params: {
          search,
          tipo: filterTipo === "todos" ? "" : filterTipo,
          sede: filterSede === "todos" ? "" : filterSede,
          estado: filterEstado === "todos" ? "" : filterEstado,
          page,
          limit: 10,
        },
      });
      setItems(data);
    } catch { toast.error("Error al cargar inventario"); }
    finally { setLoading(false); }
  }, [search, filterTipo, filterSede, filterEstado, page]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeout);
  }, [load]);

  function openCreate() {
    if (!canWrite) {
      toast.info("Tu rol solo permite consultar inventario.");
      return;
    }
    setEditing(null); setForm(emptyForm); setDialogOpen(true);
  }
  function openEdit(eq: Equipo) {
    if (!canWrite) {
      toast.info("Tu rol solo permite consultar inventario.");
      return;
    }
    setEditing(eq);
    setForm({ nombre: eq.nombre, tipo: eq.tipo, marca: eq.marca, modelo: eq.modelo, serie: eq.serie, sede: eq.sede, vlan: eq.vlan ?? "", ip: eq.ip ?? "", estado: eq.estado });
    setDialogOpen(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true);
    const payload = { ...form, vlan: form.vlan || null, ip: form.ip || null };
    try {
      if (editing) { await api.put(`/api/inventario/${editing.id}`, payload); toast.success("Equipo actualizado"); }
      else         { await api.post("/api/inventario/", payload);             toast.success("Equipo creado"); }
      setDialogOpen(false); load();
    } catch (err: unknown) { toast.error(getErrorMessage(err, "Error al guardar")); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este equipo?")) return;
    try { await api.delete(`/api/inventario/${id}`); toast.success("Equipo eliminado"); load(); }
    catch (err: unknown) { toast.error(getErrorMessage(err, "Error al eliminar")); }
  }
  const hasFilters = search || filterTipo !== "todos" || filterSede !== "todos" || filterEstado !== "todos";

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(8,145,178,0.1)" }}>
            <HardDrive className="h-5 w-5" style={{ color: "#0891b2" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>Inventario</h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Equipos de red e infraestructura</p>
          </div>
        </div>
        {canWrite && (
          <Button onClick={openCreate}
            style={{ background: "#1e3a5f", color: "#fff", fontWeight: 600, borderRadius: 12, height: 40, paddingLeft: 18, paddingRight: 18, boxShadow: "0 4px 12px rgba(30,58,95,0.25)" }}
            className="gap-1.5">
            <Plus className="h-4 w-4" /> Nuevo Equipo
          </Button>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white p-3 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_160px_150px_170px_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input placeholder="Buscar por nombre o serie..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-9 text-sm"
              value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <Select value={filterTipo} onValueChange={(value) => { setFilterTipo(value); setPage(1); }}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los tipos</SelectItem>
              {tipos.map((tipo) => <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterSede} onValueChange={(value) => { setFilterSede(value); setPage(1); }}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas las sedes</SelectItem>
              {sedesOpts.map((sede) => <SelectItem key={sede} value={sede}>{sede}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={(value) => { setFilterEstado(value); setPage(1); }}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los estados</SelectItem>
              {estadosOpts.map((estado) => <SelectItem key={estado} value={estado}>{estado}</SelectItem>)}
            </SelectContent>
          </Select>
          <button
            type="button"
            disabled={!hasFilters}
            onClick={() => { setSearch(""); setFilterTipo("todos"); setFilterSede("todos"); setFilterEstado("todos"); setPage(1); }}
            className="h-11 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pl-5">Nombre</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Tipo</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Marca / Modelo</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden lg:table-cell">Serie</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Sede</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden lg:table-cell">IP</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</TableHead>
                {canWrite && <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right pr-5">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(eq => {
                const st = estadoBadge[eq.estado];
                const tc = tipoColor[eq.tipo] ?? "#475569";
                return (
                  <TableRow key={eq.id} className="hover:bg-slate-50/60 border-slate-100">
                    <TableCell className="font-semibold text-slate-800 text-[13px] pl-5">{eq.nombre}</TableCell>
                    <TableCell>
                      <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md capitalize"
                        style={{ background: tc + "15", color: tc }}>{eq.tipo}</span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-[13px] hidden md:table-cell">{eq.marca} {eq.modelo}</TableCell>
                    <TableCell className="font-mono text-xs text-slate-400 hidden lg:table-cell">{eq.serie}</TableCell>
                    <TableCell>
                      <span className="text-[12px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "#f1f5f9", color: "#334155" }}>{eq.sede}</span>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-400 hidden lg:table-cell">{eq.ip ?? "—"}</TableCell>
                    <TableCell>
                      {st && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: st.bg, color: st.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      )}
                    </TableCell>
                    {canWrite && (
                      <TableCell className="text-right pr-5">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(eq)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {canDelete && (
                            <button onClick={() => handleDelete(eq.id)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canWrite ? 8 : 7} className="py-16 text-center">
                    <HardDrive className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No se encontraron equipos</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          className="flex h-9 items-center gap-1.5 px-3.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          style={{ borderColor: "#e2e8f0", color: "#374151" }}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
        <span className="px-3.5 h-9 flex items-center text-sm font-semibold rounded-xl"
          style={{ background: "#1e3a5f", color: "#fff", minWidth: 80, justifyContent: "center" }}>
          Página {page}
        </span>
        <button disabled={items.length < 10} onClick={() => setPage(p => p + 1)}
          className="flex h-9 items-center gap-1.5 px-3.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
          style={{ borderColor: "#e2e8f0", color: "#374151" }}>
          Siguiente <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {editing ? "Editar equipo" : "Nuevo equipo"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nombre</Label>
                <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({...form, tipo: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{tipos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Marca</Label>
                <Input value={form.marca} onChange={e => setForm({...form, marca: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Modelo</Label>
                <Input value={form.modelo} onChange={e => setForm({...form, modelo: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nro. Serie</Label>
                <Input value={form.serie} onChange={e => setForm({...form, serie: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Sede</Label>
                <Select value={form.sede} onValueChange={v => setForm({...form, sede: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{sedesOpts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">VLAN</Label>
                <Input value={form.vlan} onChange={e => setForm({...form, vlan: e.target.value})} placeholder="VLAN 10" className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">IP</Label>
                <Input value={form.ip} onChange={e => setForm({...form, ip: e.target.value})} placeholder="10.10.10.1" className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm({...form, estado: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{estadosOpts.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10 rounded-xl text-sm font-medium">Cancelar</Button>
              <Button type="submit" disabled={saving}
                style={{ background: "#1e3a5f", color: "#fff", height: 40, borderRadius: 12, fontWeight: 600 }}
                className="hover:brightness-110 transition-all gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear equipo"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

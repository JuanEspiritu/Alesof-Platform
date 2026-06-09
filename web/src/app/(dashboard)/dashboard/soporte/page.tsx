"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Loader2, Headset, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Ticket {
  id: number;
  titulo: string;
  descripcion: string;
  cliente_id: number;
  tecnico_id: number | null;
  prioridad: string;
  estado: string;
  created_at: string;
  updated_at: string;
  cliente_nombre: string | null;
  tecnico_nombre: string | null;
}

const prioridadBadge: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  baja:    { label: "Baja",    bg: "rgba(22,163,74,0.1)",  color: "#15803d", dot: "#16a34a" },
  media:   { label: "Media",   bg: "rgba(234,179,8,0.12)", color: "#a16207", dot: "#ca8a04" },
  alta:    { label: "Alta",    bg: "rgba(249,115,22,0.12)", color: "#c2410c", dot: "#ea580c" },
  crítica: { label: "Crítica", bg: "rgba(220,38,38,0.1)",  color: "#b91c1c", dot: "#dc2626" },
};
const estadoBadge: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  abierto:    { label: "Abierto",     bg: "rgba(59,130,246,0.1)",  color: "#1d4ed8", dot: "#3b82f6" },
  en_proceso: { label: "En proceso",  bg: "rgba(234,179,8,0.12)",  color: "#a16207", dot: "#ca8a04" },
  resuelto:   { label: "Resuelto",    bg: "rgba(22,163,74,0.1)",   color: "#15803d", dot: "#16a34a" },
  cerrado:    { label: "Cerrado",     bg: "rgba(100,116,139,0.1)", color: "#475569", dot: "#94a3b8" },
};

const emptyForm = {
  titulo: "", descripcion: "", cliente_id: "", tecnico_id: "", prioridad: "media", estado: "abierto",
};

export default function SoportePage() {
  const [items, setItems]     = useState<Ticket[]>([]);
  const [clientes, setClientes] = useState<{id: number; nombre: string}[]>([]);
  const [tecnicos, setTecnicos] = useState<{id: number; nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEstado, setFilterEstado] = useState("");
  const [page, setPage]       = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    try {
      const [tRes, cRes, eRes] = await Promise.all([
        api.get("/api/soporte/", { params: { estado: filterEstado, page, limit: 10 } }),
        api.get("/api/clientes/", { params: { limit: 100 } }).catch(() => ({ data: [] })),
        api.get("/api/empleados/", { params: { departamento: "Soporte", limit: 50 } }).catch(() => ({ data: [] })),
      ]);
      setItems(tRes.data);
      setClientes(cRes.data.map((c: any) => ({ id: c.id, nombre: c.nombre })));
      setTecnicos(eRes.data.map((e: any) => ({ id: e.id, nombre: e.nombre })));
    } catch { toast.error("Error al cargar tickets"); }
    finally { setLoading(false); }
  }, [filterEstado, page]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(t: Ticket) {
    setEditing(t);
    setForm({ titulo: t.titulo, descripcion: t.descripcion,
      cliente_id: String(t.cliente_id), tecnico_id: t.tecnico_id ? String(t.tecnico_id) : "",
      prioridad: t.prioridad, estado: t.estado });
    setDialogOpen(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true);
    try {
      const payload = editing
        ? { titulo: form.titulo, descripcion: form.descripcion, tecnico_id: form.tecnico_id ? parseInt(form.tecnico_id) : null, prioridad: form.prioridad, estado: form.estado }
        : { titulo: form.titulo, descripcion: form.descripcion, cliente_id: parseInt(form.cliente_id), tecnico_id: form.tecnico_id ? parseInt(form.tecnico_id) : null, prioridad: form.prioridad, estado: form.estado };
      if (editing) { await api.put(`/api/soporte/${editing.id}`, payload); toast.success("Ticket actualizado"); }
      else         { await api.post("/api/soporte/", payload);             toast.success("Ticket creado"); }
      setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Error al guardar"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(249,115,22,0.1)" }}>
            <Headset className="h-5 w-5" style={{ color: "#f97316" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>Soporte</h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Gestión de tickets de incidencias</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterEstado} onValueChange={v => { setFilterEstado(v === "todos" ? "" : v); setPage(1); }}>
            <SelectTrigger className="w-36 h-10 rounded-xl text-sm border-slate-200">
              <SelectValue placeholder="Filtrar estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="abierto">Abierto</SelectItem>
              <SelectItem value="en_proceso">En proceso</SelectItem>
              <SelectItem value="resuelto">Resuelto</SelectItem>
              <SelectItem value="cerrado">Cerrado</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openCreate}
            style={{ background: "#1e3a5f", color: "#fff", fontWeight: 600, borderRadius: 12, height: 40, paddingLeft: 18, paddingRight: 18, boxShadow: "0 4px 12px rgba(30,58,95,0.25)" }}
            className="hover:brightness-110 transition-all gap-1.5">
            <Plus className="h-4 w-4" /> Nuevo Ticket
          </Button>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pl-5 w-16">ID</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Título</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Cliente</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Técnico</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Prioridad</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(t => {
                const pr = prioridadBadge[t.prioridad];
                const st = estadoBadge[t.estado];
                return (
                  <TableRow key={t.id} className="hover:bg-slate-50/60 border-slate-100">
                    <TableCell className="font-mono text-xs text-slate-400 font-medium pl-5">#{t.id}</TableCell>
                    <TableCell className="font-semibold text-slate-800 text-[13px] max-w-[200px] truncate">{t.titulo}</TableCell>
                    <TableCell className="text-slate-500 text-[13px] hidden md:table-cell">{t.cliente_nombre ?? "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {t.tecnico_nombre
                        ? <span className="text-[13px] text-slate-600">{t.tecnico_nombre}</span>
                        : <span className="text-[12px] italic text-slate-300">Sin asignar</span>}
                    </TableCell>
                    <TableCell>
                      {pr && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: pr.bg, color: pr.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: pr.dot }} />
                          {pr.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {st && (
                        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: st.bg, color: st.color }}>
                          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-5">
                      <button onClick={() => openEdit(t)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 ml-auto">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <Headset className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No hay tickets registrados</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Paginación */}
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {editing ? "Editar ticket" : "Nuevo ticket"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Título</Label>
              <Input value={form.titulo} onChange={e => setForm({...form, titulo: e.target.value})}
                required className="h-10 rounded-xl text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Descripción</Label>
              <Textarea value={form.descripcion} onChange={e => setForm({...form, descripcion: e.target.value})}
                rows={3} required className="rounded-xl text-sm" />
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Cliente</Label>
                <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Técnico</Label>
                <Select value={form.tecnico_id || "none"} onValueChange={v => setForm({...form, tecnico_id: v === "none" ? "" : v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {tecnicos.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Prioridad</Label>
                <Select value={form.prioridad} onValueChange={v => setForm({...form, prioridad: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja">Baja</SelectItem>
                    <SelectItem value="media">Media</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                    <SelectItem value="crítica">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm({...form, estado: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abierto">Abierto</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="resuelto">Resuelto</SelectItem>
                    <SelectItem value="cerrado">Cerrado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                className="h-10 rounded-xl text-sm font-medium">Cancelar</Button>
              <Button type="submit" disabled={saving}
                style={{ background: "#1e3a5f", color: "#fff", height: 40, borderRadius: 12, fontWeight: 600 }}
                className="hover:brightness-110 transition-all gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear ticket"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

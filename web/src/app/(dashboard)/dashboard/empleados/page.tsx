"use client";

import { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { toast } from "sonner";
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
import { Plus, Search, Pencil, Trash2, Loader2, UserCog, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Empleado {
  id: number; nombre: string; dni: string; email: string;
  cargo: string; departamento: string; sede: string; estado: string;
}

const departamentos = ["TI", "Soporte", "Ventas", "Administración", "Operaciones"];
const sedesOpts     = ["Lima", "Arequipa", "AWS"];
const emptyForm = { nombre: "", dni: "", email: "", cargo: "", departamento: "TI", sede: "Lima", estado: "activo" };

const estadoBadge: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  activo:   { label: "Activo",   bg: "rgba(22,163,74,0.1)",   color: "#15803d", dot: "#16a34a" },
  inactivo: { label: "Inactivo", bg: "rgba(220,38,38,0.1)",   color: "#b91c1c", dot: "#dc2626" },
};
const deptColors: Record<string, string> = {
  TI: "#1e3a5f", Soporte: "#f97316", Ventas: "#8b5cf6", Administración: "#0891b2", Operaciones: "#059669",
};

export default function EmpleadosPage() {
  const [items, setItems]     = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [page, setPage]       = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Empleado | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/empleados/", { params: { search, page, limit: 10 } });
      setItems(data);
    } catch { toast.error("Error al cargar empleados"); }
    finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(e: Empleado) {
    setEditing(e);
    setForm({ nombre: e.nombre, dni: e.dni, email: e.email, cargo: e.cargo, departamento: e.departamento, sede: e.sede, estado: e.estado });
    setDialogOpen(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true);
    try {
      if (editing) { await api.put(`/api/empleados/${editing.id}`, form); toast.success("Empleado actualizado"); }
      else         { await api.post("/api/empleados/", form);             toast.success("Empleado creado"); }
      setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este empleado?")) return;
    try { await api.delete(`/api/empleados/${id}`); toast.success("Empleado eliminado"); load(); }
    catch (err: any) { toast.error(err.response?.data?.detail || "Error al eliminar"); }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(139,92,246,0.1)" }}>
            <UserCog className="h-5 w-5" style={{ color: "#7c3aed" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>Empleados</h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Gestión del personal de Alesof</p>
          </div>
        </div>
        <Button onClick={openCreate}
          style={{ background: "#1e3a5f", color: "#fff", fontWeight: 600, borderRadius: 12, height: 40, paddingLeft: 18, paddingRight: 18, boxShadow: "0 4px 12px rgba(30,58,95,0.25)" }}
          className="hover:brightness-110 transition-all gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo Empleado
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar por nombre o DNI..."
          className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-sm"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                {["Nombre","DNI","Email","Cargo","Depto.","Sede","Estado",""].map((h, i) => (
                  <TableHead key={i}
                    className={`text-[11px] font-semibold uppercase tracking-wide text-slate-400 ${i === 0 ? "pl-5" : ""} ${i === 4 || i === 5 ? "hidden lg:table-cell" : ""} ${i === 2 ? "hidden md:table-cell" : ""} ${i === 7 ? "text-right pr-5" : ""}`}>
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(e => {
                const st = estadoBadge[e.estado];
                const deptColor = deptColors[e.departamento] ?? "#475569";
                return (
                  <TableRow key={e.id} className="hover:bg-slate-50/60 border-slate-100">
                    <TableCell className="font-semibold text-slate-800 text-[13px] pl-5">{e.nombre}</TableCell>
                    <TableCell className="font-mono text-slate-500 text-[13px]">{e.dni}</TableCell>
                    <TableCell className="text-slate-500 text-[13px] hidden md:table-cell">{e.email}</TableCell>
                    <TableCell className="text-slate-600 text-[13px] hidden lg:table-cell">{e.cargo}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-[12px] font-semibold px-2 py-0.5 rounded-md"
                        style={{ background: deptColor + "15", color: deptColor }}>{e.departamento}</span>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-[12px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "#f1f5f9", color: "#334155" }}>{e.sede}</span>
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
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(e)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(e.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-16 text-center">
                    <UserCog className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No se encontraron empleados</p>
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
              {editing ? "Editar empleado" : "Nuevo empleado"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Nombre</Label>
                <Input value={form.nombre} onChange={e => setForm({...form, nombre: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">DNI</Label>
                <Input value={form.dni} onChange={e => setForm({...form, dni: e.target.value})} maxLength={8} required className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Email</Label>
                <Input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Cargo</Label>
                <Input value={form.cargo} onChange={e => setForm({...form, cargo: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Departamento", field: "departamento", opts: departamentos },
                { label: "Sede", field: "sede", opts: sedesOpts },
                { label: "Estado", field: "estado", opts: [{ v: "activo", l: "Activo" }, { v: "inactivo", l: "Inactivo" }] as any },
              ].map(({ label, field, opts }) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">{label}</Label>
                  <Select value={(form as any)[field]} onValueChange={v => setForm({...form, [field]: v})}>
                    <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {opts.map((o: any) => typeof o === "string"
                        ? <SelectItem key={o} value={o}>{o}</SelectItem>
                        : <SelectItem key={o.v} value={o.v}>{o.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10 rounded-xl text-sm font-medium">Cancelar</Button>
              <Button type="submit" disabled={saving}
                style={{ background: "#1e3a5f", color: "#fff", height: 40, borderRadius: 12, fontWeight: 600 }}
                className="hover:brightness-110 transition-all gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear empleado"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

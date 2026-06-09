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
import { Plus, Search, Pencil, Trash2, Loader2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Cliente {
  id: number;
  nombre: string;
  ruc: string;
  email: string;
  telefono: string;
  sede: string;
  plan: string;
  estado: string;
  fecha_contrato: string;
}

const planes   = ["Básico 50Mbps", "Empresarial 200Mbps", "Premium 500Mbps", "Corporativo 1Gbps"];
const sedesOpts  = ["Lima", "Arequipa", "AWS"];
const estadosOpts = ["activo", "suspendido", "retirado"];

const emptyForm = {
  nombre: "", ruc: "", email: "", telefono: "",
  sede: "Lima", plan: "Básico 50Mbps", estado: "activo",
  fecha_contrato: new Date().toISOString().split("T")[0],
};

const estadoBadge: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  activo:     { label: "Activo",     bg: "rgba(22,163,74,0.1)",  color: "#15803d", dot: "#16a34a" },
  suspendido: { label: "Suspendido", bg: "rgba(217,119,6,0.1)",  color: "#b45309", dot: "#d97706" },
  retirado:   { label: "Retirado",   bg: "rgba(220,38,38,0.1)",  color: "#b91c1c", dot: "#dc2626" },
};

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [page, setPage]         = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing]   = useState<Cliente | null>(null);
  const [form, setForm]         = useState(emptyForm);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/clientes/", { params: { search, page, limit: 10 } });
      setClientes(data);
    } catch { toast.error("Error al cargar clientes"); }
    finally   { setLoading(false); }
  }, [search, page]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(c: Cliente) {
    setEditing(c);
    setForm({ nombre: c.nombre, ruc: c.ruc, email: c.email, telefono: c.telefono,
      sede: c.sede, plan: c.plan, estado: c.estado, fecha_contrato: c.fecha_contrato });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await api.put(`/api/clientes/${editing.id}`, form); toast.success("Cliente actualizado"); }
      else         { await api.post("/api/clientes/", form);             toast.success("Cliente creado"); }
      setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Error al guardar"); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Eliminar este cliente?")) return;
    try {
      await api.delete(`/api/clientes/${id}`);
      toast.success("Cliente eliminado");
      load();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Error al eliminar"); }
  }

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(30,58,95,0.08)" }}>
            <Users className="h-5 w-5" style={{ color: "#1e3a5f" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>Clientes</h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Gestión de clientes empresariales</p>
          </div>
        </div>
        <Button onClick={openCreate}
          style={{ background: "#1e3a5f", color: "#fff", fontWeight: 600, borderRadius: 12, height: 40, paddingLeft: 18, paddingRight: 18, boxShadow: "0 4px 12px rgba(30,58,95,0.25)" }}
          className="hover:brightness-110 transition-all gap-1.5">
          <Plus className="h-4 w-4" /> Nuevo Cliente
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input placeholder="Buscar por nombre o RUC..."
          className="pl-9 h-10 rounded-xl border-slate-200 bg-white text-sm"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table card */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pl-5">Nombre</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">RUC</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Email</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden lg:table-cell">Sede</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden lg:table-cell">Plan</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.map((c) => {
                const st = estadoBadge[c.estado];
                return (
                  <TableRow key={c.id} className="hover:bg-slate-50/60 border-slate-100">
                    <TableCell className="font-semibold text-slate-800 text-[13px] pl-5">{c.nombre}</TableCell>
                    <TableCell className="font-mono text-slate-500 text-[13px]">{c.ruc}</TableCell>
                    <TableCell className="text-slate-500 text-[13px] hidden md:table-cell">{c.email}</TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <span className="text-[12px] font-medium px-2 py-0.5 rounded-md"
                        style={{ background: "#f1f5f9", color: "#334155" }}>{c.sede}</span>
                    </TableCell>
                    <TableCell className="text-slate-500 text-[13px] hidden lg:table-cell">{c.plan}</TableCell>
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
                        <button onClick={() => openEdit(c)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(c.id)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-red-50 transition-colors text-slate-400 hover:text-red-600">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {clientes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <Users className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No se encontraron clientes</p>
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
        <button disabled={clientes.length < 10} onClick={() => setPage(p => p + 1)}
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
              {editing ? "Editar cliente" : "Nuevo cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              {[["Nombre", "nombre", "text"], ["RUC", "ruc", "text"]].map(([label, field, type]) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">{label}</Label>
                  <Input value={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                    type={type} required className="h-10 rounded-xl text-sm" maxLength={field === "ruc" ? 11 : undefined} />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[["Email", "email", "email"], ["Teléfono", "telefono", "text"]].map(([label, field, type]) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">{label}</Label>
                  <Input value={(form as any)[field]} onChange={e => setForm({...form, [field]: e.target.value})}
                    type={type} required className="h-10 rounded-xl text-sm" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Sede</Label>
                <Select value={form.sede} onValueChange={v => setForm({...form, sede: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{sedesOpts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm({...form, plan: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{planes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Estado</Label>
                <Select value={form.estado} onValueChange={v => setForm({...form, estado: v})}>
                  <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{estadosOpts.map(e => <SelectItem key={e} value={e} className="capitalize">{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Fecha contrato</Label>
                <Input type="date" value={form.fecha_contrato} onChange={e => setForm({...form, fecha_contrato: e.target.value})}
                  required className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}
                className="h-10 rounded-xl text-sm font-medium">Cancelar</Button>
              <Button type="submit" disabled={saving}
                style={{ background: "#1e3a5f", color: "#fff", height: 40, borderRadius: 12, fontWeight: 600 }}
                className="hover:brightness-110 transition-all gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear cliente"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

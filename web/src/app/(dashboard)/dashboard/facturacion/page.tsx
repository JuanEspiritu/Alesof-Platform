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
import { Plus, Pencil, Loader2, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Factura {
  id: number; cliente_id: number; numero: string; monto: number;
  fecha_emision: string; fecha_vencimiento: string; estado: string; cliente_nombre: string | null;
}

const estadoBadge: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  pendiente: { label: "Pendiente", bg: "rgba(234,179,8,0.12)",  color: "#a16207", dot: "#ca8a04" },
  pagado:    { label: "Pagado",    bg: "rgba(22,163,74,0.1)",   color: "#15803d", dot: "#16a34a" },
  vencido:   { label: "Vencido",   bg: "rgba(220,38,38,0.1)",   color: "#b91c1c", dot: "#dc2626" },
};

const emptyForm = {
  cliente_id: "", numero: "", monto: "",
  fecha_emision: new Date().toISOString().split("T")[0],
  fecha_vencimiento: "", estado: "pendiente",
};

export default function FacturacionPage() {
  const [items, setItems]     = useState<Factura[]>([]);
  const [clientes, setClientes] = useState<{id: number; nombre: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Factura | null>(null);
  const [form, setForm]       = useState(emptyForm);
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    try {
      const [fRes, cRes] = await Promise.all([
        api.get("/api/facturacion/", { params: { page, limit: 10 } }),
        api.get("/api/clientes/", { params: { limit: 100 } }),
      ]);
      setItems(fRes.data);
      setClientes(cRes.data.map((c: any) => ({ id: c.id, nombre: c.nombre })));
    } catch { toast.error("Error al cargar datos"); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  function openCreate() { setEditing(null); setForm(emptyForm); setDialogOpen(true); }
  function openEdit(f: Factura) {
    setEditing(f);
    setForm({ cliente_id: String(f.cliente_id), numero: f.numero, monto: String(f.monto),
      fecha_emision: f.fecha_emision, fecha_vencimiento: f.fecha_vencimiento, estado: f.estado });
    setDialogOpen(true);
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault(); setSaving(true);
    try {
      const payload = editing
        ? { monto: parseFloat(form.monto), fecha_vencimiento: form.fecha_vencimiento, estado: form.estado }
        : { cliente_id: parseInt(form.cliente_id), numero: form.numero, monto: parseFloat(form.monto), fecha_emision: form.fecha_emision, fecha_vencimiento: form.fecha_vencimiento, estado: form.estado };
      if (editing) { await api.put(`/api/facturacion/${editing.id}`, payload); toast.success("Factura actualizada"); }
      else         { await api.post("/api/facturacion/", payload);              toast.success("Factura creada"); }
      setDialogOpen(false); load();
    } catch (err: any) { toast.error(err.response?.data?.detail || "Error al guardar"); }
    finally { setSaving(false); }
  }

  const totalMes = items.filter(f => f.estado === "pagado").reduce((acc, f) => acc + f.monto, 0);
  const pendientes = items.filter(f => f.estado === "pendiente").length;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "rgba(5,150,105,0.1)" }}>
            <Receipt className="h-5 w-5" style={{ color: "#059669" }} />
          </div>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.02em" }}>Facturación</h1>
            <p style={{ fontSize: 12, color: "#64748b", marginTop: 1 }}>Control de facturas y cobros</p>
          </div>
        </div>
        <Button onClick={openCreate}
          style={{ background: "#1e3a5f", color: "#fff", fontWeight: 600, borderRadius: 12, height: 40, paddingLeft: 18, paddingRight: 18, boxShadow: "0 4px 12px rgba(30,58,95,0.25)" }}
          className="hover:brightness-110 transition-all gap-1.5">
          <Plus className="h-4 w-4" /> Nueva Factura
        </Button>
      </div>

      {/* Mini summary */}
      <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
        <div className="rounded-xl border border-slate-200/70 bg-white p-3.5">
          <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Cobrado</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#15803d", letterSpacing: "-0.02em", marginTop: 4 }}>
            S/ {totalMes.toLocaleString()}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-white p-3.5">
          <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pendientes</p>
          <p style={{ fontSize: 20, fontWeight: 800, color: "#a16207", letterSpacing: "-0.02em", marginTop: 4 }}>
            {pendientes} facturas
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/70 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-11 w-full rounded-xl" />)}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 pl-5">Número</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Cliente</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Monto</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Emisión</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 hidden md:table-cell">Vencimiento</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Estado</TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 text-right pr-5">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(f => {
                const st = estadoBadge[f.estado];
                return (
                  <TableRow key={f.id} className="hover:bg-slate-50/60 border-slate-100">
                    <TableCell className="font-mono text-[13px] font-semibold text-slate-700 pl-5">{f.numero}</TableCell>
                    <TableCell className="text-slate-600 text-[13px]">{f.cliente_nombre ?? "—"}</TableCell>
                    <TableCell className="font-bold text-slate-800 text-[14px]">S/ {f.monto.toLocaleString()}</TableCell>
                    <TableCell className="text-slate-400 text-[13px] hidden md:table-cell">{f.fecha_emision}</TableCell>
                    <TableCell className="text-slate-400 text-[13px] hidden md:table-cell">{f.fecha_vencimiento}</TableCell>
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
                      <button onClick={() => openEdit(f)}
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
                    <Receipt className="h-8 w-8 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm font-medium text-slate-400">No hay facturas registradas</p>
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
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              {editing ? "Editar factura" : "Nueva factura"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-1">
            {!editing && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Cliente</Label>
                  <Select value={form.cliente_id} onValueChange={v => setForm({...form, cliente_id: v})}>
                    <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                    <SelectContent>{clientes.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Número</Label>
                    <Input value={form.numero} onChange={e => setForm({...form, numero: e.target.value})} placeholder="F001-000001" required className="h-10 rounded-xl text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-600">Fecha emisión</Label>
                    <Input type="date" value={form.fecha_emision} onChange={e => setForm({...form, fecha_emision: e.target.value})} required className="h-10 rounded-xl text-sm" />
                  </div>
                </div>
              </>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Monto (S/)</Label>
                <Input type="number" step="0.01" value={form.monto} onChange={e => setForm({...form, monto: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Vencimiento</Label>
                <Input type="date" value={form.fecha_vencimiento} onChange={e => setForm({...form, fecha_vencimiento: e.target.value})} required className="h-10 rounded-xl text-sm" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm({...form, estado: v})}>
                <SelectTrigger className="h-10 rounded-xl text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-10 rounded-xl text-sm font-medium">Cancelar</Button>
              <Button type="submit" disabled={saving}
                style={{ background: "#1e3a5f", color: "#fff", height: 40, borderRadius: 12, fontWeight: 600 }}
                className="hover:brightness-110 transition-all gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? "Guardar cambios" : "Crear factura"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

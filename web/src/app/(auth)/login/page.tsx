"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { setAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Network, Loader2, Eye, EyeOff, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setAuth(data.access_token, data.refresh_token, data.user);
      toast.success(`Bienvenido, ${data.user.nombre.split(" ")[0]}`);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Panel izquierdo */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f1f33 45%, #162840 100%)" }}
      >
        {/* Grid decorativo */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "40px 40px" }}
        />
        {/* Glow */}
        <div className="absolute bottom-20 left-20 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute top-20 right-0 h-60 w-60 rounded-full bg-blue-500/10 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 shadow-xl shadow-orange-500/30">
            <Network className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-lg font-bold text-white">Alesof Perú</p>
            <p className="text-[11px] text-slate-500">S.A.C.</p>
          </div>
        </div>

        {/* Tagline */}
        <div className="relative space-y-4">
          <h2 className="text-4xl font-extrabold text-white leading-tight">
            Plataforma de gestión
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-300">
              empresarial
            </span>
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Gestiona clientes, infraestructura, soporte técnico y facturación desde un único panel centralizado.
          </p>
          {/* Feature bullets */}
          <div className="space-y-2.5 pt-2">
            {["Gestión de clientes y contratos", "Monitoreo de infraestructura", "Sistema de tickets de soporte", "Reportes y métricas en tiempo real"].map(f => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500 flex-shrink-0" />
                <span className="text-sm text-slate-400">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-slate-600">© 2026 Alesof Perú S.A.C.</p>
      </div>

      {/* Panel derecho */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-white px-6 py-12">
        {/* Volver */}
        <Link href="/" className="self-start mb-8 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors lg:hidden">
          <ArrowLeft className="h-3.5 w-3.5" /> Volver al inicio
        </Link>

        <div className="w-full max-w-sm">
          {/* Logo mobile */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e3a5f]">
              <Network className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-lg font-bold text-[#1e3a5f]">Alesof Platform</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[#1e3a5f]">Iniciar sesión</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Accede a tu panel de gestión empresarial
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                Correo electrónico
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="usuario@alesof.pe"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 rounded-xl border-border/70 focus:border-[#1e3a5f]/50 focus:ring-[#1e3a5f]/20"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-xl border-border/70 pr-10 focus:border-[#1e3a5f]/50 focus:ring-[#1e3a5f]/20"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowPwd(!showPwd)}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-[#1e3a5f] hover:bg-[#152d4a] font-semibold shadow-lg shadow-[#1e3a5f]/20"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {loading ? "Verificando..." : "Iniciar sesión"}
            </Button>
          </form>

          {/* Credenciales demo */}
          <div className="mt-8 rounded-xl border border-dashed border-border p-4 bg-muted/30">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2.5 uppercase tracking-wide">Credenciales de prueba</p>
            <div className="space-y-1.5">
              {[
                { email: "admin@alesof.pe",      pass: "Admin2026*",   rol: "Administrador" },
                { email: "supervisor@alesof.pe",  pass: "Super2026*",   rol: "Supervisor" },
                { email: "tecnico@alesof.pe",     pass: "Tecnico2026*", rol: "Técnico" },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  onClick={() => { setEmail(u.email); setPassword(u.pass); }}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs hover:bg-background transition-colors group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground">{u.email}</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{u.rol}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { setAuth, type User } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  Network,
} from "lucide-react";

const roleHome: Record<User["rol"], string> = {
  administrador: "/dashboard",
  supervisor: "/dashboard",
  tecnico: "/dashboard/soporte",
  cliente: "/dashboard/soporte",
};

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
      setAuth(data.access_token, data.refresh_token, data.user, data.permissions ?? []);
      toast.success(`Sesion iniciada: ${data.user.nombre.split(" ")[0]}`);
      router.push(roleHome[data.user.rol as User["rol"]] ?? "/dashboard/soporte");
    } catch (err: unknown) {
      const message = err && typeof err === "object" && "response" in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : undefined;
      toast.error(message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#eef3f7] px-4 py-8 text-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(15,31,51,0.08),rgba(15,118,110,0.08)),linear-gradient(90deg,rgba(15,31,51,0.07)_1px,transparent_1px),linear-gradient(rgba(15,31,51,0.07)_1px,transparent_1px)] [background-size:100%_100%,64px_64px,64px_64px]" />
      <div className="absolute inset-x-0 top-0 h-72 bg-[linear-gradient(180deg,rgba(15,31,51,0.16),transparent)]" />

      <Link
        href="/"
        className="absolute left-5 top-5 z-20 flex h-11 items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 text-sm font-black text-slate-700 shadow-lg shadow-slate-950/10 backdrop-blur transition hover:-translate-x-0.5 hover:bg-white hover:text-slate-950"
        aria-label="Volver a la landing"
        title="Volver a la landing"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="hidden sm:inline">Volver</span>
      </Link>

      <section className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-[430px]">
          <div className="overflow-hidden rounded-2xl border border-white/80 bg-white/92 shadow-2xl shadow-slate-950/12 backdrop-blur">
            <div className="border-b border-slate-200/80 px-7 py-6 text-center">
              <div className="mx-auto mb-4 flex h-13 w-13 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-950/20">
                <Network className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-slate-950">
                Iniciar sesion en el Intranet
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Usa tu correo registrado en la base de datos.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-7 py-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="sr-only">Correo corporativo</Label>
                <div className="relative">
                  <Building2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Correo corporativo"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 text-sm shadow-none focus-visible:ring-slate-950/15"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="sr-only">Contrasena</Label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    id="password"
                    type={showPwd ? "text" : "password"}
                    placeholder="Contrasena"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-10 pr-11 text-sm shadow-none focus-visible:ring-slate-950/15"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label={showPwd ? "Ocultar contrasena" : "Mostrar contrasena"}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-12 w-full rounded-xl bg-slate-950 text-sm font-black text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LockKeyhole className="mr-2 h-4 w-4" />}
                {loading ? "Verificando..." : "Iniciar sesion"}
              </Button>

              <button
                type="button"
                onClick={() => toast.info("Solicita el reinicio de contraseña al administrador del sistema.")}
                className="w-full text-center text-xs font-bold text-teal-700 hover:text-teal-900"
              >
                Recuperar acceso
              </button>
            </form>
          </div>

        </div>
      </section>
    </main>
  );
}

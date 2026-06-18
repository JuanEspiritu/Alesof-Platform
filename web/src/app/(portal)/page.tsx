"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Cloud,
  Headset,
  MapPin,
  Network,
  RadioTower,
  Receipt,
  Router,
  Send,
  Server,
  ShieldCheck,
} from "lucide-react";

const services = [
  {
    icon: RadioTower,
    title: "Backbone y fibra dedicada",
    tag: "SLA 99.7%",
    text: "Enlaces empresariales con monitoreo NOC, redundancia y escalamiento tecnico.",
  },
  {
    icon: Server,
    title: "Virtualizacion y data center",
    tag: "VMware / Linux",
    text: "Inventario de hosts, servicios internos, servidores criticos y respaldos operativos.",
  },
  {
    icon: Headset,
    title: "Mesa de ayuda IT",
    tag: "Tickets + SLA",
    text: "Registro, asignacion y seguimiento de incidencias por cliente, sede y prioridad.",
  },
  {
    icon: ShieldCheck,
    title: "Seguridad perimetral",
    tag: "VPN / Firewall",
    text: "Gestion de firewalls, VPNs, VLANs, accesos y segmentos protegidos.",
  },
];

const modules = [
  { label: "Clientes", value: "Contratos, sedes y planes", icon: Network },
  { label: "Inventario", value: "IP, VLAN, serie y estado", icon: Router },
  { label: "Soporte", value: "Tickets, tecnicos y SLA", icon: Headset },
  { label: "Facturacion", value: "Cobros, vencidos e IGV", icon: Receipt },
  { label: "Reportes", value: "Disponibilidad y tendencias", icon: BarChart3 },
  { label: "Cloud", value: "Servicios AWS y backups", icon: Cloud },
];

const sites = [
  { city: "Lima", detail: "NOC principal + core de red", uptime: "99.8%", color: "#0284c7" },
  { city: "Arequipa", detail: "Operaciones de campo", uptime: "96.4%", color: "#f97316" },
  { city: "Cloud", detail: "Servicios virtualizados", uptime: "100%", color: "#22c55e" },
];

export default function LandingPage() {
  function scrollToSection(id: string) {
    const section = document.getElementById(id);
    if (!section) return;
    section.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="mx-auto max-w-[1440px] p-2 sm:p-4">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#0f1f33] text-white shadow-2xl shadow-slate-950/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_25%,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_82%_18%,rgba(20,184,166,0.18),transparent_22%),linear-gradient(180deg,#0f1f33_0%,#0b3b5a_48%,#0e7490_100%)]" />
          <div className="absolute inset-x-0 bottom-0 h-64 bg-[radial-gradient(ellipse_at_bottom,rgba(255,255,255,0.95),rgba(255,255,255,0.45)_34%,transparent_70%)]" />

          <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-[#0f766e]">
                <Network className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-black leading-none">Alesof</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/60">Platform</p>
              </div>
            </div>
            <nav className="hidden items-center gap-8 text-[11px] font-bold uppercase tracking-[0.24em] text-white/70 md:flex">
              <button type="button" onClick={() => scrollToSection("servicios")} className="transition hover:text-white">Servicios</button>
              <button type="button" onClick={() => scrollToSection("modulos")} className="transition hover:text-white">Modulos</button>
              <button type="button" onClick={() => scrollToSection("contacto")} className="transition hover:text-white">Contacto</button>
            </nav>
            <Link href="/login">
              <button className="flex h-10 items-center gap-2 rounded-full bg-white px-5 text-xs font-black uppercase tracking-wide text-slate-950 shadow-lg shadow-slate-950/15 transition hover:bg-slate-100">
                Portal <ArrowUpRight className="h-4 w-4" />
              </button>
            </Link>
          </header>

          <div className="relative z-10 mx-auto flex min-h-[680px] max-w-6xl flex-col items-center px-5 pb-16 pt-12 text-center md:pb-20 md:pt-16">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/12 px-4 py-2 text-xs font-bold text-white backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-teal-300" />
              Intranet para redes, soporte y virtualizacion
            </div>
            <h1 className="max-w-4xl text-5xl font-black leading-[0.98] tracking-tight md:text-7xl">
              Operacion IT moderna para empresas conectadas
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-white/82 md:text-lg">
              Centraliza clientes, inventario, tickets, facturacion y reportes de infraestructura en una plataforma pensada para NOC, campo y administracion.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/login">
                <button className="flex h-12 items-center gap-2 rounded-full bg-slate-950 px-7 text-sm font-bold text-white shadow-xl shadow-slate-950/20 transition hover:bg-black">
                  Acceder al panel <ChevronRight className="h-4 w-4" />
                </button>
              </Link>
              <button
                type="button"
                onClick={() => scrollToSection("servicios")}
                className="h-12 rounded-full border border-white/35 bg-white/12 px-7 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
              >
                Ver capacidades
              </button>
            </div>

            <div className="relative mt-14 h-64 w-full max-w-5xl">
              <div className="scroll-rise absolute left-[4%] top-14 hidden w-44 rotate-[-8deg] rounded-3xl border border-white/40 bg-white/85 p-4 text-left text-slate-900 shadow-2xl shadow-cyan-950/20 backdrop-blur md:block">
                <p className="text-[11px] font-bold text-slate-400">Tickets criticos</p>
                <p className="mt-2 text-4xl font-black">3</p>
                <p className="mt-2 text-xs text-slate-500">2 dentro de SLA</p>
              </div>
              <div className="scroll-rise absolute left-[24%] top-5 w-52 rotate-[5deg] rounded-3xl border border-white/50 bg-white p-4 text-left text-slate-900 shadow-2xl shadow-cyan-950/20">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-slate-400">Disponibilidad</p>
                  <RadioTower className="h-4 w-4 text-cyan-600" />
                </div>
                <div className="h-20 rounded-2xl bg-gradient-to-br from-cyan-100 to-teal-100 p-3">
                  <div className="h-2 w-11/12 rounded-full bg-cyan-500" />
                  <div className="mt-3 h-2 w-8/12 rounded-full bg-teal-400" />
                  <div className="mt-3 h-2 w-10/12 rounded-full bg-slate-900" />
                </div>
                <p className="mt-3 text-2xl font-black">99.7%</p>
              </div>
              <div className="scroll-rise absolute left-1/2 top-0 w-56 -translate-x-1/2 rounded-3xl border border-slate-800 bg-slate-950 p-5 text-left text-white shadow-2xl shadow-cyan-950/25">
                <p className="text-xs font-bold text-cyan-200">Core Lima</p>
                <p className="mt-2 text-sm text-white/70">Router ISR · VLAN 10 · 10.10.10.1</p>
                <div className="mt-5 flex items-center gap-2 text-xs font-bold text-teal-200">
                  <span className="h-2 w-2 rounded-full bg-teal-300" />
                  Operativo
                </div>
              </div>
              <div className="scroll-rise absolute right-[24%] top-8 hidden w-52 rotate-[-5deg] rounded-3xl border border-white/50 bg-white/90 p-4 text-left text-slate-900 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:block">
                <p className="text-[11px] font-bold text-slate-400">Facturacion</p>
                <p className="mt-2 text-3xl font-black">S/ 27.4k</p>
                <p className="mt-3 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">Cobrado este mes</p>
              </div>
              <div className="scroll-rise absolute right-[3%] top-16 hidden w-44 rotate-[8deg] rounded-3xl border border-white/40 bg-white/80 p-4 text-left text-slate-900 shadow-2xl shadow-cyan-950/20 backdrop-blur md:block">
                <p className="text-[11px] font-bold text-slate-400">Sedes</p>
                <p className="mt-2 text-4xl font-black">3</p>
                <p className="mt-2 text-xs text-slate-500">Lima, AQP, Cloud</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-soft overflow-hidden border-y border-slate-200 bg-white py-6">
        <div className="flex min-w-max animate-[none] items-center gap-12 px-6 text-xs font-black uppercase tracking-[0.22em] text-slate-300 md:justify-center">
          {["NOC", "Virtualizacion", "Fibra optica", "SLA", "Mesa de ayuda", "Cloud", "VLAN", "Facturacion"].map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section id="servicios" className="scroll-reveal px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-cyan-600">Servicios operativos</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Deja de administrar la red con hojas sueltas
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Alesof Platform organiza la informacion diaria de una empresa de conectividad: clientes, equipos, incidencias, sedes y cobros.
            </p>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {services.map((service) => (
              <article key={service.title} className="scroll-rise rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-950/8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <service.icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-[11px] font-black text-teal-700">{service.tag}</span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-slate-950">{service.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500">{service.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="modulos" className="scroll-reveal bg-slate-50 px-5 py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">Modulos conectados</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 md:text-5xl">
              Una intranet con informacion util, no solo formularios
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-500">
              Cada modulo debe responder preguntas reales: que cliente esta afectado, que equipo falla, que factura vence y que tecnico tiene carga.
            </p>
            <div className="mt-8 grid gap-3">
              {["Roles por administrador, supervisor, tecnico y cliente", "Datos ficticios creibles para presentacion academica", "Indicadores de SLA, disponibilidad y cartera pendiente"].map((item) => (
                <div key={item} className="scroll-soft flex items-center gap-3 text-sm font-semibold text-slate-700">
                  <CheckCircle2 className="h-5 w-5 text-teal-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {modules.map((module, index) => (
              <div key={module.label} className={`scroll-rise rounded-[1.5rem] p-5 ${index === 0 ? "bg-teal-50 text-slate-950" : index === 2 ? "bg-slate-950 text-white" : "border border-slate-200 bg-white"}`}>
                <div className="mb-8 flex items-center justify-between">
                  <module.icon className="h-5 w-5" />
                  <span className="text-xs font-black opacity-50">0{index + 1}</span>
                </div>
                <h3 className="text-xl font-black">{module.label}</h3>
                <p className={`mt-2 text-sm ${index === 2 ? "text-white/60" : "text-slate-500"}`}>{module.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="scroll-rise px-5 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 md:grid-cols-3">
            {sites.map((site) => (
              <div key={site.city} className="scroll-rise rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-8 flex items-center justify-between">
                  <MapPin className="h-5 w-5" style={{ color: site.color }} />
                  <span className="rounded-full px-3 py-1 text-xs font-black" style={{ background: `${site.color}18`, color: site.color }}>
                    {site.uptime}
                  </span>
                </div>
                <h3 className="text-2xl font-black text-slate-950">{site.city}</h3>
                <p className="mt-2 text-sm text-slate-500">{site.detail}</p>
                <div className="mt-6 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full" style={{ width: site.uptime === "100%" ? "100%" : site.uptime, background: site.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className="scroll-reveal px-5 pb-24">
        <div className="mx-auto grid max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 text-white md:grid-cols-[0.9fr_1.1fr]">
          <div className="p-8 md:p-10">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-200">Contacto</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight">Solicita una evaluacion tecnica</h2>
            <p className="mt-5 text-sm leading-6 text-slate-400">
              Podemos revisar tu topologia, inventario actual, flujo de tickets y necesidades de virtualizacion.
            </p>
            <div className="mt-8 space-y-3 text-sm text-slate-300">
              <p>WhatsApp: +51 955 275 126</p>
              <p>Email: contacto@alesof.pe</p>
              <p>Base operativa: Lima, Peru</p>
            </div>
          </div>
          <form className="scroll-rise grid gap-4 bg-white p-6 text-slate-950 md:p-8">
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="scroll-soft h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500" placeholder="Nombre completo" />
              <input className="scroll-soft h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500" placeholder="Empresa" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <input className="scroll-soft h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500" placeholder="Correo corporativo" type="email" />
              <input className="scroll-soft h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-cyan-500" placeholder="Telefono" />
            </div>
            <textarea className="scroll-soft min-h-28 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-cyan-500" placeholder="Cuentanos sobre tu red, sedes o proyecto..." />
            <button
              type="button"
              onClick={() => toast.success("Mensaje registrado para demo. Conecta este formulario a un endpoint o CRM para producción.")}
              className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-slate-950 text-sm font-black text-white transition hover:bg-black"
            >
              Enviar mensaje <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

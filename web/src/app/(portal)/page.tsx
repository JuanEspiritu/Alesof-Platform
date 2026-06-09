"use client";

import Link from "next/link";
import {
  Network, Wifi, Server, Cloud, Headset, MapPin, Users,
  Clock, Award, Send, Phone, Mail, ChevronRight, Shield, Zap,
} from "lucide-react";

/* ─── DESIGN TOKENS ──────────────────────────────────── */
const NAVY   = "#1e3a5f";
const ORANGE = "#f97316";

/* ─── DATA ───────────────────────────────────────────── */
const servicios = [
  { icon: Wifi,    titulo: "Fibra Óptica",        tag: "Hasta 1 Gbps",        desc: "Conexiones dedicadas de alta velocidad para empresas que exigen el máximo rendimiento de red." },
  { icon: Headset, titulo: "Soporte 24/7",         tag: "SLA < 2 h",           desc: "Equipo de ingenieros certificados disponibles a toda hora para resolver incidencias críticas." },
  { icon: Server,  titulo: "Data Center",          tag: "99.9 % SLA",          desc: "Infraestructura VMware ESXi en Lima con redundancia energética y alta disponibilidad." },
  { icon: Cloud,   titulo: "Nube Privada",         tag: "AWS Partner",         desc: "Gestión completa de tu infraestructura cloud con seguridad y escalabilidad empresarial." },
  { icon: Shield,  titulo: "Seguridad de Red",     tag: "pfSense · Fortinet",  desc: "Firewalls, IDS/IPS, VPNs y monitoreo Zabbix para proteger tu infraestructura 24/7." },
  { icon: Zap,     titulo: "Conectividad MPLS",    tag: "Doble ISP",           desc: "Redes privadas multisede con redundancia de proveedores para cero interrupciones." },
];

const sedes = [
  { ciudad: "Lima",           tag: "Sede principal · Data Center", desc: "VMware ESXi, 13+ VMs y doble enlace ISP de fibra óptica.", icon: Server, accent: "#1e3a5f" },
  { ciudad: "Arequipa",       tag: "Sede Sur · Operaciones",       desc: "Cobertura de fibra óptica en toda la región con soporte técnico presencial.", icon: MapPin,  accent: "#f97316" },
  { ciudad: "Trujillo / AWS", tag: "Cloud · Norte",                desc: "Infraestructura cloud en AWS para alta disponibilidad y servicios escalables.", icon: Cloud,  accent: "#8b5cf6" },
];

const stats = [
  { value: "150+",  label: "Clientes activos",    icon: Users  },
  { value: "99.9%", label: "Uptime garantizado",  icon: Clock  },
  { value: "8+",    label: "Años de experiencia", icon: Award  },
  { value: "3",     label: "Sedes operativas",    icon: MapPin },
];

/* ─── PAGE ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Inter Variable', 'Inter', system-ui, sans-serif" }} className="min-h-screen flex flex-col bg-white">

      {/* ── NAVBAR ── */}
      <header style={{ background: "rgba(15,31,51,0.97)", backdropFilter: "blur(12px)" }}
        className="sticky top-0 z-50 border-b border-white/8">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ORANGE }}>
              <Network className="h-4 w-4 text-white" />
            </div>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em" }}>
              Alesof Perú <span style={{ color: "#64748b", fontWeight: 400, fontSize: 13 }}>S.A.C.</span>
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-0.5">
            {[["#servicios","Servicios"],["#sedes","Sedes"],["#contacto","Contacto"]].map(([href, label]) => (
              <a key={href} href={href}
                style={{ color: "#94a3b8", fontSize: 14, fontWeight: 500, padding: "6px 14px", borderRadius: 8 }}
                className="hover:text-white hover:bg-white/8 transition-all duration-150">
                {label}
              </a>
            ))}
          </nav>
          <Link href="/login">
            <button style={{ background: ORANGE, color: "#fff", fontWeight: 600, fontSize: 14, padding: "7px 18px", borderRadius: 10, boxShadow: "0 4px 14px rgba(249,115,22,0.35)" }}
              className="flex items-center gap-1.5 hover:brightness-110 transition-all duration-150">
              Portal de clientes <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </Link>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ background: "linear-gradient(160deg, #060f1c 0%, #0d1e35 50%, #0f2340 100%)" }}
        className="relative overflow-hidden">
        {/* dot grid */}
        <div className="absolute inset-0"
          style={{ backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        {/* glows */}
        <div className="absolute top-0 right-0 h-[500px] w-[500px] rounded-full" style={{ background: "radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)" }} />
        <div className="absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full" style={{ background: "radial-gradient(circle, rgba(30,58,95,0.4) 0%, transparent 70%)" }} />

        <div className="relative mx-auto max-w-4xl px-5 py-32 text-center">
          {/* pill */}
          <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-semibold"
            style={{ borderColor: "rgba(249,115,22,0.35)", background: "rgba(249,115,22,0.1)", color: "#fb923c" }}>
            <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "#fb923c" }} />
            Infraestructura IT empresarial en Perú
          </div>

          {/* heading */}
          <h1 style={{ fontSize: "clamp(2.25rem, 6vw, 3.75rem)", fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.1, color: "#f8fafc" }}>
            Conectando el Perú con{" "}
            <span style={{ background: "linear-gradient(135deg, #f97316 0%, #fb923c 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              tecnología de punta
            </span>
          </h1>

          <p style={{ marginTop: 20, fontSize: 17, color: "#94a3b8", lineHeight: 1.65, maxWidth: 560, marginLeft: "auto", marginRight: "auto" }}>
            Soluciones empresariales de red, telecomunicaciones y cloud computing con infraestructura multisede en Lima, Arequipa y AWS.
          </p>

          {/* CTAs */}
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <a href="#servicios">
              <button style={{ background: ORANGE, color: "#fff", fontWeight: 600, fontSize: 15, padding: "12px 28px", borderRadius: 12, boxShadow: "0 8px 24px rgba(249,115,22,0.35)" }}
                className="flex items-center gap-2 hover:brightness-110 transition-all duration-150">
                Ver servicios <ChevronRight className="h-4 w-4" />
              </button>
            </a>
            <a href="#contacto">
              <button style={{ color: "#e2e8f0", fontWeight: 600, fontSize: 15, padding: "12px 28px", borderRadius: 12, border: "1.5px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.06)" }}
                className="hover:bg-white/10 transition-all duration-150">
                Contáctanos
              </button>
            </a>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="border-y" style={{ borderColor: "#e2e8f0", background: "#fff" }}>
        <div className="mx-auto max-w-5xl px-5 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "rgba(30,58,95,0.07)" }}>
                    <s.icon className="h-5 w-5" style={{ color: NAVY }} />
                  </div>
                </div>
                <div style={{ fontSize: 30, fontWeight: 800, color: NAVY, letterSpacing: "-0.03em" }}>{s.value}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 2, fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICIOS ── */}
      <section id="servicios" style={{ background: "#f8fafc" }} className="py-24">
        <div className="mx-auto max-w-6xl px-5">
          <div className="text-center mb-14">
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ORANGE }} className="mb-3">
              Lo que ofrecemos
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: NAVY, letterSpacing: "-0.03em" }}>
              Servicios empresariales
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, color: "#64748b", maxWidth: 480, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
              Soluciones integrales de conectividad, seguridad e infraestructura para empresas que no se detienen.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {servicios.map((s) => (
              <div key={s.titulo}
                className="group rounded-2xl bg-white border transition-all duration-200 hover:-translate-y-1 hover:shadow-xl p-6"
                style={{ borderColor: "#e2e8f0", cursor: "default" }}>
                <div className="flex items-start justify-between mb-5">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors duration-200"
                    style={{ background: "rgba(30,58,95,0.07)" }}>
                    <s.icon className="h-5 w-5" style={{ color: NAVY }} />
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                    style={{ background: "rgba(249,115,22,0.1)", color: "#ea6c00", border: "1px solid rgba(249,115,22,0.2)" }}>
                    {s.tag}
                  </span>
                </div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, marginBottom: 8, letterSpacing: "-0.01em" }}>
                  {s.titulo}
                </h3>
                <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SEDES ── */}
      <section id="sedes" className="py-24 bg-white">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-14">
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ORANGE }} className="mb-3">
              Presencia nacional
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: NAVY, letterSpacing: "-0.03em" }}>
              Nuestras sedes
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, color: "#64748b", maxWidth: 420, marginLeft: "auto", marginRight: "auto" }}>
              Infraestructura de última generación en las principales ciudades del Perú.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {sedes.map((s) => (
              <div key={s.ciudad} className="rounded-2xl border overflow-hidden transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
                style={{ borderColor: "#e2e8f0" }}>
                <div className="h-1.5 w-full" style={{ background: s.accent }} />
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{ background: s.accent + "18" }}>
                      <s.icon className="h-5 w-5" style={{ color: s.accent }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: NAVY, letterSpacing: "-0.01em" }}>{s.ciudad}</h3>
                      <p style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{s.tag}</p>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: "#64748b", lineHeight: 1.65 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CONTACTO ── */}
      <section id="contacto" style={{ background: "#f8fafc" }} className="py-24">
        <div className="mx-auto max-w-5xl px-5">
          <div className="text-center mb-14">
            <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: ORANGE }} className="mb-3">
              Hablemos
            </p>
            <h2 style={{ fontSize: "clamp(1.75rem, 4vw, 2.5rem)", fontWeight: 800, color: NAVY, letterSpacing: "-0.03em" }}>
              ¿En qué podemos ayudarte?
            </h2>
            <p style={{ marginTop: 12, fontSize: 16, color: "#64748b" }}>
              Un especialista te contactará en menos de 24 horas.
            </p>
          </div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Info cards */}
            <div className="md:col-span-2 space-y-3">
              {[
                {
                  icon: Phone,
                  label: "WhatsApp",
                  value: "+51 955 275 126",
                  href: "https://wa.me/51955275126?text=Hola%2C%20quisiera%20m%C3%A1s%20informaci%C3%B3n%20sobre%20los%20servicios%20de%20Alesof%20Per%C3%BA",
                  badge: "Chat directo",
                  badgeColor: "#16a34a",
                },
                {
                  icon: Mail,
                  label: "Email",
                  value: "contacto@alesof.pe",
                  href: "mailto:contacto@alesof.pe?subject=Consulta%20de%20servicios%20Alesof%20Per%C3%BA",
                  badge: "Escribirnos",
                  badgeColor: "#1e3a5f",
                },
                {
                  icon: MapPin,
                  label: "Dirección",
                  value: "Universidad Peruana Unión",
                  href: "https://maps.google.com/?q=Universidad+Peruana+Union+Lima+Peru",
                  badge: "Ver en Maps",
                  badgeColor: "#f97316",
                },
              ].map((c) => (
                <a key={c.label} href={c.href} target="_blank" rel="noopener noreferrer"
                  className="group flex items-start gap-3.5 rounded-2xl border bg-white p-4 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150"
                  style={{ borderColor: "#e2e8f0", textDecoration: "none", display: "flex" }}>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0"
                    style={{ background: "rgba(30,58,95,0.07)" }}>
                    <c.icon className="h-4 w-4" style={{ color: NAVY }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>{c.label}</p>
                    <p style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginTop: 2 }}>{c.value}</p>
                  </div>
                  <span className="flex-shrink-0 self-center text-[11px] font-semibold px-2 py-1 rounded-full"
                    style={{ background: c.badgeColor + "18", color: c.badgeColor, border: `1px solid ${c.badgeColor}30` }}>
                    {c.badge}
                  </span>
                </a>
              ))}
            </div>

            {/* Form */}
            <div className="md:col-span-3 rounded-2xl border bg-white p-7"
              style={{ borderColor: "#e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
              <form className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  {[["Nombre completo","Juan García"],["Empresa","Mi Empresa S.A.C."]].map(([label, ph]) => (
                    <div key={label}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                      <input type="text" placeholder={ph}
                        style={{ width: "100%", height: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0f172a" }}
                        className="focus:border-[#1e3a5f] transition-colors" />
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[["Email corporativo","juan@empresa.com"],["Teléfono","+51 999 999 999"]].map(([label, ph]) => (
                    <div key={label}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>{label}</label>
                      <input type={label === "Email corporativo" ? "email" : "tel"} placeholder={ph}
                        style={{ width: "100%", height: 42, padding: "0 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", color: "#0f172a" }}
                        className="focus:border-[#1e3a5f] transition-colors" />
                    </div>
                  ))}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "#374151", display: "block", marginBottom: 6 }}>¿En qué podemos ayudarte?</label>
                  <textarea rows={4} placeholder="Describe tu proyecto o necesidad..."
                    style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #e2e8f0", fontSize: 14, fontFamily: "inherit", outline: "none", resize: "none", color: "#0f172a" }}
                    className="focus:border-[#1e3a5f] transition-colors" />
                </div>
                <button type="button"
                  style={{ width: "100%", height: 46, borderRadius: 11, background: ORANGE, color: "#fff", fontWeight: 700, fontSize: 15, fontFamily: "inherit", border: "none", cursor: "pointer", boxShadow: "0 6px 20px rgba(249,115,22,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  className="hover:brightness-110 transition-all">
                  <Send className="h-4 w-4" />
                  Enviar mensaje
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ background: "#060f1c" }} className="py-14">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid md:grid-cols-4 gap-10 pb-10 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ORANGE }}>
                  <Network className="h-4 w-4 text-white" />
                </div>
                <span style={{ color: "#f1f5f9", fontWeight: 700, fontSize: 15 }}>Alesof Perú S.A.C.</span>
              </div>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, maxWidth: 280 }}>
                Empresa líder en servicios de red, telecomunicaciones e infraestructura IT en el Perú.
              </p>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#334155", marginBottom: 16 }}>Servicios</p>
              <ul className="space-y-2.5">
                {["Fibra óptica", "Soporte 24/7", "Data center", "Nube AWS"].map((s) => (
                  <li key={s} style={{ fontSize: 14, color: "#475569", cursor: "pointer" }} className="hover:text-white transition-colors">{s}</li>
                ))}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#334155", marginBottom: 16 }}>Contacto</p>
              <ul className="space-y-2.5">
                {[
                  [Phone, "+51 1 555 0100"],
                  [Mail, "contacto@alesof.pe"],
                  [MapPin, "Lima, Perú"],
                ].map(([Icon, text], i) => (
                  <li key={i} className="flex items-center gap-2" style={{ fontSize: 14, color: "#475569" }}>
                    {/* @ts-ignore */}
                    <Icon className="h-3.5 w-3.5 flex-shrink-0" /> {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="pt-7 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p style={{ fontSize: 13, color: "#334155" }}>© 2026 Alesof Perú S.A.C. Todos los derechos reservados.</p>
            <Link href="/login">
              <span className="flex items-center gap-1.5 hover:text-orange-400 transition-colors" style={{ fontSize: 13, fontWeight: 600, color: "#f97316", cursor: "pointer" }}>
                Portal de clientes <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// @ts-nocheck
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface LandingContentProps {
  defaultLang?: 'es' | 'pt'
  showLanguageBanner?: boolean
}

function useInView(t = 0.1) {
  const ref = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.unobserve(el); } }, { threshold: t });
    o.observe(el);
    return () => o.disconnect();
  }, [t]);
  return [ref, v];
}

function R({ children, className = "", style = {}, delay = 0, y = 24 }) {
  const [ref, v] = useInView();
  return <div ref={ref} className={className} style={{ ...style, opacity: v ? 1 : 0, transform: v ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>{children}</div>;
}

const I = {
  check: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M5 10.5L8.5 14L15 6" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 6L14 14M14 6L6 14" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  warn: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="#F59E0B" strokeWidth="1.5"/><path d="M10 7V11M10 13.5V13" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  arr: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9H14M14 9L10 5M14 9L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dash: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M6 10H14" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

// Screenshot component — just shadow + rounded, NO browser chrome
function Screenshot({ src, alt, placeholder, maxW = 900, perspective = false }: { src?: string; alt?: string; placeholder?: string; maxW?: number; perspective?: boolean }) {
  const inner = src
    ? <img src={src} alt={alt || ""} style={{ width: "100%", display: "block", borderRadius: 16 }} />
    : <div style={{ height: 280, background: "#F9FAFB", borderRadius: 16, display: "grid", placeItems: "center", color: "#9CA3AF", fontSize: 15, fontWeight: 500 }}>{placeholder || "Proximamente"}</div>
  return (
    <div style={{ maxWidth: maxW, margin: "0 auto", borderRadius: 16, overflow: "hidden", boxShadow: "0 25px 60px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)", transform: perspective ? "perspective(1500px) rotateX(2deg)" : "none" }}>
      {inner}
    </div>
  )
}

const pains = [
  { icon: "calculator", text: "Calculas precios con la calculadora del celular y siempre te olvidas de algun costo" },
  { icon: "message", text: "Mandas presupuestos por WhatsApp como un mensaje de texto mas" },
  { icon: "chart", text: "No sabes cuanto ganas realmente con cada pedido" },
  { icon: "list", text: "Se te pierden pedidos o te olvidas de cobrar saldos" },
  { icon: "image", text: "Mostras tus productos con fotos sueltas por WhatsApp" },
  { icon: "layers", text: "Cada tecnica tiene costos distintos que calculas por separado" },
];

const compRows = [
  { f: "Calcular costos reales", a: "Solo lo obvio", aS: "x", b: "Si armas las formulas", bS: "w", c: "Automatico con desglose" },
  { f: "Presupuestos profesionales", a: "Audio de WhatsApp", aS: "x", b: "Armar manual cada vez", bS: "w", c: "Con tu logo, un click" },
  { f: "Gestion de pedidos", a: "Memoria y notas", aS: "x", b: "Hojas separadas", bS: "w", c: "Kanban con alertas" },
  { f: "Catalogo web propio", a: "No existe", aS: "x", b: "No existe", bS: "x", c: "Incluido, listo en minutos" },
  { f: "Rentabilidad real", a: "Ni idea", aS: "x", b: "Si dedicas horas", bS: "w", c: "Dashboard automatico" },
  { f: "Todas las tecnicas", a: "Una cuenta cada vez", aS: "x", b: "Una hoja por tecnica", bS: "w", c: "Todo en un solo sistema" },
];

const catalogBullets = [
  "Tu link profesional para la bio de Instagram y WhatsApp",
  "Productos con variantes de talle, color y precio",
  "Guia de talles con imagen y tabla",
  "Medios de pago visibles (efectivo, transferencia, tarjeta)",
  "Los pedidos entran directo como presupuestos en tu sistema",
  "Cero codigo. Cero hosting. Cero costo adicional.",
];

const techniques = ["Sublimacion", "DTF Textil", "DTF UV", "Vinilo", "Serigrafia"];

const profiles = [
  { tag: "Recien empezas", copy: "Compraste tu primera prensa. Tenes pocos pedidos y no estas seguro de como poner precios. Necesitas una forma simple de saber cuanto cobrar y verte profesional desde el dia uno.", plan: "Emprendedor" },
  { tag: "Tu negocio esta creciendo", copy: "Ya tenes clientes fijos y haces entre 20 y 50 pedidos por mes. Sabes que tenes que organizarte mejor pero no encontras como. Necesitas presupuestos profesionales, control de pedidos y un catalogo.", plan: "Pro" },
  { tag: "Tenes un negocio establecido", copy: "Tenes empleados, manejas multiples tecnicas y recibis pedidos corporativos. Necesitas control real: saber quien produce que, que tecnica es mas rentable y como va tu negocio mes a mes.", plan: "Negocio" },
];

const plans = [
  { name: "Emprendedor", price: 9, annual: 63, feat: ["Cotizador inteligente — todas las tecnicas", "Hasta 25 productos en catalogo web", "1 foto por producto", "Presupuestos con tu logo", "Gestion de pedidos (Kanban)", "Base de clientes", "Estadisticas del mes actual"] },
  { name: "Pro", price: 17, annual: 119, pop: true, feat: ["Todo lo del Emprendedor, mas:", "Productos ilimitados en catalogo web", "3 fotos por producto", "Estadisticas completas con historial", "Rentabilidad por producto y tecnica", "Permisos por usuario"] },
  { name: "Negocio", price: 29, annual: 203, feat: ["Todo lo del Pro, mas:", "5 fotos por producto", "Costos de mano de obra en cotizacion", "Exportar datos", "Sin badge \"Powered by Estamply\""] },
];

const featureTable = [
  { section: "Cotizador", rows: [
    { f: "Cotizador inteligente", a: true, b: true, c: true },
    { f: "Sublimacion, DTF, Vinilo, Serigrafia", a: true, b: true, c: true },
    { f: "Desglose de costos completo", a: true, b: true, c: true },
    { f: "Margen y markup", a: true, b: true, c: true },
    { f: "Descuento por volumen", a: true, b: true, c: true },
    { f: "Ganancia por hora de trabajo", a: true, b: true, c: true },
    { f: "Costos de mano de obra", a: false, b: false, c: true },
  ]},
  { section: "Presupuestos", rows: [
    { f: "Presupuestos con tu logo", a: true, b: true, c: true },
    { f: "Compartir por WhatsApp y email", a: true, b: true, c: true },
    { f: "Link publico de presupuesto", a: true, b: true, c: true },
    { f: "Confirmar presupuesto como pedido", a: true, b: true, c: true },
    { f: "Condiciones de pago personalizables", a: true, b: true, c: true },
  ]},
  { section: "Pedidos", rows: [
    { f: "Tablero Kanban (4 estados)", a: true, b: true, c: true },
    { f: "Alertas de pedidos vencidos", a: true, b: true, c: true },
    { f: "Control de cobros pendientes", a: true, b: true, c: true },
    { f: "Link al diseno en cada pedido", a: true, b: true, c: true },
  ]},
  { section: "Catalogo Web", rows: [
    { f: "Catalogo web publico", a: true, b: true, c: true },
    { f: "Productos en catalogo", a: "25", b: "Ilimitados", c: "Ilimitados" },
    { f: "Fotos por producto", a: "1", b: "3", c: "5" },
    { f: "Variantes de talle y color", a: true, b: true, c: true },
    { f: "Guia de talles", a: true, b: true, c: true },
    { f: "Medios de pago con recargo/descuento", a: true, b: true, c: true },
    { f: "Boton de WhatsApp flotante", a: true, b: true, c: true },
    { f: "Barra de anuncios", a: true, b: true, c: true },
    { f: "Ocultar badge \"Powered by Estamply\"", a: false, b: false, c: true },
  ]},
  { section: "Estadisticas", rows: [
    { f: "Facturacion del mes actual", a: true, b: true, c: true },
    { f: "Estadisticas con historial completo", a: false, b: true, c: true },
    { f: "Rentabilidad por producto", a: false, b: true, c: true },
    { f: "Rentabilidad por tecnica", a: false, b: true, c: true },
    { f: "Ranking de clientes", a: false, b: true, c: true },
    { f: "Evolucion mes a mes", a: false, b: true, c: true },
    { f: "Exportar a Excel", a: false, b: false, c: true },
  ]},
  { section: "Clientes y Usuarios", rows: [
    { f: "Base de clientes", a: true, b: true, c: true },
    { f: "Historial de pedidos por cliente", a: true, b: true, c: true },
    { f: "Importar y exportar clientes", a: false, b: false, c: true },
    { f: "Usuarios", a: "1", b: "3", c: "10" },
    { f: "Permisos por usuario", a: false, b: true, c: true },
  ]},
  { section: "Soporte", rows: [
    { f: "Soporte por email", a: true, b: true, c: true },
    { f: "Soporte prioritario", a: false, b: true, c: true },
    { f: "Soporte por WhatsApp", a: false, b: false, c: true },
  ]},
];

const faqs = [
  { q: "Cuanto dura la prueba gratis?", a: "7 dias con acceso completo al plan Pro. Sin poner tarjeta. Si no te sirve, simplemente no haces nada y la cuenta se pausa." },
  { q: "Funciona para mi tecnica?", a: "Si. Sublimacion, DTF textil, DTF UV, vinilo y serigrafia. Si estampas, Estamply te sirve — todo desde el mismo sistema." },
  { q: "Necesito saber programar para el catalogo?", a: "No. Subis tus productos, pones precios, y tu tienda esta online. Cero codigo, cero hosting, cero conocimiento tecnico." },
  { q: "Sirve en mi pais?", a: "Si. Funciona en toda LATAM. Configuras tu pais, tu moneda y tus medios de pago al registrarte." },
  { q: "Ya tengo un Excel, por que cambiaria?", a: "El Excel no genera presupuestos con tu logo, no gestiona pedidos con alertas, no te da catalogo web, y no te dice cuanto ganas por hora. Estamply hace todo eso desde un solo lugar." },
  { q: "Y si no me gusta?", a: "Si en 7 dias sentis que no te aporta valor, no pagas nada. Podes cancelar cuando quieras." },
  { q: "Como se paga?", a: "Tarjeta (Stripe), MercadoPago en Argentina, PIX/boleto en Brasil. Precios en USD; en Argentina se cobra en pesos al tipo de cambio del dia." },
  { q: "Puedo usarlo desde el celular?", a: "Si. 100% responsive. Cotizas, mandas presupuestos y gestionas pedidos desde cualquier dispositivo." },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #F1F5F9" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", padding: "24px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: "#111827", lineHeight: 1.4 }}>{q}</span>
        <span style={{ flexShrink: 0, color: "#9CA3AF", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>{I.chev}</span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
        <p style={{ padding: "0 0 24px", fontSize: 16, color: "#4B5563", lineHeight: 1.75 }}>{a}</p>
      </div>
    </div>
  );
}

function CI({ val }) {
  if (val === true) return I.check;
  if (val === false) return I.dash;
  return <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{val}</span>;
}

export default function LandingContent({ defaultLang = 'es', showLanguageBanner = false }: LandingContentProps) {
  const [annual, setAnnual] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showFt, setShowFt] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const w = { maxWidth: 1200, margin: "0 auto", padding: "0 24px" };
  const teal = "#0F766E";
  const tealLight = "#0D9488";

  return (
    <div style={{ color: "#4B5563", background: "#fff" }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .cta{display:inline-flex;align-items:center;gap:8px;background:${teal};color:#fff;border:none;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;transition:background 0.2s,transform 0.15s,box-shadow 0.2s;text-decoration:none}
        .cta:hover{background:#0D6D66;transform:translateY(-1px);box-shadow:0 8px 24px rgba(15,118,110,0.2)}
        .cta-g{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#4B5563;border:1.5px solid #E5E7EB;padding:14px 32px;border-radius:999px;font-size:15px;font-weight:500;cursor:pointer;transition:border-color 0.2s,color 0.2s;text-decoration:none}
        .cta-g:hover{border-color:${teal};color:${teal}}
        @media(max-width:768px){
          .hero-grid{flex-direction:column!important}
          .f2{grid-template-columns:1fr!important}
          .pflex{flex-direction:column!important}
          .catflex{flex-direction:column!important}
          .fgrid{grid-template-columns:1fr 1fr!important}
          .navl{display:none!important}
          .pain-grid{grid-template-columns:1fr!important}
          .cmpd{display:none!important}
          .cmpm{display:block!important}
          .ftd{display:none!important}
          .ftm{display:block!important}
          .trow{flex-wrap:wrap!important}
        }
        @media(min-width:769px){.cmpm{display:none!important}.ftm{display:none!important}}
      `}</style>

      {/* ─── NAVBAR ─── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(255,255,255,0.98)" : "transparent", boxShadow: scrolled ? "0 1px 0 rgba(0,0,0,0.06)" : "none", transition: "all 0.3s" }}>
        <div style={{ ...w, display: "flex", alignItems: "center", justifyContent: "space-between", height: 64 }}>
          <img src="/logo-full.png" alt="Estamply" style={{ height: 22, width: "auto" }} />
          <div className="navl" style={{ display: "flex", gap: 32 }}>
            {[["Funciones","#funciones"],["Precios","#precios"],["FAQ","#faq"]].map(([t,h])=><a key={t} href={h} style={{ fontSize: 14, color: "#4B5563", textDecoration: "none", fontWeight: 500 }}>{t}</a>)}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Link href="https://app.estamply.app/login" style={{ fontSize: 14, color: "#4B5563", textDecoration: "none", fontWeight: 500 }}>Iniciar sesion</Link>
            <Link href="https://app.estamply.app/signup" className="cta" style={{ padding: "8px 20px", fontSize: 13 }}>Empezar gratis</Link>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{ paddingTop: 140, paddingBottom: 80 }}>
        <div style={{ ...w, textAlign: "center" }}>
          <R><span style={{ display: "inline-block", padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 500, color: "#4B5563", background: "#F3F4F6", marginBottom: 24 }}>Software para talleres de estampado</span></R>
          <R delay={0.05}><h1 style={{ fontSize: "clamp(36px,5.5vw,56px)", fontWeight: 700, lineHeight: 1.1, color: "#111827", letterSpacing: "-0.025em", marginBottom: 20, maxWidth: 800, margin: "0 auto 20px" }}>
            Cotiza, presupuesta y gestiona tu taller desde un solo lugar
          </h1></R>
          <R delay={0.1}><p style={{ fontSize: 20, color: "#6B7280", lineHeight: 1.6, marginBottom: 36, maxWidth: 600, margin: "0 auto 36px" }}>El primer sistema pensado para talleres de sublimacion, DTF, vinilo y serigrafia en Latinoamerica.</p></R>
          <R delay={0.15}>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 16 }}>
              <Link href="https://app.estamply.app/signup" className="cta" style={{ padding: "16px 36px", fontSize: 16 }}>Empezar gratis {I.arr}</Link>
              <a href="#funciones" className="cta-g" style={{ padding: "16px 36px", fontSize: 16 }}>Ver funciones</a>
            </div>
            <p style={{ fontSize: 13, color: "#9CA3AF" }}>7 dias gratis · Sin tarjeta · Cancelas cuando quieras</p>
          </R>
          <R delay={0.25} y={40}>
            <div style={{ marginTop: 64 }}>
              <Screenshot src="/cotizador-subli.png" alt="Cotizador inteligente de Estamply" perspective />
            </div>
          </R>
          <R delay={0.35}>
            <div style={{ marginTop: 48, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 13, color: "#9CA3AF" }}>Confiado por talleres en</span>
              {["Argentina", "Mexico", "Colombia", "Chile", "Brasil"].map(c => (
                <span key={c} style={{ fontSize: 13, color: "#6B7280", fontWeight: 500 }}>{c}</span>
              ))}
            </div>
          </R>
        </div>
      </section>

      {/* ─── PROBLEMA ─── */}
      <section style={{ padding: "120px 0" }}>
        <div style={w}>
          <R><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#111827", textAlign: "center", letterSpacing: "-0.025em", marginBottom: 16, lineHeight: 1.15 }}>Si tu taller funciona asi,<br/>estas perdiendo plata todos los dias</h2></R>
          <R delay={0.05}><p style={{ fontSize: 18, color: "#6B7280", textAlign: "center", marginBottom: 56, maxWidth: 520, margin: "0 auto 56px" }}>Estos son los problemas mas comunes que vemos en talleres de estampado.</p></R>
          <div className="pain-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "32px 48px", maxWidth: 900, margin: "0 auto" }}>
            {pains.map((p,i)=><R key={i} delay={i*0.04}><div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              <span style={{ flexShrink: 0, marginTop: 2 }}>{I.x}</span>
              <span style={{ fontSize: 15, color: "#4B5563", lineHeight: 1.6 }}>{p.text}</span>
            </div></R>)}
          </div>
          <R delay={0.3}><p style={{ textAlign: "center", marginTop: 48, fontSize: 16, color: tealLight, fontWeight: 600 }}>Si te identificas con al menos una, Estamply fue creado para vos.</p></R>
        </div>
      </section>

      {/* ─── COMPARACION ─── */}
      <section style={{ padding: "120px 0", background: "#FAFAFA" }}>
        <div style={w}>
          <R><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#111827", textAlign: "center", letterSpacing: "-0.025em", marginBottom: 56, lineHeight: 1.15 }}>Como gestionas tu negocio hoy?</h2></R>
          <R delay={0.1}><div className="cmpd" style={{ borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", background: "#fff" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr>
                <th style={{ padding: "16px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#9CA3AF", background: "#FAFAFA" }}></th>
                <th style={{ padding: "16px 24px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#9CA3AF", background: "#FAFAFA" }}>Calculadora + Cuaderno</th>
                <th style={{ padding: "16px 24px", textAlign: "center", fontSize: 13, fontWeight: 600, color: "#9CA3AF", background: "#FAFAFA" }}>Excel / Planilla</th>
                <th style={{ padding: "16px 24px", textAlign: "center", fontSize: 13, fontWeight: 700, color: teal, background: "#F0FDFA" }}>Estamply</th>
              </tr></thead>
              <tbody>{compRows.map((r,i)=><tr key={i} style={{ borderTop: "1px solid #F3F4F6" }}>
                <td style={{ padding: "14px 24px", fontSize: 14, fontWeight: 500, color: "#111827" }}>{r.f}</td>
                <td style={{ padding: "14px 24px", textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B7280" }}>{r.aS==="x"?I.x:I.warn} {r.a}</span></td>
                <td style={{ padding: "14px 24px", textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6B7280" }}>{r.bS==="x"?I.x:I.warn} {r.b}</span></td>
                <td style={{ padding: "14px 24px", textAlign: "center", background: "#F0FDFA" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 500, color: teal }}>{I.check} {r.c}</span></td>
              </tr>)}</tbody>
            </table>
          </div></R>
          <div className="cmpm">{compRows.map((r,i)=><R key={i} delay={i*0.04}><div style={{ padding: "18px 0", borderBottom: "1px solid #F3F4F6" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111827", marginBottom: 10 }}>{r.f}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280" }}>{r.aS==="x"?I.x:I.warn} Calculadora: {r.a}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280" }}>{r.bS==="x"?I.x:I.warn} Excel: {r.b}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: teal, fontWeight: 500 }}>{I.check} Estamply: {r.c}</div>
            </div>
          </div></R>)}</div>
        </div>
      </section>

      {/* ─── FUNCIONES: COTIZADOR ─── */}
      <section id="funciones" style={{ padding: "140px 0 120px" }}>
        <div style={w}>
          <R><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#111827", textAlign: "center", letterSpacing: "-0.025em", marginBottom: 16, lineHeight: 1.15 }}>Sabe exactamente cuanto cobrar<br/>por cada trabajo</h2></R>
          <R delay={0.05}><p style={{ fontSize: 18, color: "#6B7280", textAlign: "center", marginBottom: 40, maxWidth: 560, margin: "0 auto 40px" }}>Estamply calcula todos tus costos — producto, papel, tinta, amortizacion, desperdicio — y te dice exactamente cuanto cobrar.</p></R>
          <R delay={0.1}>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 48 }}>
              {techniques.map((t,i) => (
                <span key={t} style={{ padding: "8px 20px", borderRadius: 999, fontSize: 14, fontWeight: 500, background: i===0 ? teal : "#F3F4F6", color: i===0 ? "#fff" : "#4B5563", cursor: "default" }}>{t}</span>
              ))}
            </div>
          </R>
          <R delay={0.2} y={40}>
            <Screenshot src="/cotizador-subli.png" alt="Cotizador inteligente de Estamply" perspective />
          </R>
        </div>
      </section>

      {/* ─── FUNCIONES: PRESUPUESTOS + PEDIDOS ─── */}
      <section style={{ padding: "120px 0", background: "#FAFAFA" }}>
        <div style={w}>
          <div className="f2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 64 }}>
            {/* Presupuestos */}
            <R><div>
              <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: teal, background: "#F0FDFA", marginBottom: 16, letterSpacing: "0.03em" }}>PRESUPUESTOS</span>
              <h3 style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginBottom: 14, letterSpacing: "-0.02em" }}>Presupuestos con tu logo. En un click.</h3>
              <p style={{ fontSize: 16, color: "#4B5563", lineHeight: 1.7, marginBottom: 32 }}>Genera presupuestos profesionales, compartilos por WhatsApp o email. Tu cliente los confirma y se convierten en pedido automaticamente.</p>
              <Screenshot src="/presupuesto.png" alt="Presupuesto profesional de Estamply" maxW={480} />
            </div></R>
            {/* Pedidos */}
            <R delay={0.1}><div>
              <span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: teal, background: "#F0FDFA", marginBottom: 16, letterSpacing: "0.03em" }}>GESTION DE PEDIDOS</span>
              <h3 style={{ fontSize: 28, fontWeight: 700, color: "#111827", lineHeight: 1.2, marginBottom: 14, letterSpacing: "-0.02em" }}>Nunca mas "me olvide de ese pedido"</h3>
              <p style={{ fontSize: 16, color: "#4B5563", lineHeight: 1.7, marginBottom: 32 }}>Tablero Kanban con 4 estados, datos del cliente, link al diseno y alertas de cobros pendientes. Todo visible, nada se pierde.</p>
              <Screenshot placeholder="Proximamente" maxW={480} />
            </div></R>
          </div>
        </div>
      </section>

      {/* ─── FUNCIONES: CATALOGO WEB ─── */}
      <section style={{ padding: "120px 0" }}>
        <div style={w}>
          <div className="catflex" style={{ display: "flex", gap: 72, alignItems: "center" }}>
            <div style={{ flex: "1 1 50%" }}>
              <R><span style={{ display: "inline-block", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, color: teal, background: "#F0FDFA", marginBottom: 16, letterSpacing: "0.03em" }}>CATALOGO WEB</span></R>
              <R delay={0.05}><h2 style={{ fontSize: "clamp(28px,3.5vw,40px)", fontWeight: 700, color: "#111827", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 16 }}>Tu catalogo web profesional. Incluido.</h2></R>
              <R delay={0.1}><p style={{ fontSize: 17, color: "#6B7280", lineHeight: 1.7, marginBottom: 28 }}>Sin saber programar. Sin pagar disenadores. Sin servidores.</p></R>
              <R delay={0.15}><div style={{ marginBottom: 32 }}>{catalogBullets.map((b,i)=><div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}><span style={{ flexShrink: 0, marginTop: 2 }}>{I.check}</span><span style={{ fontSize: 15, color: "#4B5563", lineHeight: 1.6 }}>{b}</span></div>)}</div></R>
              <R delay={0.2}><Link href="https://app.estamply.app/signup" className="cta">Empezar gratis {I.arr}</Link></R>
            </div>
            <R delay={0.2} y={40} style={{ flex: "1 1 50%" }}>
              <Screenshot placeholder="Proximamente" maxW={500} />
            </R>
          </div>
        </div>
      </section>

      {/* ─── PARA QUIEN ─── */}
      <section style={{ padding: "120px 0", background: "#FAFAFA" }}>
        <div style={w}>
          <R><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#111827", textAlign: "center", letterSpacing: "-0.025em", marginBottom: 56, lineHeight: 1.15 }}>Es Estamply para vos?</h2></R>
          <div className="pflex" style={{ display: "flex", gap: 24 }}>
            {profiles.map((p,i)=><R key={i} delay={i*0.08} style={{ flex: 1 }}><div style={{ background: "#fff", borderRadius: 16, padding: 32, height: "100%", display: "flex", flexDirection: "column", transition: "box-shadow 0.25s", boxShadow: "0 0 0 1px rgba(0,0,0,0)" }} onMouseEnter={e => e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,0,0,0.06)"} onMouseLeave={e => e.currentTarget.style.boxShadow = "0 0 0 1px rgba(0,0,0,0)"}>
              <h3 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{p.tag}</h3>
              <p style={{ fontSize: 15, color: "#4B5563", lineHeight: 1.7, flex: 1, marginBottom: 20 }}>{p.copy}</p>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: teal }}>Plan {p.plan}</span>
                <Link href="https://app.estamply.app/signup" style={{ fontSize: 14, fontWeight: 500, color: teal, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>Empezar {I.arr}</Link>
              </div>
            </div></R>)}
          </div>
        </div>
      </section>

      {/* ─── PRECIOS ─── */}
      <section id="precios" style={{ padding: "140px 0" }}>
        <div style={w}>
          <R><div style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#111827", letterSpacing: "-0.025em", marginBottom: 16, lineHeight: 1.15 }}>Planes simples. Precios justos.</h2>
            <p style={{ fontSize: 18, color: "#6B7280", marginBottom: 28 }}>Empeza con 7 dias gratis del plan Pro. Sin tarjeta de credito.</p>
            <div style={{ display: "inline-flex", background: "#F3F4F6", borderRadius: 999, padding: 4 }}>
              {[false,true].map(a=><button key={String(a)} onClick={()=>setAnnual(a)} style={{ padding: "8px 20px", borderRadius: 999, border: "none", cursor: "pointer", background: annual===a?"#fff":"transparent", boxShadow: annual===a?"0 1px 3px rgba(0,0,0,0.06)":"none", color: annual===a?"#111827":"#6B7280", fontWeight: 600, fontSize: 14, transition: "all 0.2s" }}>{a?<>Anual <span style={{ color: teal, fontSize: 12 }}>-42%</span></>:"Mensual"}</button>)}
            </div>
          </div></R>

          <div className="pflex" style={{ display: "flex", gap: 24, alignItems: "stretch", marginBottom: 40 }}>
            {plans.map((pl,i)=><R key={i} delay={i*0.08} style={{ flex: 1 }}><div style={{ background: "#fff", borderRadius: 20, padding: 36, border: pl.pop?`2px solid ${teal}`:"1px solid #E5E7EB", boxShadow: pl.pop?"0 12px 40px rgba(15,118,110,0.1)":"none", height: "100%", display: "flex", flexDirection: "column", position: "relative", transform: pl.pop?"scale(1.03)":"none" }}>
              {pl.pop && <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: teal, color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 14px", borderRadius: 999, letterSpacing: "0.04em" }}>MAS POPULAR</div>}
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 8 }}>{pl.name}</h3>
              <div style={{ marginBottom: 24 }}>
                <span style={{ fontSize: 48, fontWeight: 700, color: "#111827", letterSpacing: "-0.03em" }}>${annual?Math.round(pl.annual/12):pl.price}</span>
                <span style={{ fontSize: 16, color: "#6B7280" }}>/mes</span>
                {annual && <div style={{ fontSize: 13, color: teal, fontWeight: 600, marginTop: 4 }}>${pl.annual}/ano — 3 meses gratis</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 24 }}>
                {pl.feat.map((f,fi)=><div key={fi} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}>
                  {!f.startsWith("Todo") && <span style={{ flexShrink: 0, marginTop: 1 }}>{I.check}</span>}
                  <span style={{ fontSize: 14, color: f.startsWith("Todo")?teal:"#4B5563", fontWeight: f.startsWith("Todo")?600:400, lineHeight: 1.5 }}>{f}</span>
                </div>)}
              </div>
              <Link href="https://app.estamply.app/signup" className="cta" style={{ width: "100%", justifyContent: "center", background: pl.pop?teal:"transparent", color: pl.pop?"#fff":teal, border: pl.pop?"none":`1.5px solid ${teal}` }}>Empezar gratis</Link>
            </div></R>)}
          </div>

          <R delay={0.2}><p style={{ fontSize: 13, color: "#9CA3AF", textAlign: "center", marginBottom: 32 }}>Sin tarjeta de credito · Cancela cuando quieras · Precios en USD</p></R>

          <R delay={0.25}><div style={{ textAlign: "center" }}>
            <button onClick={() => setShowFt(!showFt)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1.5px solid #E5E7EB", borderRadius: 999, padding: "10px 24px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: teal }}>
              {showFt ? "Ocultar funcionalidades" : "Ver todas las funcionalidades"}
              <span style={{ transform: showFt ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>{I.chev}</span>
            </button>
          </div></R>

          {/* Desktop feature table */}
          <div className="ftd" style={{ maxHeight: showFt ? 5000 : 0, overflow: "hidden", transition: "max-height 0.6s cubic-bezier(0.22,1,0.36,1)", marginTop: showFt ? 32 : 0 }}>
            <div style={{ borderRadius: 16, border: "1px solid #E5E7EB", overflow: "hidden", background: "#fff" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr>
                  <th style={{ padding: "14px 24px", textAlign: "left", fontSize: 13, fontWeight: 600, color: "#9CA3AF", background: "#FAFAFA" }}></th>
                  <th style={{ padding: "14px 24px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827", width: "20%", background: "#FAFAFA" }}>Emprendedor<br/><span style={{ fontWeight: 400, color: "#6B7280", fontSize: 13 }}>${annual?Math.round(63/12):9}/mes</span></th>
                  <th style={{ padding: "14px 24px", textAlign: "center", fontSize: 14, fontWeight: 700, color: teal, width: "20%", background: "#F0FDFA" }}>Pro<br/><span style={{ fontWeight: 400, fontSize: 13 }}>${annual?Math.round(119/12):17}/mes</span></th>
                  <th style={{ padding: "14px 24px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "#111827", width: "20%", background: "#FAFAFA" }}>Negocio<br/><span style={{ fontWeight: 400, color: "#6B7280", fontSize: 13 }}>${annual?Math.round(203/12):29}/mes</span></th>
                </tr></thead>
                <tbody>
                  {featureTable.map((sec,si)=>(
                    <React.Fragment key={si}>
                      <tr><td colSpan={4} style={{ padding: "16px 24px 8px", fontSize: 12, fontWeight: 700, color: teal, letterSpacing: "0.05em", textTransform: "uppercase", background: "#FAFBFC" }}>{sec.section}</td></tr>
                      {sec.rows.map((r,ri)=><tr key={ri} style={{ borderTop: "1px solid #F3F4F6" }}>
                        <td style={{ padding: "12px 24px", fontSize: 14, color: "#4B5563" }}>{r.f}</td>
                        <td style={{ padding: "12px 24px", textAlign: "center" }}><CI val={r.a}/></td>
                        <td style={{ padding: "12px 24px", textAlign: "center", background: "rgba(240,253,250,0.5)" }}><CI val={r.b}/></td>
                        <td style={{ padding: "12px 24px", textAlign: "center" }}><CI val={r.c}/></td>
                      </tr>)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile feature table */}
          <div className="ftm" style={{ maxHeight: showFt ? 8000 : 0, overflow: "hidden", transition: "max-height 0.6s cubic-bezier(0.22,1,0.36,1)", marginTop: showFt ? 24 : 0 }}>
            {featureTable.map((sec,si)=><div key={si} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: teal, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>{sec.section}</div>
              {sec.rows.map((r,ri)=><div key={ri} style={{ padding: "10px 0", borderBottom: "1px solid #F3F4F6", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#4B5563", flex: 1 }}>{r.f}</span>
                <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "center", width: 50 }}><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>EMP</div><CI val={r.a}/></div>
                  <div style={{ textAlign: "center", width: 50 }}><div style={{ fontSize: 9, color: teal, fontWeight: 600, marginBottom: 2 }}>PRO</div><CI val={r.b}/></div>
                  <div style={{ textAlign: "center", width: 50 }}><div style={{ fontSize: 9, color: "#9CA3AF", fontWeight: 600, marginBottom: 2 }}>NEG</div><CI val={r.c}/></div>
                </div>
              </div>)}
            </div>)}
          </div>
        </div>
      </section>

      {/* ─── AUTORIDAD ─── */}
      <section style={{ padding: "120px 0", background: "#FAFAFA" }}>
        <div style={{ ...w, maxWidth: 720 }}>
          <R><div style={{ textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E5E7EB", margin: "0 auto 20px", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, color: "#6B7280" }}>P</div>
            <blockquote style={{ fontStyle: "italic", fontSize: 20, color: "#111827", lineHeight: 1.7, marginBottom: 20, fontWeight: 400 }}>{`"Llevo mas de 9 anos en el rubro de la sublimacion y personalizacion. Tengo un local fisico, una comunidad educativa y cientos de emprendedores que confian en mis herramientas. Estamply no lo hizo un programador que no conoce el rubro. Lo hice yo, porque necesitaba exactamente esto para mi propio negocio."`}</blockquote>
            <span style={{ fontWeight: 700, color: "#111827", fontSize: 16 }}>Pablo</span>
            <span style={{ color: "#6B7280", fontSize: 15 }}> — Fundador de Estamply</span>
          </div></R>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" style={{ padding: "140px 0" }}>
        <div style={{ ...w, maxWidth: 680 }}>
          <R><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#111827", textAlign: "center", letterSpacing: "-0.025em", marginBottom: 56, lineHeight: 1.15 }}>Tenes dudas?</h2></R>
          {faqs.map((f,i)=><R key={i} delay={i*0.03}><Faq q={f.q} a={f.a}/></R>)}
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section style={{ padding: "120px 0", background: teal }}>
        <div style={{ ...w, textAlign: "center" }}>
          <R><h2 style={{ fontSize: "clamp(28px,4vw,44px)", fontWeight: 700, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.025em", marginBottom: 16 }}>Empeza a cotizar bien. Hoy.</h2></R>
          <R delay={0.05}><p style={{ fontSize: 18, color: "rgba(255,255,255,0.75)", marginBottom: 36 }}>7 dias gratis con acceso completo. Sin tarjeta.</p></R>
          <R delay={0.1}><Link href="https://app.estamply.app/signup" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: teal, border: "none", padding: "16px 40px", borderRadius: 999, fontSize: 16, fontWeight: 600, textDecoration: "none", transition: "transform 0.15s, box-shadow 0.2s" }} onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.15)" }} onMouseLeave={e => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none" }}>Crear mi cuenta gratis {I.arr}</Link></R>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ padding: "56px 0 28px", borderTop: "1px solid #F3F4F6" }}>
        <div style={w}>
          <div className="fgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 32 }}>
            <div>
              <img src="/logo-full.png" alt="Estamply" style={{ height: 20, width: "auto", marginBottom: 12 }} />
              <p style={{ fontSize: 14, color: "#6B7280", lineHeight: 1.6 }}>El sistema de gestion para negocios de estampado.</p>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>Producto</h4>
              <a href="#funciones" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>Funciones</a>
              <a href="#precios" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>Precios</a>
              <a href="#faq" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>FAQ</a>
              <Link href="https://app.estamply.app/login" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>Iniciar sesion</Link>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>Legal</h4>
              <Link href="/legal/terminos" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>Terminos y condiciones</Link>
              <Link href="/legal/privacidad" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>Politica de privacidad</Link>
              <Link href="/legal/cookies" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>Politica de cookies</Link>
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 14 }}>Contacto</h4>
              <a href="mailto:soporte@estamply.app" style={{ display: "block", fontSize: 14, color: "#6B7280", textDecoration: "none", marginBottom: 10 }}>soporte@estamply.app</a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #F3F4F6", paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 13, color: "#9CA3AF" }}>Estamply &copy; {new Date().getFullYear()}. Hecho en Argentina para toda LATAM.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

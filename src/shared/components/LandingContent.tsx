// @ts-nocheck
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface LandingContentProps {
  defaultLang?: 'es' | 'pt'
  showLanguageBanner?: boolean
}

function useInView(t = 0.12) {
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

function R({ children, className = "", style = {}, delay = 0, y = 28 }) {
  const [ref, v] = useInView();
  return <div ref={ref} className={className} style={{ ...style, opacity: v ? 1 : 0, transform: v ? "translateY(0)" : `translateY(${y}px)`, transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>{children}</div>;
}

const I = {
  check: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 9.5L7.5 12.5L13.5 5.5" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5.5 5.5L12.5 12.5M12.5 5.5L5.5 12.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#F59E0B" strokeWidth="1.5"/><path d="M9 6V10M9 12V11.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  arr: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9H14M14 9L10 5M14 9L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dash: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 9H13" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/></svg>,
};

const pains = [
  "Calculas tus precios con la calculadora del celular y siempre te olvidas de algún costo",
  "Mandas presupuestos por WhatsApp como un mensaje de texto más",
  "No sabes cuánto ganas realmente con cada pedido",
  "Se te pierden pedidos o te olvidas de cobrar saldos",
  "Mostras tus productos con fotos sueltas por WhatsApp o Instagram",
  "Trabajas con varias técnicas y cada una tiene costos distintos que calculas por separado",
];

const compRows = [
  { f: "Calcular costos reales", a: "Solo lo obvio", aS: "x", b: "Si armas las fórmulas", bS: "w", c: "Automático con desglose" },
  { f: "Presupuestos profesionales", a: "Audio de WhatsApp", aS: "x", b: "Armar manual cada vez", bS: "w", c: "Con tu logo, un click" },
  { f: "Gestión de pedidos", a: "Memoria y notas", aS: "x", b: "Hojas separadas", bS: "w", c: "Kanban con alertas" },
  { f: "Catálogo web propio", a: "No existe", aS: "x", b: "No existe", bS: "x", c: "Incluido, listo en minutos" },
  { f: "Rentabilidad real", a: "Ni idea", aS: "x", b: "Si dedicas horas", bS: "w", c: "Dashboard automático" },
  { f: "Todas las técnicas", a: "Una cuenta cada vez", aS: "x", b: "Una hoja por técnica", bS: "w", c: "Todo en un solo sistema" },
];

const catalogBullets = [
  "Tu link profesional para la bio de Instagram y WhatsApp",
  "Productos con variantes de talle, color y precio",
  "Guía de talles con imagen y tabla",
  "Medios de pago visibles (efectivo, transferencia, tarjeta)",
  "Los pedidos entran directo como presupuestos en tu sistema",
  "Cero código. Cero hosting. Cero costo adicional.",
];

const techniques = ["Sublimación", "DTF Textil", "DTF UV", "Vinilo", "Serigrafía"];

const profiles = [
  { tag: "Recién empezás", copy: "Compraste tu primera prensa. Tenés pocos pedidos y no estás seguro de cómo poner precios. Necesitas una forma simple de saber cuánto cobrar y verte profesional desde el día uno.", plan: "Emprendedor" },
  { tag: "Tu negocio está creciendo", copy: "Ya tenés clientes fijos y hacés entre 20 y 50 pedidos por mes. Sabés que tenés que organizarte mejor pero no encontrás cómo. Necesitas presupuestos profesionales, control de pedidos y un catálogo.", plan: "Pro" },
  { tag: "Tenés un negocio establecido", copy: "Tenés empleados, manejás múltiples técnicas y recibís pedidos corporativos. Necesitas control real: saber quién produce qué, qué técnica es más rentable y cómo va tu negocio mes a mes.", plan: "Negocio" },
];

const plans = [
  { name: "Emprendedor", price: 9, annual: 63, feat: ["Cotizador inteligente — todas las técnicas", "Hasta 25 productos en catálogo web", "1 foto por producto", "Presupuestos con tu logo", "Gestión de pedidos (Kanban)", "Base de clientes", "Estadísticas del mes actual"] },
  { name: "Pro", price: 17, annual: 119, pop: true, feat: ["Todo lo del Emprendedor, más:", "Productos ilimitados en catálogo web", "3 fotos por producto", "Estadísticas completas con historial", "Rentabilidad por producto y técnica", "Permisos por usuario"] },
  { name: "Negocio", price: 29, annual: 203, feat: ["Todo lo del Pro, más:", "5 fotos por producto", "Costos de mano de obra en cotización", "Exportar datos", "Sin badge \"Powered by Estamply\""] },
];

const featureTable = [
  { section: "Cotizador", rows: [
    { f: "Cotizador inteligente", a: true, b: true, c: true },
    { f: "Sublimación, DTF, Vinilo, Serigrafía", a: true, b: true, c: true },
    { f: "Desglose de costos completo", a: true, b: true, c: true },
    { f: "Margen y markup", a: true, b: true, c: true },
    { f: "Descuento por volumen", a: true, b: true, c: true },
    { f: "Ganancia por hora de trabajo", a: true, b: true, c: true },
    { f: "Costos de mano de obra", a: false, b: false, c: true },
  ]},
  { section: "Presupuestos", rows: [
    { f: "Presupuestos con tu logo", a: true, b: true, c: true },
    { f: "Compartir por WhatsApp y email", a: true, b: true, c: true },
    { f: "Link público de presupuesto", a: true, b: true, c: true },
    { f: "Confirmar presupuesto como pedido", a: true, b: true, c: true },
    { f: "Condiciones de pago personalizables", a: true, b: true, c: true },
  ]},
  { section: "Pedidos", rows: [
    { f: "Tablero Kanban (4 estados)", a: true, b: true, c: true },
    { f: "Alertas de pedidos vencidos", a: true, b: true, c: true },
    { f: "Control de cobros pendientes", a: true, b: true, c: true },
    { f: "Link al diseño en cada pedido", a: true, b: true, c: true },
  ]},
  { section: "Catálogo Web", rows: [
    { f: "Catálogo web público", a: true, b: true, c: true },
    { f: "Productos en catálogo", a: "25", b: "Ilimitados", c: "Ilimitados" },
    { f: "Fotos por producto", a: "1", b: "3", c: "5" },
    { f: "Variantes de talle y color", a: true, b: true, c: true },
    { f: "Guía de talles", a: true, b: true, c: true },
    { f: "Medios de pago con recargo/descuento", a: true, b: true, c: true },
    { f: "Botón de WhatsApp flotante", a: true, b: true, c: true },
    { f: "Barra de anuncios", a: true, b: true, c: true },
    { f: "Ocultar badge \"Powered by Estamply\"", a: false, b: false, c: true },
  ]},
  { section: "Estadísticas", rows: [
    { f: "Facturación del mes actual", a: true, b: true, c: true },
    { f: "Estadísticas con historial completo", a: false, b: true, c: true },
    { f: "Rentabilidad por producto", a: false, b: true, c: true },
    { f: "Rentabilidad por técnica", a: false, b: true, c: true },
    { f: "Ranking de clientes", a: false, b: true, c: true },
    { f: "Evolución mes a mes", a: false, b: true, c: true },
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
  { q: "¿Cuánto dura la prueba gratis?", a: "7 días con acceso completo al plan Pro. Sin poner tarjeta. Si no te sirve, simplemente no haces nada y la cuenta se pausa." },
  { q: "¿Funciona para mi técnica?", a: "Sí. Sublimación, DTF textil, DTF UV, vinilo y serigrafía. Si estampás, Estamply te sirve — todo desde el mismo sistema." },
  { q: "¿Necesito saber programar para el catálogo?", a: "No. Subís tus productos, ponés precios, y tu tienda está online. Cero código, cero hosting, cero conocimiento técnico." },
  { q: "¿Sirve en mi país?", a: "Sí. Funciona en toda LATAM. Configurás tu país, tu moneda y tus medios de pago al registrarte." },
  { q: "Ya tengo un Excel, ¿por qué cambiaría?", a: "El Excel no genera presupuestos con tu logo, no gestiona pedidos con alertas, no te da catálogo web, y no te dice cuánto ganas por hora. Estamply hace todo eso desde un solo lugar." },
  { q: "¿Y si no me gusta?", a: "Si en 7 días sentís que no te aporta valor, no pagás nada. Podés cancelar cuando quieras." },
  { q: "¿Cómo se paga?", a: "Tarjeta (Stripe), MercadoPago en Argentina, PIX/boleto en Brasil. Precios en USD; en Argentina se cobra en pesos al tipo de cambio del día." },
  { q: "¿Puedo usarlo desde el celular?", a: "Sí. 100% responsive. Cotizás, mandás presupuestos y gestionás pedidos desde cualquier dispositivo." },
];

function Faq({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid #E2E8F0" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", textAlign: "left", padding: "20px 0", background: "none", border: "none", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, fontFamily: "var(--f)" }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: "#1E293B", lineHeight: 1.4 }}>{q}</span>
        <span style={{ flexShrink: 0, color: "#94A3B8", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>{I.chev}</span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: "hidden", transition: "max-height 0.35s cubic-bezier(0.22,1,0.36,1)" }}>
        <p style={{ padding: "0 0 20px", fontSize: 15, color: "#334155", lineHeight: 1.75 }}>{a}</p>
      </div>
    </div>
  );
}

function CI({ val }) {
  if (val === true) return I.check;
  if (val === false) return I.dash;
  return <span style={{ fontSize: 13, fontWeight: 600, color: "#1E293B" }}>{val}</span>;
}

export default function LandingContent({ defaultLang = 'es', showLanguageBanner = false }: LandingContentProps) {
  const [annual, setAnnual] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [showFt, setShowFt] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  const w = { maxWidth: 1080, margin: "0 auto", padding: "0 24px" };
  const sp = 112;

  const teal = "#0F766E";
  const tealLight = "#0D9488";
  const brandDark = "#001849";
  const brandDarkGrad = `linear-gradient(135deg, ${brandDark} 0%, #001030 100%)`;

  return (
    <div style={{ fontFamily: "var(--f)", color: "#334155", background: "#fff" }}>
      <style>{`
        :root{--f:'Plus Jakarta Sans',sans-serif}
        *{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        .cta{display:inline-flex;align-items:center;gap:8px;background:${teal};color:#fff;border:none;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:var(--f);transition:background 0.2s,transform 0.15s,box-shadow 0.2s;text-decoration:none}
        .cta:hover{background:#0D6D66;transform:translateY(-1px);box-shadow:0 6px 20px rgba(15,118,110,0.22)}
        .cta-g{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#334155;border:1.5px solid #E2E8F0;padding:14px 28px;border-radius:8px;font-size:15px;font-weight:500;cursor:pointer;font-family:var(--f);transition:border-color 0.2s,color 0.2s;text-decoration:none}
        .cta-g:hover{border-color:${teal};color:${teal}}
        .lb{font-size:12px;font-weight:700;letter-spacing:0.07em;color:${tealLight};text-transform:uppercase}
        .h2{font-size:clamp(28px,4.2vw,42px);font-weight:800;line-height:1.12;color:#0F172A;letter-spacing:-0.025em}
        .sub{font-size:17px;color:#475569;line-height:1.7;max-width:560px}
        .card{background:#fff;border:1px solid #E5E7EB;border-radius:12px;transition:border-color 0.2s,box-shadow 0.25s}
        .card:hover{border-color:#CBD5E1;box-shadow:0 4px 16px rgba(0,0,0,0.04)}
        @media(max-width:768px){
          .hflex{flex-direction:column!important}
          .f2{grid-template-columns:1fr!important}
          .pflex{flex-direction:column!important}
          .catflex{flex-direction:column!important}
          .fgrid{grid-template-columns:1fr 1fr!important}
          .navl{display:none!important}
          .trow{flex-wrap:wrap!important}
          .cmpd{display:none!important}
          .cmpm{display:block!important}
          .ftd{display:none!important}
          .ftm{display:block!important}
        }
        @media(min-width:769px){.cmpm{display:none!important}.ftm{display:none!important}}
      `}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? "rgba(255,255,255,0.96)" : "transparent", backdropFilter: scrolled ? "blur(12px)" : "none", borderBottom: scrolled ? "1px solid #F1F5F9" : "1px solid transparent", transition: "all 0.3s" }}>
        <div style={{ ...w, display: "flex", alignItems: "center", justifyContent: "space-between", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Estamply</span>
          </div>
          <div className="navl" style={{ display: "flex", gap: 28 }}>
            {[["Funciones","#funciones"],["Precios","#precios"],["FAQ","#faq"]].map(([t,h])=><a key={t} href={h} style={{ fontSize: 14, color: "#475569", textDecoration: "none", fontWeight: 500 }}>{t}</a>)}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="https://app.estamply.app/login" style={{ fontSize: 14, color: "#475569", textDecoration: "none", fontWeight: 500 }}>Iniciar sesión</Link>
            <Link href="https://app.estamply.app/signup" className="cta" style={{ padding: "8px 18px", fontSize: 13, borderRadius: 7 }}>Empezar gratis</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 130, paddingBottom: sp }}>
        <div style={w}>
          <div className="hflex" style={{ display: "flex", gap: 56, alignItems: "center" }}>
            <div style={{ flex: "1 1 52%" }}>
              <R><p className="lb" style={{ marginBottom: 14 }}>Sistema de gestión para negocios de estampado</p></R>
              <R delay={0.05}><h1 style={{ fontSize: "clamp(34px,5vw,50px)", fontWeight: 800, lineHeight: 1.08, color: "#0F172A", letterSpacing: "-0.03em", marginBottom: 20 }}>
                Gestiona tu negocio de estampado <span style={{ color: teal }}>como siempre quisiste.</span>
              </h1></R>
              <R delay={0.1}><p style={{ fontSize: 18, color: "#475569", lineHeight: 1.65, marginBottom: 32, maxWidth: 460 }}>Cotiza con precisión, envía presupuestos profesionales, gestiona pedidos, vende desde tu catálogo web y sabe cuánto ganas de verdad. Todo en un solo lugar.</p></R>
              <R delay={0.15}>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
                  <Link href="https://app.estamply.app/signup" className="cta">Empezar gratis — 7 días {I.arr}</Link>
                  <a href="#funciones" className="cta-g">Ver cómo funciona</a>
                </div>
                <p style={{ fontSize: 13, color: "#64748B" }}>Sin tarjeta de crédito · Cancela cuando quieras</p>
              </R>
            </div>
            <R delay={0.2} y={40} style={{ flex: "1 1 48%" }}>
              <div style={{ transform: "perspective(1400px) rotateY(-3deg) rotateX(1.5deg)" }}>
                <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 20px 60px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)", border: "1px solid #E5E7EB", overflow: "hidden" }}>
                  <div style={{ background: "#F8FAFB", borderBottom: "1px solid #E5E7EB", padding: "9px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", gap: 5 }}>{[0,1,2].map(i=><div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: "#E5E7EB" }}/>)}</div>
                    <div style={{ flex: 1, textAlign: "center" }}><span style={{ fontSize: 11, color: "#94A3B8", fontFamily: "monospace", background: "#F1F5F9", padding: "2px 10px", borderRadius: 4 }}>estamply.app</span></div>
                  </div>
                  <div style={{ padding: "18px 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                        {["Sublimación","DTF","Vinilo","Serigrafía"].map((t,i)=><span key={t} style={{ padding: "4px 10px", borderRadius: 5, fontSize: 11, fontWeight: i===0?600:400, background: i===0?teal:"transparent", color: i===0?"#fff":"#94A3B8", border: i===0?"none":"1px solid #E5E7EB" }}>{t}</span>)}
                      </div>
                      {[["PRODUCTO","Remera"],["CANTIDAD","10"],["DISEÑO","15 × 20 cm"]].map(([l,v])=><div key={l} style={{ marginBottom: 10 }}><div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", marginBottom: 3 }}>{l}</div><div style={{ padding: "7px 10px", border: "1px solid #E5E7EB", borderRadius: 6, fontSize: 12, color: "#1E293B" }}>{v}</div></div>)}
                    </div>
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", marginBottom: 6 }}>DESGLOSE DE COSTOS</div>
                      {[["Producto base","$12.000"],["Papel (10 hojas)","$150"],["Tinta","$20"],["Amort. plancha","$40"],["Amort. impresora","$140"],["Desperdicio (5%)","$618"]].map(([n,v])=><div key={n} style={{ display: "flex", justifyContent: "space-between", padding: "3.5px 0", fontSize: 11, color: "#475569", borderBottom: "1px solid #F8FAFC" }}><span>{n}</span><span style={{ fontWeight: 600, color: "#1E293B" }}>{v}</span></div>)}
                      <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0 0", fontWeight: 700, fontSize: 12, color: teal, borderTop: "1px solid #E5E7EB", marginTop: 4 }}><span>Costo Total</span><span>$12.968</span></div>
                    </div>
                  </div>
                  <div style={{ margin: "0 20px 18px", background: teal, borderRadius: 8, padding: "14px 18px", color: "#fff" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <div>
                        <div style={{ fontSize: 9, letterSpacing: "0.08em", opacity: 0.6, fontWeight: 500 }}>PRECIO FINAL</div>
                        <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.02em" }}>$20.532 <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.7 }}>por unidad</span></div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>Ganancia</div>
                        <div style={{ fontSize: 18, fontWeight: 800 }}>$75.645</div>
                        <div style={{ fontSize: 11, opacity: 0.7 }}>37% · 18 min</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </R>
          </div>
          <R delay={0.3}><div className="trow" style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 56 }}>
            {techniques.map(t=><span key={t} style={{ padding: "7px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, color: "#475569", background: "#F8FAFB", border: "1px solid #E5E7EB" }}>{t}</span>)}
          </div></R>
        </div>
      </section>

      {/* DOLOR */}
      <section style={{ padding: `${sp}px 0`, background: "#F8FAFB" }}>
        <div style={w}>
          <R><div style={{ textAlign: "center", marginBottom: 44 }}><p className="lb" style={{ marginBottom: 10 }}>El problema</p><h2 className="h2">¿Te pasa alguna de estas cosas?</h2></div></R>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 12, maxWidth: 760, margin: "0 auto" }}>
            {pains.map((p,i)=><R key={i} delay={i*0.04}><div className="card" style={{ display: "flex", gap: 12, padding: "16px 18px", alignItems: "flex-start" }}><span style={{ flexShrink: 0, marginTop: 1 }}>{I.x}</span><span style={{ fontSize: 14, color: "#475569", lineHeight: 1.55 }}>{p}</span></div></R>)}
          </div>
          <R delay={0.25}><p style={{ textAlign: "center", marginTop: 28, fontSize: 15, color: tealLight, fontWeight: 600 }}>Si te identificas con al menos una, Estamply fue creado para vos.</p></R>
          <R delay={0.3}><div style={{ marginTop: 48, maxWidth: 680, margin: "48px auto 0", padding: "36px 40px", borderRadius: 14, background: brandDarkGrad, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(13,148,136,0.12)" }}/>
            <p style={{ fontStyle: "italic", fontSize: 18, color: "#CBD5E1", lineHeight: 1.7, position: "relative", marginBottom: 16, fontWeight: 400 }}>No es tu culpa. En este rubro nadie nos enseña a gestionar un negocio. Nos enseñan a sublimar, a estampar, a producir — pero no a cotizar bien, ni a organizar pedidos, ni a saber si realmente estamos ganando plata.</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: "#5EEAD4", position: "relative" }}>Estamply existe para cambiar eso.</p>
          </div></R>
        </div>
      </section>

      {/* COMPARISON */}
      <section style={{ padding: `${sp}px 0` }}>
        <div style={w}>
          <R><div style={{ textAlign: "center", marginBottom: 44 }}><p className="lb" style={{ marginBottom: 10 }}>Comparativa</p><h2 className="h2">¿Cómo gestionas tu negocio hoy?</h2></div></R>
          <R delay={0.1}><div className="cmpd" style={{ borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr style={{ background: "#F8FAFB" }}>
                <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280" }}></th>
                <th style={{ padding: "12px 18px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>CALCULADORA + CUADERNO</th>
                <th style={{ padding: "12px 18px", textAlign: "center", fontSize: 12, fontWeight: 600, color: "#6B7280" }}>EXCEL / PLANILLA</th>
                <th style={{ padding: "12px 18px", textAlign: "center", fontSize: 12, fontWeight: 700, color: tealLight, background: "rgba(13,148,136,0.03)" }}>ESTAMPLY</th>
              </tr></thead>
              <tbody>{compRows.map((r,i)=><tr key={i} style={{ borderTop: "1px solid #F1F5F9" }}>
                <td style={{ padding: "13px 18px", fontSize: 14, fontWeight: 500, color: "#1E293B" }}>{r.f}</td>
                <td style={{ padding: "13px 18px", textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6B7280" }}>{r.aS==="x"?I.x:I.warn} {r.a}</span></td>
                <td style={{ padding: "13px 18px", textAlign: "center" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, color: "#6B7280" }}>{r.bS==="x"?I.x:I.warn} {r.b}</span></td>
                <td style={{ padding: "13px 18px", textAlign: "center", background: "rgba(13,148,136,0.02)" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, color: tealLight }}>{I.check} {r.c}</span></td>
              </tr>)}</tbody>
            </table>
          </div></R>
          <div className="cmpm">{compRows.map((r,i)=><R key={i} delay={i*0.04}><div className="card" style={{ padding: "16px 18px", marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#1E293B", marginBottom: 10 }}>{r.f}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280" }}>{r.aS==="x"?I.x:I.warn} Calculadora: {r.a}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#6B7280" }}>{r.bS==="x"?I.x:I.warn} Excel: {r.b}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: tealLight, fontWeight: 500 }}>{I.check} Estamply: {r.c}</div>
            </div>
          </div></R>)}</div>
          <R delay={0.15}><p style={{ textAlign: "center", marginTop: 24, fontSize: 15, color: "#475569" }}>No se trata de que lo que usas hoy esté mal. Se trata de que hay una forma mejor.</p></R>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" style={{ padding: `${sp}px 0`, background: "#F8FAFB" }}>
        <div style={w}>
          <R><div style={{ textAlign: "center", marginBottom: 56 }}><p className="lb" style={{ marginBottom: 10 }}>Funciones</p><h2 className="h2">Todo lo que tu negocio necesita.<br/>En un solo lugar.</h2><p className="sub" style={{ margin: "14px auto 0" }}>Estamply reemplaza la calculadora, el cuaderno, el Excel y las notas del celular con un solo sistema.</p></div></R>

          <R><div className="card" style={{ overflow: "hidden", marginBottom: 20 }}>
            <div style={{ padding: "40px 40px 0" }}>
              <p className="lb" style={{ marginBottom: 6 }}>Cotizador inteligente</p>
              <h3 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 800, color: "#0F172A", lineHeight: 1.15, marginBottom: 12, letterSpacing: "-0.02em" }}>Nunca más pierdas plata por cotizar mal</h3>
              <p style={{ fontSize: 16, color: "#475569", lineHeight: 1.7, maxWidth: 560, marginBottom: 16 }}>Estamply calcula todos tus costos — producto, papel, tinta, amortización, desperdicio — y te dice exactamente cuánto cobrar. Para sublimación, DTF, vinilo y serigrafía.</p>
              <div style={{ borderLeft: `2px solid ${teal}`, paddingLeft: 14, fontSize: 15, fontStyle: "italic", color: "#1E293B" }}>Cuando un cliente te pregunta cuánto sale, le respondés con un número que te respalda.</div>
            </div>
            <div style={{ margin: "28px auto 0", maxWidth: 620, borderRadius: "12px 12px 0 0", overflow: "hidden", border: "1px solid #E5E7EB", borderBottom: "none" }}>
              <img src="/cotizador-subli.png" alt="Cotizador de Estamply mostrando el calculo de costos para sublimacion de camisetas" style={{ width: "100%", display: "block" }} />
            </div>
          </div></R>

          <div className="f2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
            {[
              { lb: "Presupuestos profesionales", t: "Presupuestos que te hacen ver como un negocio serio", c: "Genera presupuestos con tu logo, compártelos por WhatsApp o email. Tu cliente los confirma y se convierten en pedido.", q: "Cuando te ven profesional, te regatean menos.", img: "/presupuesto.png" },
              { lb: "Gestion de pedidos", t: "Cada pedido en su lugar. Ninguno se pierde.", c: "Tablero Kanban con 4 estados, datos del cliente, link al diseno y alertas de cobros pendientes.", q: "Con 3 pedidos funciona la memoria. Con 15, necesitas un sistema.", img: null },
            ].map((f,i)=><R key={i} delay={i*0.06}><div className="card" style={{ overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "28px 24px" }}>
                <p className="lb" style={{ marginBottom: 6 }}>{f.lb}</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", lineHeight: 1.2, marginBottom: 10 }}>{f.t}</h3>
                <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: 14 }}>{f.c}</p>
                <div style={{ borderLeft: `2px solid ${teal}`, paddingLeft: 12, fontSize: 14, fontStyle: "italic", color: "#1E293B" }}>{f.q}</div>
              </div>
              {f.img
                ? <div style={{ borderTop: "1px solid #E5E7EB", overflow: "hidden" }}><img src={f.img} alt={f.lb} style={{ width: "100%", display: "block" }} /></div>
                : <div style={{ flex: 1, minHeight: 170, background: "#F0FDFA", borderTop: "1px solid #E5E7EB", display: "grid", placeItems: "center", color: "#94A3B8", fontSize: 13 }}>Screenshot: {f.lb}</div>
              }
            </div></R>)}
          </div>

          <div className="f2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {[
              { lb: "Estadísticas y rentabilidad", t: "Sabe cuánto ganas. De verdad.", c: "Facturación, costos, margen bruto, ranking de productos, ventas por técnica. No es cuánta plata entra — es cuánta te queda.", q: "La diferencia entre facturar mucho y ganar mucho es saber tus números." },
              { lb: "Base de clientes", t: "Conoce a tus clientes.", c: "Ficha de cada cliente con historial, total facturado y último contacto. Importa, exporta e identifica quién te hace crecer.", q: null },
            ].map((f,i)=><R key={i} delay={i*0.06}><div className="card" style={{ overflow: "hidden", height: "100%", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: "28px 24px" }}>
                <p className="lb" style={{ marginBottom: 6 }}>{f.lb}</p>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", lineHeight: 1.2, marginBottom: 10 }}>{f.t}</h3>
                <p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, marginBottom: f.q?14:0 }}>{f.c}</p>
                {f.q && <div style={{ borderLeft: `2px solid ${teal}`, paddingLeft: 12, fontSize: 14, fontStyle: "italic", color: "#1E293B" }}>{f.q}</div>}
              </div>
              <div style={{ flex: 1, minHeight: 170, background: "#F0FDFA", borderTop: "1px solid #E5E7EB", display: "grid", placeItems: "center", color: "#94A3B8", fontSize: 13 }}>Screenshot: {f.lb}</div>
            </div></R>)}
          </div>
        </div>
      </section>

      {/* CATÁLOGO WEB */}
      <section style={{ padding: `${sp}px 0`, background: brandDarkGrad, color: "#fff", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", bottom: -120, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(13,148,136,0.08)" }}/>
        <div style={w}>
          <R><span style={{ display: "inline-block", padding: "5px 12px", borderRadius: 5, background: "rgba(94,234,212,0.1)", border: "1px solid rgba(94,234,212,0.2)", marginBottom: 14 }}><span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: "#5EEAD4" }}>INCLUIDO EN TODOS LOS PLANES</span></span></R>
          <div className="catflex" style={{ display: "flex", gap: 56, alignItems: "center" }}>
            <div style={{ flex: "1 1 55%" }}>
              <R><h2 style={{ fontSize: "clamp(28px,4.2vw,42px)", fontWeight: 800, lineHeight: 1.12, letterSpacing: "-0.025em", marginBottom: 10 }}>Tu propia tienda online.{" "}<span style={{ color: "#5EEAD4" }}>Lista en minutos.</span></h2></R>
              <R delay={0.05}><p style={{ fontSize: 17, color: "#A3B8D6", lineHeight: 1.7, marginBottom: 28 }}>Sin saber programar. Sin pagar diseñadores. Sin servidores. Sin conocimiento técnico.</p></R>
              <R delay={0.1}><div style={{ marginBottom: 28 }}>{catalogBullets.map((b,i)=><div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 10 }}><span style={{ flexShrink: 0, marginTop: 1 }}>{I.check}</span><span style={{ fontSize: 14, color: "#CBD8E8", lineHeight: 1.55 }}>{b}</span></div>)}</div></R>
              <R delay={0.15}>
                <div style={{ borderLeft: "2px solid #5EEAD4", paddingLeft: 14, marginBottom: 28 }}><p style={{ fontStyle: "italic", fontSize: 17, color: "#E2E8F0", lineHeight: 1.5 }}>Tu catálogo vende mientras vos estás estampando.</p></div>
                <Link href="https://app.estamply.app/signup" className="cta">Empezar gratis — 7 días {I.arr}</Link>
              </R>
            </div>
            <R delay={0.2} y={40} style={{ flex: "1 1 45%" }}>
              <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", padding: 20, boxShadow: "0 24px 48px rgba(0,0,0,0.3)" }}>
                <div style={{ background: "#fff", borderRadius: 10, height: 340, display: "grid", placeItems: "center", color: "#94A3B8", fontSize: 14 }}>Screenshot: Catálogo Web</div>
              </div>
            </R>
          </div>
        </div>
      </section>

      {/* TÉCNICAS */}
      <section style={{ padding: `${sp}px 0` }}>
        <div style={{ ...w, textAlign: "center" }}>
          <R><p className="lb" style={{ marginBottom: 10 }}>Multi-técnica</p><h2 className="h2" style={{ marginBottom: 12 }}>Una plataforma. Todas tus técnicas.</h2></R>
          <R delay={0.05}><p className="sub" style={{ margin: "0 auto 16px" }}>La única herramienta diseñada para gestionar sublimación, DTF, vinilo y serigrafía desde el mismo sistema.</p><p style={{ fontSize: 15, color: "#475569", lineHeight: 1.7, maxWidth: 540, margin: "0 auto 40px" }}>Cada técnica tiene costos, insumos y tiempos distintos. Estamply cotiza, presupuesta, gestiona pedidos y mide tu rentabilidad de cada una.</p></R>
          <R delay={0.1}><div className="trow" style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>{techniques.map(t=><div key={t} className="card" style={{ padding: "16px 24px", minWidth: 120 }}><div style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{t}</div></div>)}</div></R>
        </div>
      </section>

      {/* PARA QUIÉN */}
      <section style={{ padding: `${sp}px 0`, background: "#F8FAFB" }}>
        <div style={w}>
          <R><div style={{ textAlign: "center", marginBottom: 44 }}><p className="lb" style={{ marginBottom: 10 }}>Para quién es</p><h2 className="h2">¿Es Estamply para vos?</h2></div></R>
          <div className="pflex" style={{ display: "flex", gap: 20 }}>
            {profiles.map((p,i)=><R key={i} delay={i*0.08} style={{ flex: 1 }}><div className="card" style={{ padding: 28, height: "100%", display: "flex", flexDirection: "column" }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#0F172A", marginBottom: 10 }}>{p.tag}</h3>
              <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.7, flex: 1, marginBottom: 16 }}>{p.copy}</p>
              <div style={{ padding: "10px 14px", background: "#F8FAFB", borderRadius: 6, border: "1px solid #E5E7EB" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: tealLight }}>Plan recomendado: {p.plan}</span>
              </div>
            </div></R>)}
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" style={{ padding: `${sp}px 0` }}>
        <div style={w}>
          <R><div style={{ textAlign: "center", marginBottom: 40 }}>
            <p className="lb" style={{ marginBottom: 10 }}>Precios</p>
            <h2 className="h2">Planes simples. Precios justos.</h2>
            <p className="sub" style={{ margin: "10px auto 20px" }}>Empezá con 7 días gratis del plan Pro. Sin tarjeta de crédito.</p>
            <div style={{ display: "inline-flex", background: "#F1F5F9", borderRadius: 8, padding: 3 }}>
              {[false,true].map(a=><button key={String(a)} onClick={()=>setAnnual(a)} style={{ padding: "7px 18px", borderRadius: 6, border: "none", cursor: "pointer", background: annual===a?"#fff":"transparent", boxShadow: annual===a?"0 1px 3px rgba(0,0,0,0.06)":"none", color: annual===a?"#0F172A":"#475569", fontWeight: 600, fontSize: 13, fontFamily: "var(--f)", transition: "all 0.2s" }}>{a?<>Anual <span style={{ color: tealLight, fontSize: 11 }}>−3 meses</span></>:"Mensual"}</button>)}
            </div>
          </div></R>

          <div className="pflex" style={{ display: "flex", gap: 20, alignItems: "stretch", marginBottom: 32 }}>
            {plans.map((pl,i)=><R key={i} delay={i*0.08} style={{ flex: 1 }}><div style={{ background: "#fff", borderRadius: 14, padding: 32, border: pl.pop?`2px solid ${teal}`:"1px solid #E5E7EB", boxShadow: pl.pop?"0 8px 28px rgba(15,118,110,0.1)":"none", height: "100%", display: "flex", flexDirection: "column", position: "relative" }}>
              {pl.pop && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: teal, color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 4, letterSpacing: "0.04em" }}>MÁS POPULAR</div>}
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#0F172A", marginBottom: 6 }}>{pl.name}</h3>
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 40, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.03em" }}>${annual?Math.round(pl.annual/12):pl.price}</span>
                <span style={{ fontSize: 14, color: "#475569" }}>/mes</span>
                {annual && <div style={{ fontSize: 12, color: tealLight, fontWeight: 600, marginTop: 2 }}>${pl.annual}/año — 3 meses gratis</div>}
              </div>
              <div style={{ flex: 1, marginBottom: 20 }}>
                {pl.feat.map((f,fi)=><div key={fi} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 9 }}>
                  {!f.startsWith("Todo") && <span style={{ flexShrink: 0, marginTop: 1 }}>{I.check}</span>}
                  <span style={{ fontSize: 13, color: f.startsWith("Todo")?tealLight:"#334155", fontWeight: f.startsWith("Todo")?600:400, lineHeight: 1.5 }}>{f}</span>
                </div>)}
              </div>
              <Link href="https://app.estamply.app/signup" className="cta" style={{ width: "100%", justifyContent: "center", background: pl.pop?teal:"transparent", color: pl.pop?"#fff":teal, border: pl.pop?"none":`1.5px solid ${teal}` }}>Empezar gratis</Link>
            </div></R>)}
          </div>

          <R delay={0.2}><p style={{ fontSize: 13, color: "#64748B", textAlign: "center", marginBottom: 8 }}>Sin tarjeta de crédito · Cancela cuando quieras · Precios en USD</p></R>
          <R delay={0.25}><p style={{ fontSize: 15, fontWeight: 600, color: "#1E293B", fontStyle: "italic", textAlign: "center", marginBottom: 32 }}>¿Un pedido mal cotizado? Te puede costar más que un año entero de Estamply.</p></R>

          <R delay={0.3}><div style={{ textAlign: "center" }}>
            <button onClick={() => setShowFt(!showFt)} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 20px", cursor: "pointer", fontSize: 14, fontWeight: 600, color: teal, fontFamily: "var(--f)" }}>
              {showFt ? "Ocultar todas las funcionalidades" : "Ver todas las funcionalidades"}
              <span style={{ transform: showFt ? "rotate(180deg)" : "none", transition: "transform 0.25s" }}>{I.chev}</span>
            </button>
          </div></R>

          {/* Desktop feature table */}
          <div className="ftd" style={{ maxHeight: showFt ? 5000 : 0, overflow: "hidden", transition: "max-height 0.6s cubic-bezier(0.22,1,0.36,1)", marginTop: showFt ? 24 : 0 }}>
            <div style={{ borderRadius: 12, border: "1px solid #E5E7EB", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead><tr style={{ background: "#F8FAFB" }}>
                  <th style={{ padding: "12px 18px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6B7280" }}></th>
                  <th style={{ padding: "12px 18px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#1E293B", width: "20%" }}>Emprendedor<br/><span style={{ fontWeight: 500, color: "#475569" }}>${annual?Math.round(63/12):9}/mes</span></th>
                  <th style={{ padding: "12px 18px", textAlign: "center", fontSize: 13, fontWeight: 700, color: teal, width: "20%", background: "rgba(13,148,136,0.03)" }}>Pro<br/><span style={{ fontWeight: 500 }}>${annual?Math.round(119/12):17}/mes</span></th>
                  <th style={{ padding: "12px 18px", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#1E293B", width: "20%" }}>Negocio<br/><span style={{ fontWeight: 500, color: "#475569" }}>${annual?Math.round(203/12):29}/mes</span></th>
                </tr></thead>
                <tbody>
                  {featureTable.map((sec,si)=>(
                    <React.Fragment key={si}>
                      <tr><td colSpan={4} style={{ padding: "14px 18px 6px", fontSize: 12, fontWeight: 700, color: tealLight, letterSpacing: "0.05em", textTransform: "uppercase", background: "#FAFBFC" }}>{sec.section}</td></tr>
                      {sec.rows.map((r,ri)=><tr key={ri} style={{ borderTop: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 18px", fontSize: 14, color: "#334155" }}>{r.f}</td>
                        <td style={{ padding: "10px 18px", textAlign: "center" }}><CI val={r.a}/></td>
                        <td style={{ padding: "10px 18px", textAlign: "center", background: "rgba(13,148,136,0.02)" }}><CI val={r.b}/></td>
                        <td style={{ padding: "10px 18px", textAlign: "center" }}><CI val={r.c}/></td>
                      </tr>)}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile feature table */}
          <div className="ftm" style={{ maxHeight: showFt ? 8000 : 0, overflow: "hidden", transition: "max-height 0.6s cubic-bezier(0.22,1,0.36,1)", marginTop: showFt ? 24 : 0 }}>
            {featureTable.map((sec,si)=><div key={si} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: tealLight, letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>{sec.section}</div>
              {sec.rows.map((r,ri)=><div key={ri} style={{ padding: "10px 0", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, color: "#334155", flex: 1 }}>{r.f}</span>
                <div style={{ display: "flex", gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: "center", width: 50 }}><div style={{ fontSize: 9, color: "#6B7280", fontWeight: 600, marginBottom: 2 }}>EMP</div><CI val={r.a}/></div>
                  <div style={{ textAlign: "center", width: 50 }}><div style={{ fontSize: 9, color: tealLight, fontWeight: 600, marginBottom: 2 }}>PRO</div><CI val={r.b}/></div>
                  <div style={{ textAlign: "center", width: 50 }}><div style={{ fontSize: 9, color: "#6B7280", fontWeight: 600, marginBottom: 2 }}>NEG</div><CI val={r.c}/></div>
                </div>
              </div>)}
            </div>)}
          </div>
        </div>
      </section>

      {/* AUTORIDAD */}
      <section style={{ padding: `${sp}px 0`, background: "#F8FAFB" }}>
        <div style={{ ...w, maxWidth: 720 }}>
          <R><div style={{ textAlign: "center" }}>
            <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#E2E8F0", margin: "0 auto 16px", border: "2px solid #E2E8F0", display: "grid", placeItems: "center", fontSize: 28, fontWeight: 700, color: "#475569" }}>P</div>
            <blockquote style={{ fontStyle: "italic", fontSize: 19, color: "#1E293B", lineHeight: 1.7, marginBottom: 16, fontWeight: 400 }}>{`"Llevo más de 9 años en el rubro de la sublimación y personalización. Tengo un local físico, una comunidad educativa y cientos de emprendedores que confían en mis herramientas. Estamply no lo hizo un programador que no conoce el rubro. Lo hice yo, porque necesitaba exactamente esto para mi propio negocio."`}</blockquote>
            <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 15 }}>Pablo</span>
            <span style={{ color: "#475569", fontSize: 14 }}> — Fundador de Estamply, Sublishop y Sublima con Éxito</span>
          </div></R>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: `${sp}px 0` }}>
        <div style={{ ...w, maxWidth: 660 }}>
          <R><div style={{ textAlign: "center", marginBottom: 44 }}><p className="lb" style={{ marginBottom: 10 }}>FAQ</p><h2 className="h2">¿Tenés dudas?</h2></div></R>
          {faqs.map((f,i)=><R key={i} delay={i*0.03}><Faq q={f.q} a={f.a}/></R>)}
        </div>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: `${sp}px 0`, background: brandDarkGrad, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(13,148,136,0.1) 0%,transparent 70%)" }}/>
        <div style={{ ...w, textAlign: "center", position: "relative" }}>
          <R><h2 style={{ fontSize: "clamp(26px,4vw,38px)", fontWeight: 800, color: "#fff", lineHeight: 1.15, letterSpacing: "-0.02em", marginBottom: 14 }}>Cada día sin Estamply es un día<br/>que seguís improvisando.</h2></R>
          <R delay={0.05}><p style={{ fontSize: 17, color: "#A3B8D6", marginBottom: 28 }}>Empieza gratis. Descubre cuánto puedes ganar cuando dejas de adivinar.</p></R>
          <R delay={0.1}><Link href="https://app.estamply.app/signup" className="cta" style={{ fontSize: 15, padding: "15px 36px" }}>Empezar gratis — 7 días sin compromiso {I.arr}</Link><p style={{ fontSize: 13, color: "#7B8FB3", marginTop: 14 }}>Sin tarjeta de crédito · Cancela cuando quieras</p></R>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: "48px 0 24px", borderTop: "1px solid #E5E7EB" }}>
        <div style={w}>
          <div className="fgrid" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 40, marginBottom: 28 }}>
            <div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.02em" }}>Estamply</span>
              </div>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>El sistema de gestión para negocios de estampado.</p>
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 12, letterSpacing: "0.03em" }}>Producto</h4>
              <a href="#funciones" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Funciones</a>
              <a href="#precios" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Precios</a>
              <a href="#faq" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>FAQ</a>
              <Link href="https://app.estamply.app/login" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Iniciar sesión</Link>
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 12, letterSpacing: "0.03em" }}>Legal</h4>
              <Link href="/legal/terminos" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Terminos y condiciones</Link>
              <Link href="/legal/privacidad" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Politica de privacidad</Link>
              <Link href="/legal/cookies" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Politica de cookies</Link>
            </div>
            <div>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#0F172A", marginBottom: 12, letterSpacing: "0.03em" }}>Contacto</h4>
              <a href="#" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>soporte@estamply.app</a>
              <a href="#" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>WhatsApp</a>
              <a href="#" style={{ display: "block", fontSize: 13, color: "#475569", textDecoration: "none", marginBottom: 8 }}>Instagram</a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <p style={{ fontSize: 12, color: "#64748B" }}>Estamply © {new Date().getFullYear()}. Hecho en Argentina para toda LATAM.</p>
            <div style={{ display: "flex", gap: 6 }}>{["ES","PT"].map(l=><span key={l} style={{ padding: "3px 9px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: l==="ES"?teal:"#F1F5F9", color: l==="ES"?"#fff":"#475569", cursor: "pointer" }}>{l}</span>)}</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// @ts-nocheck
'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface LandingContentProps {
  defaultLang?: 'es' | 'pt'
  showLanguageBanner?: boolean
}

function useInView(t = 0.12) {
  const ref = useRef(null)
  const [v, setV] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); o.unobserve(el) } }, { threshold: t })
    o.observe(el)
    return () => o.disconnect()
  }, [t])
  return [ref, v]
}

function R({ children, className = '', style = {}, delay = 0, y = 28 }) {
  const [ref, v] = useInView()
  return <div ref={ref} className={className} style={{ ...style, opacity: v ? 1 : 0, transform: v ? 'translateY(0)' : `translateY(${y}px)`, transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s` }}>{children}</div>
}

const I = {
  check: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4.5 9.5L7.5 12.5L13.5 5.5" stroke="#0D9488" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  x: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5.5 5.5L12.5 12.5M12.5 5.5L5.5 12.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  warn: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke="#F59E0B" strokeWidth="1.5"/><path d="M9 6V10M9 12V11.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  arr: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M4 9H14M14 9L10 5M14 9L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chev: <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3.5 5.25L7 8.75L10.5 5.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  dash: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M5 9H13" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

const pains = [
  'Calculas tus precios con la calculadora del celular y siempre te olvidas de algún costo',
  'Mandas presupuestos por WhatsApp como un mensaje de texto más',
  'No sabes cuánto ganas realmente con cada pedido',
  'Se te pierden pedidos o te olvidas de cobrar saldos',
  'Mostras tus productos con fotos sueltas por WhatsApp o Instagram',
  'Trabajas con varias técnicas y cada una tiene costos distintos que calculas por separado',
]

const compRows = [
  { f: 'Calcular costos reales', a: 'Solo lo obvio', aS: 'x', b: 'Si armas las fórmulas', bS: 'w', c: 'Automático con desglose' },
  { f: 'Presupuestos profesionales', a: 'Audio de WhatsApp', aS: 'x', b: 'Armar manual cada vez', bS: 'w', c: 'Con tu logo, un click' },
  { f: 'Gestión de pedidos', a: 'Memoria y notas', aS: 'x', b: 'Hojas separadas', bS: 'w', c: 'Kanban con alertas' },
  { f: 'Catálogo web propio', a: 'No existe', aS: 'x', b: 'No existe', bS: 'x', c: 'Incluido, listo en minutos' },
  { f: 'Rentabilidad real', a: 'Ni idea', aS: 'x', b: 'Si dedicas horas', bS: 'w', c: 'Dashboard automático' },
  { f: 'Todas las técnicas', a: 'Una cuenta cada vez', aS: 'x', b: 'Una hoja por técnica', bS: 'w', c: 'Todo en un solo sistema' },
]

const catalogBullets = [
  'Tu link profesional para la bio de Instagram y WhatsApp',
  'Productos con variantes de talle, color y precio',
  'Guía de talles con imagen y tabla',
  'Medios de pago visibles (efectivo, transferencia, tarjeta)',
  'Los pedidos entran directo como presupuestos en tu sistema',
  'Cero código. Cero hosting. Cero costo adicional.',
]

const techniques = ['Sublimación', 'DTF Textil', 'DTF UV', 'Vinilo', 'Serigrafía']

const profiles = [
  { tag: 'Recién empezás', copy: 'Compraste tu primera prensa. Tenés pocos pedidos y no estás seguro de cómo poner precios. Necesitas una forma simple de saber cuánto cobrar y verte profesional desde el día uno.', plan: 'Emprendedor' },
  { tag: 'Tu negocio está creciendo', copy: 'Ya tenés clientes fijos y hacés entre 20 y 50 pedidos por mes. Sabés que tenés que organizarte mejor pero no encontrás cómo. Necesitas presupuestos profesionales, control de pedidos y un catálogo.', plan: 'Pro' },
  { tag: 'Tenés un negocio establecido', copy: 'Tenés empleados, manejás múltiples técnicas y recibís pedidos corporativos. Necesitas control real: saber quién produce qué, qué técnica es más rentable y cómo va tu negocio mes a mes.', plan: 'Negocio' },
]

const plans = [
  { name: 'Emprendedor', price: 9, annual: 63, feat: ['Cotizador inteligente — todas las técnicas', 'Hasta 25 productos en catálogo web', '1 foto por producto', 'Presupuestos con tu logo', 'Gestión de pedidos (Kanban)', 'Base de clientes', 'Estadísticas del mes actual'] },
  { name: 'Pro', price: 17, annual: 119, pop: true, feat: ['Todo lo del Emprendedor, más:', 'Productos ilimitados en catálogo web', '3 fotos por producto', 'Estadísticas completas con historial', 'Rentabilidad por producto y técnica', 'Permisos por usuario'] },
  { name: 'Negocio', price: 29, annual: 203, feat: ['Todo lo del Pro, más:', '5 fotos por producto', 'Costos de mano de obra en cotización', 'Exportar datos', 'Sin badge "Powered by Estamply"'] },
]

const featureTable = [
  { section: 'Cotizador', rows: [
    { f: 'Cotizador inteligente', a: true, b: true, c: true },
    { f: 'Sublimación, DTF, Vinilo, Serigrafía', a: true, b: true, c: true },
    { f: 'Desglose de costos completo', a: true, b: true, c: true },
    { f: 'Margen y markup', a: true, b: true, c: true },
    { f: 'Descuento por volumen', a: true, b: true, c: true },
    { f: 'Ganancia por hora de trabajo', a: true, b: true, c: true },
    { f: 'Costos de mano de obra', a: false, b: false, c: true },
  ]},
  { section: 'Presupuestos', rows: [
    { f: 'Presupuestos con tu logo', a: true, b: true, c: true },
    { f: 'Compartir por WhatsApp y email', a: true, b: true, c: true },
    { f: 'Link público de presupuesto', a: true, b: true, c: true },
    { f: 'Confirmar presupuesto como pedido', a: true, b: true, c: true },
    { f: 'Condiciones de pago personalizables', a: true, b: true, c: true },
  ]},
  { section: 'Pedidos', rows: [
    { f: 'Tablero Kanban (4 estados)', a: true, b: true, c: true },
    { f: 'Alertas de pedidos vencidos', a: true, b: true, c: true },
    { f: 'Control de cobros pendientes', a: true, b: true, c: true },
    { f: 'Link al diseño en cada pedido', a: true, b: true, c: true },
  ]},
  { section: 'Catálogo Web', rows: [
    { f: 'Catálogo web público', a: true, b: true, c: true },
    { f: 'Productos en catálogo', a: '25', b: 'Ilimitados', c: 'Ilimitados' },
    { f: 'Fotos por producto', a: '1', b: '3', c: '5' },
    { f: 'Variantes de talle y color', a: true, b: true, c: true },
    { f: 'Guía de talles', a: true, b: true, c: true },
    { f: 'Medios de pago con recargo/descuento', a: true, b: true, c: true },
    { f: 'Botón de WhatsApp flotante', a: true, b: true, c: true },
    { f: 'Barra de anuncios', a: true, b: true, c: true },
    { f: 'Ocultar badge "Powered by Estamply"', a: false, b: false, c: true },
  ]},
  { section: 'Estadísticas', rows: [
    { f: 'Facturación del mes actual', a: true, b: true, c: true },
    { f: 'Estadísticas con historial completo', a: false, b: true, c: true },
    { f: 'Rentabilidad por producto', a: false, b: true, c: true },
    { f: 'Rentabilidad por técnica', a: false, b: true, c: true },
    { f: 'Ranking de clientes', a: false, b: true, c: true },
    { f: 'Evolución mes a mes', a: false, b: true, c: true },
    { f: 'Exportar a Excel', a: false, b: false, c: true },
  ]},
  { section: 'Clientes y Usuarios', rows: [
    { f: 'Base de clientes', a: true, b: true, c: true },
    { f: 'Historial de pedidos por cliente', a: true, b: true, c: true },
    { f: 'Importar y exportar clientes', a: false, b: false, c: true },
    { f: 'Usuarios', a: '1', b: '3', c: '10' },
    { f: 'Permisos por usuario', a: false, b: true, c: true },
  ]},
  { section: 'Soporte', rows: [
    { f: 'Soporte por email', a: true, b: true, c: true },
    { f: 'Soporte prioritario', a: false, b: true, c: true },
    { f: 'Soporte por WhatsApp', a: false, b: false, c: true },
  ]},
]

const faqs = [
  { q: '¿Cuánto dura la prueba gratis?', a: '7 días con acceso completo al plan Pro. Sin poner tarjeta. Si no te sirve, simplemente no haces nada y la cuenta se pausa.' },
  { q: '¿Funciona para mi técnica?', a: 'Sí. Sublimación, DTF textil, DTF UV, vinilo y serigrafía. Si estampás, Estamply te sirve — todo desde el mismo sistema.' },
  { q: '¿Necesito saber programar para el catálogo?', a: 'No. Subís tus productos, ponés precios, y tu tienda está online. Cero código, cero hosting, cero conocimiento técnico.' },
  { q: '¿Sirve en mi país?', a: 'Sí. Funciona en toda LATAM. Configurás tu país, tu moneda y tus medios de pago al registrarte.' },
  { q: 'Ya tengo un Excel, ¿por qué cambiaría?', a: 'El Excel no genera presupuestos con tu logo, no gestiona pedidos con alertas, no te da catálogo web, y no te dice cuánto ganas por hora. Estamply hace todo eso desde un solo lugar.' },
  { q: '¿Y si no me gusta?', a: 'Si en 7 días sentís que no te aporta valor, no pagás nada. Podés cancelar cuando quieras.' },
  { q: '¿Cómo se paga?', a: 'Tarjeta (Stripe), MercadoPago en Argentina, PIX/boleto en Brasil. Precios en USD; en Argentina se cobra en pesos al tipo de cambio del día.' },
  { q: '¿Puedo usarlo desde el celular?', a: 'Sí. 100% responsive. Cotizás, mandás presupuestos y gestionás pedidos desde cualquier dispositivo.' },
]

function Faq({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid #E2E8F0' }}>
      <button onClick={() => setOpen(!open)} style={{ width: '100%', textAlign: 'left', padding: '20px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, fontFamily: 'var(--f)' }}>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#1E293B', lineHeight: 1.4 }}>{q}</span>
        <span style={{ flexShrink: 0, color: '#94A3B8', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>{I.chev}</span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.35s cubic-bezier(0.22,1,0.36,1)' }}>
        <p style={{ padding: '0 0 20px', fontSize: 15, color: '#334155', lineHeight: 1.75 }}>{a}</p>
      </div>
    </div>
  )
}

function CI({ val }) {
  if (val === true) return I.check
  if (val === false) return I.dash
  return <span style={{ fontSize: 13, fontWeight: 600, color: '#1E293B' }}>{val}</span>
}

export default function LandingContent({ defaultLang = 'es', showLanguageBanner = false }: LandingContentProps) {
  const [annual, setAnnual] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showFt, setShowFt] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const w = { maxWidth: 1080, margin: '0 auto', padding: '0 24px' }
  const sp = 112

  const teal = '#0F766E'
  const tealLight = '#0D9488'
  const brandDark = '#001849'
  const brandDarkGrad = `linear-gradient(135deg, ${brandDark} 0%, #001030 100%)`

  const signupHref = '/signup'

  return (
    <div style={{ fontFamily: 'var(--f)', color: '#334155', background: '#fff' }}>
      <style>{`
        :root{--f:'Plus Jakarta Sans',system-ui,sans-serif}
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
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', borderBottom: scrolled ? '1px solid #F1F5F9' : '1px solid transparent', transition: 'all 0.3s' }}>
        <div style={{ ...w, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>Estamply</span>
          </div>
          <div className="navl" style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <a href="#funciones" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none' }}>Funciones</a>
            <a href="#precios" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none' }}>Precios</a>
            <a href="#faq" style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none' }}>FAQ</a>
            <Link href="/login" style={{ fontSize: 14, fontWeight: 500, color: '#334155', textDecoration: 'none' }}>Iniciar sesión</Link>
            <Link href={signupHref} className="cta" style={{ padding: '10px 20px', fontSize: 14 }}>Probá gratis</Link>
          </div>
          <Link href={signupHref} className="cta navm" style={{ padding: '8px 16px', fontSize: 13, display: 'none' }}>Probá gratis</Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 120, paddingBottom: sp, background: 'linear-gradient(180deg, #F8FAFC 0%, #fff 100%)' }}>
        <div style={w}>
          <R>
            <p className="lb" style={{ marginBottom: 16 }}>Software para talleres de estampado</p>
          </R>
          <R delay={0.05}>
            <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 800, lineHeight: 1.08, color: '#0F172A', letterSpacing: '-0.03em', maxWidth: 720 }}>
              Cotizá, presupuestá y gestioná tu taller desde un solo lugar
            </h1>
          </R>
          <R delay={0.1}>
            <p style={{ fontSize: 18, color: '#475569', lineHeight: 1.7, marginTop: 20, maxWidth: 560 }}>
              El primer sistema pensado específicamente para talleres de sublimación, DTF, vinilo y serigrafía en Latinoamérica.
            </p>
          </R>
          <R delay={0.15}>
            <div style={{ display: 'flex', gap: 12, marginTop: 32, flexWrap: 'wrap' }}>
              <Link href={signupHref} className="cta">Empezá tu prueba gratis {I.arr}</Link>
              <a href="#funciones" className="cta-g">Ver qué incluye</a>
            </div>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 12 }}>7 días gratis · Sin tarjeta de crédito · Cancelas cuando quieras</p>
          </R>
        </div>
      </section>

      {/* PAIN POINTS */}
      <section style={{ paddingTop: sp, paddingBottom: sp }}>
        <div style={w}>
          <R><p className="lb" style={{ marginBottom: 12 }}>¿Te suena familiar?</p></R>
          <R delay={0.05}><h2 className="h2" style={{ maxWidth: 600 }}>Si tu taller funciona así, estás perdiendo plata todos los días</h2></R>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 40 }} className="f2">
            {pains.map((p, i) => (
              <R key={i} delay={0.08 + i * 0.04}>
                <div className="card" style={{ padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ flexShrink: 0, marginTop: 2 }}>{I.x}</span>
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6 }}>{p}</p>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="funciones" style={{ paddingTop: sp, paddingBottom: sp, background: '#F8FAFC' }}>
        <div style={w}>
          <R><p className="lb" style={{ marginBottom: 12 }}>Todo lo que necesitás</p></R>
          <R delay={0.05}><h2 className="h2" style={{ maxWidth: 660 }}>Un sistema completo diseñado para cómo realmente trabaja un taller</h2></R>

          {/* Feature 1 — Cotizador */}
          <R delay={0.1}>
            <div style={{ marginTop: 56 }} className="hflex" >
              <div style={{ flex: 1, paddingRight: 40 }}>
                <p className="lb" style={{ marginBottom: 8 }}>Cotizador inteligente</p>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginBottom: 12 }}>Sabé exactamente cuánto cobrar por cada trabajo</h3>
                <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
                  Cargás tus insumos y equipamiento una vez. Después solo elegís técnica, producto y cantidad — Estamply calcula automáticamente el costo real, te sugiere precio de venta y te muestra cuánto ganás por hora de trabajo.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {techniques.map(t => (
                    <span key={t} style={{ fontSize: 12, fontWeight: 600, padding: '6px 12px', borderRadius: 6, background: '#F0FDFA', color: teal }}>{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </R>

          {/* Feature 2 — Presupuestos */}
          <R delay={0.1}>
            <div style={{ marginTop: 64 }}>
              <p className="lb" style={{ marginBottom: 8 }}>Presupuestos profesionales</p>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginBottom: 12 }}>Dejá de mandar audios. Mandá presupuestos con tu logo.</h3>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, maxWidth: 600 }}>
                Un click y tu presupuesto está listo: con tu marca, desglose de items, condiciones de pago y link para que tu cliente lo acepte desde el celular. Cuando acepta, se convierte automáticamente en pedido.
              </p>
            </div>
          </R>

          {/* Feature 3 — Pedidos */}
          <R delay={0.1}>
            <div style={{ marginTop: 64 }}>
              <p className="lb" style={{ marginBottom: 8 }}>Gestión de pedidos</p>
              <h3 style={{ fontSize: 24, fontWeight: 700, color: '#0F172A', lineHeight: 1.2, marginBottom: 12 }}>Nunca más "me olvidé de ese pedido"</h3>
              <p style={{ fontSize: 15, color: '#475569', lineHeight: 1.7, maxWidth: 600 }}>
                Tablero Kanban con 4 estados: Pendiente → En producción → Listo → Entregado. Alertas de pedidos vencidos, control de cobros pendientes y acceso rápido al diseño de cada trabajo.
              </p>
            </div>
          </R>
        </div>
      </section>

      {/* CATALOG */}
      <section style={{ paddingTop: sp, paddingBottom: sp }}>
        <div style={w}>
          <R><p className="lb" style={{ marginBottom: 12 }}>Catálogo web incluido</p></R>
          <R delay={0.05}><h2 className="h2" style={{ maxWidth: 600 }}>Tu tienda online profesional. Lista en minutos, gratis.</h2></R>
          <R delay={0.1}>
            <p className="sub" style={{ marginTop: 16 }}>
              No necesitás Tienda Nube, ni MercadoShops, ni saber de programación. Tu catálogo está incluido en Estamply y se actualiza automáticamente con tus productos.
            </p>
          </R>
          <R delay={0.15}>
            <div style={{ marginTop: 32, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="f2">
              {catalogBullets.map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '10px 0' }}>
                  <span style={{ flexShrink: 0, marginTop: 1 }}>{I.check}</span>
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.6 }}>{b}</p>
                </div>
              ))}
            </div>
          </R>
        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section style={{ paddingTop: sp, paddingBottom: sp, background: '#F8FAFC' }}>
        <div style={w}>
          <R><p className="lb" style={{ marginBottom: 12 }}>Comparación honesta</p></R>
          <R delay={0.05}><h2 className="h2">¿Con qué te organizás hoy?</h2></R>

          {/* Desktop table */}
          <R delay={0.1}>
            <div className="cmpd" style={{ marginTop: 40, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, color: '#64748B', width: '28%' }}></th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#94A3B8' }}>WhatsApp + Memoria</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#94A3B8' }}>Excel / Google Sheets</th>
                    <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: teal }}>Estamply</th>
                  </tr>
                </thead>
                <tbody>
                  {compRows.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1E293B' }}>{r.f}</td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {r.aS === 'x' ? I.x : I.warn}
                          <span style={{ fontSize: 13, color: '#94A3B8' }}>{r.a}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {r.bS === 'x' ? I.x : I.warn}
                          <span style={{ fontSize: 13, color: '#94A3B8' }}>{r.b}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                          {I.check}
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#0F172A' }}>{r.c}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </R>

          {/* Mobile comparison */}
          <div className="cmpm" style={{ marginTop: 32 }}>
            {compRows.map((r, i) => (
              <R key={i} delay={0.05 * i}>
                <div className="card" style={{ padding: 16, marginBottom: 8 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>{r.f}</p>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    {r.aS === 'x' ? I.x : I.warn}
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>WhatsApp: {r.a}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    {r.bS === 'x' ? I.x : I.warn}
                    <span style={{ fontSize: 13, color: '#94A3B8' }}>Excel: {r.b}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {I.check}
                    <span style={{ fontSize: 13, fontWeight: 500, color: teal }}>{r.c}</span>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* PROFILES */}
      <section style={{ paddingTop: sp, paddingBottom: sp }}>
        <div style={w}>
          <R><p className="lb" style={{ marginBottom: 12 }}>¿Para quién es Estamply?</p></R>
          <R delay={0.05}><h2 className="h2">Encontrá tu perfil</h2></R>
          <div style={{ display: 'flex', gap: 20, marginTop: 40 }} className="pflex">
            {profiles.map((p, i) => (
              <R key={i} delay={0.08 + i * 0.06} style={{ flex: 1 }}>
                <div className="card" style={{ padding: 28, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: tealLight, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{p.tag}</span>
                  <p style={{ fontSize: 15, color: '#334155', lineHeight: 1.7, marginTop: 12, flex: 1 }}>{p.copy}</p>
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Plan {p.plan}</span>
                    <Link href={signupHref} style={{ fontSize: 13, fontWeight: 600, color: teal, textDecoration: 'none' }}>Empezar →</Link>
                  </div>
                </div>
              </R>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="precios" style={{ paddingTop: sp, paddingBottom: sp, background: '#F8FAFC' }}>
        <div style={w}>
          <R><p className="lb" style={{ textAlign: 'center', marginBottom: 12 }}>Precios simples</p></R>
          <R delay={0.05}><h2 className="h2" style={{ textAlign: 'center' }}>Elegí tu plan</h2></R>
          <R delay={0.08}>
            <p className="sub" style={{ textAlign: 'center', margin: '12px auto 0' }}>7 días gratis en cualquier plan. Sin tarjeta. Cancelas cuando quieras.</p>
          </R>

          {/* Toggle */}
          <R delay={0.1}>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
              <div style={{ display: 'flex', background: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', padding: 3 }}>
                <button onClick={() => setAnnual(false)} style={{ padding: '8px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', background: !annual ? teal : 'transparent', color: !annual ? '#fff' : '#64748B', transition: 'all 0.2s' }}>Mensual</button>
                <button onClick={() => setAnnual(true)} style={{ padding: '8px 20px', borderRadius: 6, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', background: annual ? teal : 'transparent', color: annual ? '#fff' : '#64748B', transition: 'all 0.2s' }}>Anual <span style={{ fontSize: 11, fontWeight: 700, background: annual ? 'rgba(255,255,255,0.2)' : '#F0FDFA', color: annual ? '#fff' : teal, padding: '2px 6px', borderRadius: 4, marginLeft: 4 }}>-42%</span></button>
              </div>
            </div>
          </R>

          {/* Plan cards */}
          <div style={{ display: 'flex', gap: 20, marginTop: 40, alignItems: 'stretch' }} className="pflex">
            {plans.map((p, i) => (
              <R key={i} delay={0.1 + i * 0.06} style={{ flex: 1 }}>
                <div style={{ background: '#fff', border: p.pop ? `2px solid ${teal}` : '1px solid #E5E7EB', borderRadius: 16, padding: 28, height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                  {p.pop && <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: teal, color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: '0.03em' }}>MÁS POPULAR</span>}
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A' }}>{p.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginTop: 8 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: '#0F172A' }}>${annual ? Math.round(p.annual / 12) : p.price}</span>
                    <span style={{ fontSize: 14, color: '#94A3B8' }}>USD/mes</span>
                  </div>
                  {annual && <p style={{ fontSize: 12, color: tealLight, fontWeight: 600, marginTop: 4 }}>Pagás ${p.annual}/año (ahorrás ${p.price * 12 - p.annual})</p>}
                  <ul style={{ listStyle: 'none', marginTop: 24, flex: 1 }}>
                    {p.feat.map((f, fi) => (
                      <li key={fi} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', fontSize: 14, color: '#334155', lineHeight: 1.5 }}>
                        <span style={{ flexShrink: 0, marginTop: 1 }}>{fi === 0 && i > 0 ? null : I.check}</span>
                        <span style={{ fontWeight: fi === 0 && i > 0 ? 600 : 400 }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href={signupHref} className="cta" style={{ marginTop: 24, justifyContent: 'center', width: '100%', background: p.pop ? teal : '#0F172A' }}>Empezar gratis</Link>
                </div>
              </R>
            ))}
          </div>

          {/* Feature comparison toggle */}
          <R delay={0.15}>
            <div style={{ textAlign: 'center', marginTop: 40 }}>
              <button onClick={() => setShowFt(!showFt)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--f)', fontSize: 14, fontWeight: 600, color: teal, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {showFt ? 'Ocultar comparación completa' : 'Ver comparación completa de funciones'}
                <span style={{ transform: showFt ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s' }}>{I.chev}</span>
              </button>
            </div>
          </R>

          {/* Feature table */}
          {showFt && (
            <>
              {/* Desktop */}
              <div className="ftd" style={{ marginTop: 32, overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ textAlign: 'left', padding: '12px 16px', width: '40%' }}></th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#64748B' }}>Emprendedor</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 700, color: teal }}>Pro</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: 600, color: '#64748B' }}>Negocio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {featureTable.map((sec, si) => (
                      <React.Fragment key={si}>
                        <tr><td colSpan={4} style={{ padding: '16px 16px 8px', fontWeight: 700, fontSize: 13, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{sec.section}</td></tr>
                        {sec.rows.map((r, ri) => (
                          <tr key={ri} style={{ borderBottom: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '10px 16px', color: '#1E293B' }}>{r.f}</td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}><CI val={r.a} /></td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}><CI val={r.b} /></td>
                            <td style={{ padding: '10px 16px', textAlign: 'center' }}><CI val={r.c} /></td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="ftm" style={{ marginTop: 24 }}>
                {featureTable.map((sec, si) => (
                  <div key={si} style={{ marginBottom: 24 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{sec.section}</p>
                    {sec.rows.map((r, ri) => (
                      <div key={ri} className="card" style={{ padding: 14, marginBottom: 6 }}>
                        <p style={{ fontSize: 14, fontWeight: 500, color: '#1E293B', marginBottom: 8 }}>{r.f}</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }} className="fgrid">
                          <div style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Emprend.</p><CI val={r.a} /></div>
                          <div style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: tealLight, fontWeight: 600, marginBottom: 4 }}>Pro</p><CI val={r.b} /></div>
                          <div style={{ textAlign: 'center' }}><p style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Negocio</p><CI val={r.c} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ paddingTop: sp, paddingBottom: sp }}>
        <div style={{ ...w, maxWidth: 720 }}>
          <R><p className="lb" style={{ marginBottom: 12 }}>Preguntas frecuentes</p></R>
          <R delay={0.05}><h2 className="h2">¿Tenés dudas?</h2></R>
          <div style={{ marginTop: 32 }}>
            {faqs.map((f, i) => <Faq key={i} q={f.q} a={f.a} />)}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ paddingTop: sp, paddingBottom: sp, background: brandDarkGrad }}>
        <div style={{ ...w, textAlign: 'center' }}>
          <R><h2 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#fff', lineHeight: 1.12, letterSpacing: '-0.02em' }}>Empezá a cotizar bien. Hoy.</h2></R>
          <R delay={0.05}><p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginTop: 16, maxWidth: 480, margin: '16px auto 0' }}>7 días gratis con acceso completo. Sin tarjeta. Sin compromiso.</p></R>
          <R delay={0.1}>
            <Link href={signupHref} className="cta" style={{ marginTop: 32, background: '#fff', color: brandDark, padding: '16px 36px', fontSize: 16, fontWeight: 700 }}>Crear mi cuenta gratis {I.arr}</Link>
          </R>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ padding: '40px 0', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ ...w, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>Estamply</span>
          <p style={{ fontSize: 13, color: '#94A3B8' }}>© {new Date().getFullYear()} Estamply. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  )
}

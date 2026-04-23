'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Calculator, FileText, LayoutGrid, ShoppingCart, BarChart3, Users, ChevronDown, ChevronRight, Check, Menu, X } from 'lucide-react'

// ── Types ──
interface LandingContentProps {
  defaultLang: 'es' | 'pt'
  showLanguageBanner?: boolean
}

// ── Scroll animation hook ──
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function Section({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useInView()
  return (
    <div ref={ref} className={`transition-all duration-700 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  )
}

// ── App URL for CTA links ──
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || ''

// ── i18n ──
const TEXTS = {
  es: {
    nav: { features: 'Funciones', pricing: 'Precios', login: 'Iniciar sesión', cta: 'Empezar gratis →' },
    hero: {
      h1: 'El sistema que tu taller de estampado necesita',
      sub: 'Cotiza en segundos, envía presupuestos profesionales, gestiona pedidos y recibe compras desde tu catálogo web. Todo en un solo lugar.',
      cta: 'Empezar gratis — 14 días',
      noCc: 'Sin tarjeta de crédito · Cancela cuando quieras',
      social: 'Usado por talleres en Argentina, Brasil, México y más',
      badges: ['Sublimación', 'DTF', 'Vinilo', 'Serigrafía', 'UV'],
    },
    pain: {
      title: '¿Te suena familiar?',
      items: [
        { icon: '📱', text: 'Cotizas con la calculadora del celular y siempre te olvidas de algún costo' },
        { icon: '📋', text: 'Mandas presupuestos por WhatsApp como un mensaje de texto más' },
        { icon: '🤯', text: 'No sabes si estás ganando o perdiendo plata en cada pedido' },
        { icon: '📦', text: 'Se te pierden pedidos porque no tienes un sistema para seguirlos' },
        { icon: '💸', text: 'Entregas trabajos y te olvidas de cobrar el saldo' },
        { icon: '🛒', text: 'No tienes un catálogo online para mostrar lo que haces' },
      ],
      close: 'Si te identificas con al menos 2 de estos puntos, Estamply es para vos.',
    },
    solution: {
      title: 'Todo lo que necesitas para gestionar tu taller',
      sub: 'El primer software diseñado específicamente para talleres de estampado en Latinoamérica.',
      features: [
        { title: 'Cotizador inteligente', desc: 'Cotiza cualquier producto en menos de 30 segundos. Estamply calcula automáticamente materiales, tintas, papel, amortización de equipos y hasta el desperdicio. Eliges tu margen y listo.', img: '/screenshots/cotizador.png' },
        { title: 'Presupuestos profesionales', desc: 'Genera presupuestos profesionales con tu logo y datos del negocio. Compártelos por WhatsApp o con un link. Tu cliente recibe un documento que genera confianza.', img: '/screenshots/presupuestos.png' },
        { title: 'Gestión de pedidos', desc: 'Sigue cada pedido desde que entra hasta que se entrega. Un tablero Kanban muestra qué está pendiente, en producción y listo. Nunca más pierdas un pedido.', img: '/screenshots/kanban.png' },
        { title: 'Tu catálogo web propio', desc: 'Tu propia tienda online en minutos. Tus clientes ven tus productos, eligen talle y color, y hacen pedidos directo por WhatsApp. Sin comisiones.', img: '/screenshots/catalogo-interno.png' },
        { title: 'Sabe cuánto ganas (de verdad)', desc: 'Ve tu rentabilidad real: margen por producto, por cliente, por técnica. Sabes exactamente qué conviene producir más y qué no vale la pena.', img: '/screenshots/estadisticas.png' },
        { title: 'Tu equipo, bajo control', desc: 'Agrega empleados con permisos específicos. Tu vendedor cotiza sin ver tus costos. Tu operario ve qué producir sin ver precios. Tienes visibilidad total.', img: '/screenshots/permisos.png' },
      ],
    },
    catalog: {
      title: 'Tu catálogo web en 5 minutos.',
      titleAccent: 'Pedidos por WhatsApp las 24hs.',
      desc: 'Comparte el link en tus redes sociales o mándalo por WhatsApp. Tus clientes ven tus productos, eligen talle, color y cantidad, y te hacen un pedido organizado.',
      bullets: ['Funciona en celular y computadora', 'Tus clientes compran a cualquier hora', 'Cada pedido queda registrado en tu sistema', 'Con tu marca, tus colores y tu logo', 'Medios de pago configurables'],
      cta: 'Ver catálogo de ejemplo →',
    },
    audience: {
      title: 'Estamply es para vos si...',
      segments: [
        { emoji: '🏠', title: 'Recién empezas', desc: 'Tienes una prensa, una impresora y muchas ganas. Necesitas saber cuánto cobrar y tener un catálogo para mostrar lo que haces. Estamply te profesionaliza desde el día uno.', color: '#2DD4BF' },
        { emoji: '📈', title: 'Tu taller está creciendo', desc: 'Ya tienes clientes fijos, haces varios pedidos por semana, y no das abasto con WhatsApp y Excel. Necesitas orden, control y saber si ganas plata.', color: '#6C63FF', badge: 'Más común' },
        { emoji: '🏭', title: 'Vivís de tu taller', desc: 'Tienes empleados, múltiples técnicas, clientes corporativos. Necesitas delegar sin perder el control y saber tu rentabilidad real.', color: '#3B82F6' },
      ],
    },
    techniques: {
      title: 'Funciona con tu técnica',
      desc: 'Cada técnica tiene su propio cotizador con costos específicos. Configura tu taller una vez y cotiza cualquier producto al instante.',
      items: ['Sublimación', 'DTF Textil', 'DTF UV', 'Vinilo', 'Serigrafía'],
    },
    pricing: {
      title: 'Precios simples. Sin sorpresas.',
      sub: 'Elige el plan que se ajuste a la etapa de tu taller. Puedes cambiar en cualquier momento.',
      monthly: 'Mensual',
      annual: 'Anual',
      annualSave: 'Ahorrá 3 meses',
      allInclude: 'Todos los planes incluyen 14 días gratis del plan Pro. Sin tarjeta de crédito.',
      cta: 'Empezar gratis 14 días',
      plans: [
        {
          name: 'Emprendedor', price: 9, annualPrice: 6.75, popular: false,
          features: ['Cotizador con todas las técnicas', 'Presupuestos profesionales', 'Gestión de pedidos (Kanban)', 'Catálogo web (25 productos, 1 foto)', 'Clientes ilimitados', 'Importar clientes', 'Estadísticas del mes actual', '1 usuario', 'Soporte por email'],
        },
        {
          name: 'Pro', price: 17, annualPrice: 12.75, popular: true,
          features: ['Todo lo de Emprendedor, más:', 'Catálogo web ilimitado (3 fotos)', 'Estadísticas completas con períodos', 'Rentabilidad por producto y cliente', 'Hasta 3 usuarios con permisos', 'Notificaciones de pedidos web', 'Soporte email + WhatsApp'],
        },
        {
          name: 'Negocio', price: 29, annualPrice: 21.75, popular: false,
          features: ['Todo lo de Pro, más:', 'Catálogo web ilimitado (5 fotos)', 'Hasta 10 usuarios', 'Gastos de mano de obra en costos', 'Estadísticas + exportar (Excel/PDF)', 'Ocultar "Powered by Estamply"', 'Soporte prioritario'],
        },
      ],
      faq: [
        { q: '¿Puedo cambiar de plan después?', a: 'Sí, puedes subir o bajar en cualquier momento.' },
        { q: '¿Qué pasa cuando terminan los 14 días?', a: 'Eliges un plan y método de pago. Si no eliges, tu cuenta baja al plan Emprendedor con sus límites.' },
        { q: '¿Puedo pagar en pesos argentinos o reales?', a: 'En Argentina aceptamos MercadoPago en pesos. En Brasil, Hotmart en reales. El resto del mundo con tarjeta en USD.' },
        { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin permanencia ni penalidad.' },
      ],
    },
    social: {
      quote: 'Lo construí porque tenía los mismos problemas que vos. Cotizaba con la calculadora, mandaba presupuestos por WhatsApp, y no sabía si estaba ganando o perdiendo plata. Ahora gestiono todo desde un solo lugar.',
      author: 'Pablo Loson',
      role: 'Fundador de Estamply y dueño de Sublishop',
      location: 'Córdoba, Argentina',
    },
    finalCta: {
      title: 'Tu taller merece un sistema profesional',
      sub: 'Empezá hoy. En 5 minutos tienes tu catálogo web andando y tu primer presupuesto listo.',
      cta: 'Empezar gratis — 14 días',
      below: 'Únite a los talleres que dejaron de gestionar con WhatsApp y una calculadora.',
    },
    footer: {
      plans: 'Planes', support: 'Soporte', contact: 'Contacto',
      terms: 'Términos', privacy: 'Privacidad',
      copy: '© 2026 Estamply. Hecho en Córdoba, Argentina para todo el mundo.',
    },
  },
  pt: {
    nav: { features: 'Funções', pricing: 'Preços', login: 'Entrar', cta: 'Teste grátis →' },
    hero: {
      h1: 'O sistema que sua oficina de estamparia precisa',
      sub: 'Faça orçamentos em segundos, envie propostas profissionais, gerencie pedidos e receba compras do seu catálogo web. Tudo em um só lugar.',
      cta: 'Começar grátis — 14 dias',
      noCc: 'Sem cartão de crédito · Cancele quando quiser',
      social: 'Usado por oficinas na Argentina, Brasil, México e mais',
      badges: ['Sublimação', 'DTF', 'Vinil', 'Serigrafia', 'UV'],
    },
    pain: {
      title: 'Isso parece familiar?',
      items: [
        { icon: '📱', text: 'Faz orçamentos na calculadora do celular e sempre esquece algum custo' },
        { icon: '📋', text: 'Envia orçamentos pelo WhatsApp como uma mensagem qualquer' },
        { icon: '🤯', text: 'Não sabe se está ganhando ou perdendo dinheiro em cada pedido' },
        { icon: '📦', text: 'Perde pedidos porque não tem um sistema para acompanhá-los' },
        { icon: '💸', text: 'Entrega trabalhos e esquece de cobrar o saldo' },
        { icon: '🛒', text: 'Não tem um catálogo online para mostrar o que faz' },
      ],
      close: 'Se você se identificou com pelo menos 2 desses pontos, o Estamply é para você.',
    },
    solution: {
      title: 'Tudo o que você precisa para gerenciar sua oficina',
      sub: 'O primeiro software projetado especificamente para oficinas de estamparia na América Latina.',
      features: [
        { title: 'Calculadora inteligente', desc: 'Faça orçamentos de qualquer produto em menos de 30 segundos. O Estamply calcula automaticamente materiais, tintas, papel, amortização de equipamentos e até o desperdício.', img: '/screenshots/cotizador.png' },
        { title: 'Orçamentos profissionais', desc: 'Gere orçamentos profissionais com seu logo e dados. Compartilhe pelo WhatsApp ou com um link. Seu cliente recebe um documento que gera confiança.', img: '/screenshots/presupuestos.png' },
        { title: 'Gestão de pedidos', desc: 'Acompanhe cada pedido desde a entrada até a entrega. Um quadro Kanban mostra o que está pendente, em produção e pronto.', img: '/screenshots/kanban.png' },
        { title: 'Seu catálogo web próprio', desc: 'Tenha sua própria loja online em minutos. Seus clientes veem seus produtos, escolhem tamanho e cor, e fazem pedidos pelo WhatsApp. Sem comissões.', img: '/screenshots/catalogo-interno.png' },
        { title: 'Saiba quanto você ganha', desc: 'Veja sua rentabilidade real: margem por produto, por cliente, por técnica. Saiba exatamente o que vale a pena produzir.', img: '/screenshots/estadisticas.png' },
        { title: 'Sua equipe sob controle', desc: 'Adicione funcionários com permissões específicas. Seu vendedor faz orçamentos sem ver seus custos. Você tem visibilidade total.', img: '/screenshots/permisos.png' },
      ],
    },
    catalog: {
      title: 'Seu catálogo web em 5 minutos.',
      titleAccent: 'Pedidos por WhatsApp 24h.',
      desc: 'Compartilhe o link nas redes sociais ou mande pelo WhatsApp. Seus clientes veem seus produtos, escolhem tamanho, cor e quantidade, e fazem um pedido organizado.',
      bullets: ['Funciona no celular e computador', 'Seus clientes compram a qualquer hora', 'Cada pedido fica registrado no seu sistema', 'Com sua marca, suas cores e seu logo', 'Meios de pagamento configuráveis'],
      cta: 'Ver catálogo de exemplo →',
    },
    audience: {
      title: 'O Estamply é para você se...',
      segments: [
        { emoji: '🏠', title: 'Está começando', desc: 'Tem uma prensa, uma impressora e muita vontade. Precisa saber quanto cobrar e ter um catálogo para mostrar o que faz.', color: '#2DD4BF' },
        { emoji: '📈', title: 'Sua oficina está crescendo', desc: 'Já tem clientes fixos, faz vários pedidos por semana, e não consegue mais com WhatsApp e Excel.', color: '#6C63FF', badge: 'Mais comum' },
        { emoji: '🏭', title: 'Vive da sua oficina', desc: 'Tem funcionários, múltiplas técnicas, clientes corporativos. Precisa delegar sem perder o controle.', color: '#3B82F6' },
      ],
    },
    techniques: {
      title: 'Funciona com sua técnica',
      desc: 'Cada técnica tem sua própria calculadora com custos específicos. Configure sua oficina uma vez e faça orçamentos instantaneamente.',
      items: ['Sublimação', 'DTF Têxtil', 'DTF UV', 'Vinil', 'Serigrafia'],
    },
    pricing: {
      title: 'Preços simples. Sem surpresas.',
      sub: 'Escolha o plano que se ajusta à fase da sua oficina. Pode mudar a qualquer momento.',
      monthly: 'Mensal',
      annual: 'Anual',
      annualSave: 'Economize 3 meses',
      allInclude: 'Todos os planos incluem 14 dias grátis do plano Pro. Sem cartão de crédito.',
      cta: 'Começar grátis 14 dias',
      plans: [
        {
          name: 'Empreendedor', price: 9, annualPrice: 6.75, popular: false,
          features: ['Calculadora com todas as técnicas', 'Orçamentos profissionais', 'Gestão de pedidos (Kanban)', 'Catálogo web (25 produtos, 1 foto)', 'Clientes ilimitados', 'Importar clientes', 'Estatísticas do mês', '1 usuário', 'Suporte por email'],
        },
        {
          name: 'Pro', price: 17, annualPrice: 12.75, popular: true,
          features: ['Tudo do Empreendedor, mais:', 'Catálogo web ilimitado (3 fotos)', 'Estatísticas completas com períodos', 'Rentabilidade por produto e cliente', 'Até 3 usuários com permissões', 'Notificações de pedidos web', 'Suporte email + WhatsApp'],
        },
        {
          name: 'Negócio', price: 29, annualPrice: 21.75, popular: false,
          features: ['Tudo do Pro, mais:', 'Catálogo web ilimitado (5 fotos)', 'Até 10 usuários', 'Gastos de mão de obra nos custos', 'Estatísticas + exportar (Excel/PDF)', 'Ocultar "Powered by Estamply"', 'Suporte prioritário'],
        },
      ],
      faq: [
        { q: 'Posso mudar de plano depois?', a: 'Sim, pode subir ou descer a qualquer momento.' },
        { q: 'O que acontece quando os 14 dias acabam?', a: 'Escolha um plano e método de pagamento. Se não escolher, sua conta volta ao plano Empreendedor.' },
        { q: 'Posso pagar em reais?', a: 'No Brasil aceitamos Hotmart em reais. No restante do mundo com cartão em USD.' },
        { q: 'Posso cancelar quando quiser?', a: 'Sim, sem permanência nem penalidade.' },
      ],
    },
    social: {
      quote: 'Construí porque tinha os mesmos problemas que você. Fazia orçamentos na calculadora, mandava pelo WhatsApp, e não sabia se estava ganhando ou perdendo dinheiro. Agora gerencio tudo de um só lugar.',
      author: 'Pablo Loson',
      role: 'Fundador do Estamply e dono da Sublishop',
      location: 'Córdoba, Argentina',
    },
    finalCta: {
      title: 'Sua oficina merece um sistema profissional',
      sub: 'Comece hoje. Em 5 minutos seu catálogo web está funcionando e seu primeiro orçamento pronto.',
      cta: 'Começar grátis — 14 dias',
      below: 'Junte-se às oficinas que pararam de gerenciar com WhatsApp e calculadora.',
    },
    footer: {
      plans: 'Planos', support: 'Suporte', contact: 'Contato',
      terms: 'Termos', privacy: 'Privacidade',
      copy: '© 2026 Estamply. Feito em Córdoba, Argentina para o mundo todo.',
    },
  },
}

const FEATURE_ICONS = [Calculator, FileText, LayoutGrid, ShoppingCart, BarChart3, Users]
const TECHNIQUE_ICONS = ['🔥', '🖨️', '✨', '✂️', '🎨']

export default function LandingContent({ defaultLang, showLanguageBanner = false }: LandingContentProps) {
  const [lang, setLang] = useState<'es' | 'pt'>(defaultLang)
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Sync lang when defaultLang changes (route navigation)
  useEffect(() => {
    setLang(defaultLang)
  }, [defaultLang])

  const t = TEXTS[lang]

  // Language route hrefs
  const esHref = '/'
  const ptHref = '/br'

  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* ── LANGUAGE BANNER ── */}
      {showLanguageBanner && lang === 'es' && (
        <div className="bg-green-50 border-b border-green-100 py-2 text-center text-sm">
          <span className="text-green-700">Prefere ver em português?</span>
          <Link href={ptHref} className="ml-2 font-bold text-green-700 hover:text-green-900 underline">Mudar idioma</Link>
        </div>
      )}

      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 border-b border-gray-100/50" style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo-icon.png" alt="Estamply" width={32} height={32} className="rounded-lg" />
            <span className="font-extrabold text-lg text-gray-900 tracking-tight">Estamply</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition font-medium">{t.nav.features}</a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition font-medium">{t.nav.pricing}</a>
            <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
              <Link href={esHref} className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${lang === 'es' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>ES</Link>
              <Link href={ptHref} className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${lang === 'pt' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>PT</Link>
            </div>
            <Link href={`${APP_URL}/login`} className="text-sm text-gray-500 hover:text-gray-900 transition font-medium">{t.nav.login}</Link>
            <Link href={`${APP_URL}/signup`} className="px-5 py-2.5 rounded-full text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:scale-[1.02]" style={{ background: '#6C63FF' }}>{t.nav.cta}</Link>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm font-medium text-gray-600" onClick={() => setMenuOpen(false)}>{t.nav.features}</a>
            <a href="#pricing" className="block text-sm font-medium text-gray-600" onClick={() => setMenuOpen(false)}>{t.nav.pricing}</a>
            <div className="flex gap-2">
              <Link href={esHref} onClick={() => setMenuOpen(false)} className={`px-3 py-1 rounded-full text-xs font-bold ${lang === 'es' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>ES</Link>
              <Link href={ptHref} onClick={() => setMenuOpen(false)} className={`px-3 py-1 rounded-full text-xs font-bold ${lang === 'pt' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>PT</Link>
            </div>
            <Link href={`${APP_URL}/login`} className="block text-sm font-medium text-gray-600">{t.nav.login}</Link>
            <Link href={`${APP_URL}/signup`} className="block w-full text-center px-4 py-2.5 rounded-full text-sm font-bold text-white" style={{ background: '#6C63FF' }}>{t.nav.cta}</Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(15,118,110,0.08), transparent), radial-gradient(ellipse 60% 40% at 80% 50%, rgba(45,212,191,0.06), transparent)' }} />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-12 lg:pt-20 lg:pb-16">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
            <div className="flex-1 text-center lg:text-left">
              <Section>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold leading-[1.1] tracking-tight text-gray-900">
                  {t.hero.h1}
                </h1>
              </Section>
              <Section delay={100}>
                <p className="mt-5 text-lg text-gray-500 leading-relaxed max-w-lg mx-auto lg:mx-0">
                  {t.hero.sub}
                </p>
              </Section>
              <Section delay={200}>
                <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-3">
                  <Link href={`${APP_URL}/signup`} className="px-8 py-4 rounded-full text-base font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.03]" style={{ background: '#6C63FF' }}>
                    {t.hero.cta}
                  </Link>
                </div>
                <p className="mt-3 text-sm text-gray-400">{t.hero.noCc}</p>
                <div className="mt-4 flex items-center gap-1.5 justify-center lg:justify-start">
                  <div className="flex">{'★★★★★'.split('').map((s, i) => <span key={i} className="text-amber-400 text-sm">{s}</span>)}</div>
                  <span className="text-xs text-gray-400 font-medium">{t.hero.social}</span>
                </div>
              </Section>
            </div>
            <Section delay={300} className="flex-1 w-full">
              <div className="relative" style={{ perspective: '1200px' }}>
                <div className="rounded-xl overflow-hidden border border-gray-200 shadow-2xl" style={{ transform: 'rotateY(-3deg) rotateX(2deg)' }}>
                  <Image src="/screenshots/dashboard.png" alt="Dashboard Estamply" width={700} height={440} className="w-full h-auto" priority />
                </div>
              </div>
            </Section>
          </div>
          <Section delay={400}>
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {t.hero.badges.map(b => (
                <span key={b} className="px-4 py-1.5 rounded-full text-xs font-bold border border-gray-200 text-gray-500 bg-white">{b}</span>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── PAIN POINTS ── */}
      <section className="py-16 lg:py-20" style={{ background: '#F8FAFC' }}>
        <div className="max-w-4xl mx-auto px-4">
          <Section><h2 className="text-3xl lg:text-4xl font-extrabold text-center tracking-tight">{t.pain.title}</h2></Section>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-10">
            {t.pain.items.map((item, i) => (
              <Section key={i} delay={i * 80}>
                <div className="group flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100 hover:border-l-4 hover:border-l-teal-400 hover:shadow-md transition-all cursor-default">
                  <span className="text-3xl flex-shrink-0 w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-teal-50 transition">{item.icon}</span>
                  <p className="text-gray-600 text-sm leading-relaxed pt-2">{item.text}</p>
                </div>
              </Section>
            ))}
          </div>
          <Section delay={500}>
            <p className="mt-10 text-center text-lg font-bold text-gray-700">
              <span className="px-1 py-0.5 rounded" style={{ background: 'rgba(250,204,21,0.25)' }}>{t.pain.close}</span>
            </p>
          </Section>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <Section>
            <div className="text-center mb-14">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{t.solution.title}</h2>
              <p className="mt-3 text-gray-500 text-lg max-w-2xl mx-auto">{t.solution.sub}</p>
            </div>
          </Section>
          <div className="space-y-16">
            {t.solution.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i]
              const isEven = i % 2 === 0
              return (
                <Section key={i} delay={100}>
                  <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8 lg:gap-12`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(15,118,110,0.1)' }}>
                          <Icon size={20} style={{ color: '#6C63FF' }} />
                        </div>
                        <h3 className="text-xl font-bold tracking-tight">{f.title}</h3>
                      </div>
                      <p className="text-gray-500 leading-relaxed">{f.desc}</p>
                    </div>
                    <div className="flex-1 w-full">
                      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-lg hover:shadow-xl transition-shadow">
                        <Image src={f.img} alt={f.title} width={580} height={360} className="w-full h-auto" loading="lazy" />
                      </div>
                    </div>
                  </div>
                </Section>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CATALOG HIGHLIGHT ── */}
      <section className="py-16 lg:py-20" style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.04), rgba(45,212,191,0.06))' }}>
        <div className="max-w-5xl mx-auto px-4">
          <Section>
            <div className="flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1">
                <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
                  {t.catalog.title}<br />
                  <span style={{ color: '#6C63FF' }}>{t.catalog.titleAccent}</span>
                </h2>
                <p className="mt-4 text-gray-500 leading-relaxed">{t.catalog.desc}</p>
                <ul className="mt-5 space-y-2">
                  {t.catalog.bullets.map((b, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <Check size={16} style={{ color: '#2DD4BF' }} className="flex-shrink-0" /> {b}
                    </li>
                  ))}
                </ul>
                <a href="https://www.estamply.app/catalogo/sublishop" target="_blank" rel="noopener noreferrer"
                  className="mt-6 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-sm font-bold border-2 hover:gap-2.5 transition-all" style={{ borderColor: '#6C63FF', color: '#6C63FF' }}>
                  {t.catalog.cta} <ChevronRight size={16} />
                </a>
              </div>
              <div className="flex-1 flex justify-center">
                <div className="relative w-[260px]">
                  <div className="rounded-[2.5rem] border-[6px] border-gray-800 bg-gray-800 shadow-2xl overflow-hidden">
                    <div className="w-20 h-5 bg-gray-800 rounded-b-xl mx-auto" />
                    <div className="bg-white">
                      <Image src="/screenshots/catalogo-interno.png" alt="Catálogo web" width={260} height={520} className="w-full h-auto" loading="lazy" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Section>
        </div>
      </section>

      {/* ── AUDIENCE ── */}
      <section className="py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <Section><h2 className="text-3xl lg:text-4xl font-extrabold text-center tracking-tight mb-10">{t.audience.title}</h2></Section>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {t.audience.segments.map((s, i) => (
              <Section key={i} delay={i * 120}>
                <div className={`relative p-6 rounded-2xl bg-white border-2 transition-all hover:shadow-lg h-full flex flex-col ${s.badge ? 'border-teal-300 shadow-md' : 'border-gray-100 hover:border-gray-200'}`}>
                  {s.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ background: '#6C63FF' }}>{s.badge}</div>
                  )}
                  <span className="text-4xl block mb-3">{s.emoji}</span>
                  <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed flex-1">{s.desc}</p>
                  <div className="mt-4 h-1 rounded-full w-12" style={{ background: s.color }} />
                </div>
              </Section>
            ))}
          </div>
        </div>
      </section>

      {/* ── TECHNIQUES ── */}
      <section className="py-14 lg:py-16" style={{ background: '#F8FAFC' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Section>
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight mb-3">{t.techniques.title}</h2>
            <p className="text-gray-500 mb-8 max-w-xl mx-auto">{t.techniques.desc}</p>
          </Section>
          <Section delay={150}>
            <div className="flex flex-wrap justify-center gap-3">
              {t.techniques.items.map((tech, i) => (
                <div key={i} className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-teal-200 transition-all cursor-default">
                  <span className="text-xl">{TECHNIQUE_ICONS[i]}</span>
                  <span className="font-bold text-gray-700">{tech}</span>
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" className="py-16 lg:py-20">
        <div className="max-w-5xl mx-auto px-4">
          <Section>
            <div className="text-center mb-10">
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{t.pricing.title}</h2>
              <p className="mt-3 text-gray-500">{t.pricing.sub}</p>
              <div className="mt-6 inline-flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
                <button onClick={() => setAnnual(false)} className={`px-4 py-2 rounded-full text-sm font-bold transition ${!annual ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>{t.pricing.monthly}</button>
                <button onClick={() => setAnnual(true)} className={`px-4 py-2 rounded-full text-sm font-bold transition flex items-center gap-1.5 ${annual ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>
                  {t.pricing.annual} <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#2DD4BF20', color: '#0D9488' }}>{t.pricing.annualSave}</span>
                </button>
              </div>
            </div>
          </Section>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
            {t.pricing.plans.map((plan, i) => (
              <Section key={i} delay={i * 100}>
                <div className={`relative p-6 rounded-2xl bg-white border-2 h-full flex flex-col ${plan.popular ? 'border-teal-400 shadow-xl md:scale-105' : 'border-gray-100'}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: '#6C63FF' }}>
                      {lang === 'es' ? 'Más popular' : 'Mais popular'}
                    </div>
                  )}
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mt-2 mb-5">
                    <span className="text-4xl font-extrabold" style={{ color: '#6C63FF' }}>${annual ? plan.annualPrice : plan.price}</span>
                    <span className="text-sm text-gray-400 font-medium">/{lang === 'es' ? 'mes' : 'mês'}</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: '#2DD4BF' }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={`${APP_URL}/signup`} className={`block w-full py-3 rounded-full text-center text-sm font-bold transition-all ${plan.popular ? 'text-white shadow-md hover:shadow-lg' : 'text-gray-700 border border-gray-200 hover:bg-gray-50'}`} style={plan.popular ? { background: '#6C63FF' } : {}}>
                    {t.pricing.cta}
                  </Link>
                </div>
              </Section>
            ))}
          </div>

          <Section delay={300}>
            <p className="text-center text-sm text-gray-400 mt-6">{t.pricing.allInclude}</p>
          </Section>

          {/* FAQ */}
          <Section delay={400}>
            <div className="mt-10 max-w-2xl mx-auto space-y-2">
              {t.pricing.faq.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition">
                  <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-3.5 text-left">
                    <span className="text-sm font-bold text-gray-700">{item.q}</span>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                  </button>
                  {openFaq === i && <p className="px-5 pb-4 text-sm text-gray-500 leading-relaxed">{item.a}</p>}
                </div>
              ))}
            </div>
          </Section>
        </div>
      </section>

      {/* ── SOCIAL PROOF (dark) ── */}
      <section className="py-16 lg:py-20" style={{ background: '#1E293B' }}>
        <Section>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="text-5xl text-gray-600 mb-4">&ldquo;</div>
            <blockquote className="text-xl lg:text-2xl font-medium text-gray-200 leading-relaxed italic">
              {t.social.quote}
            </blockquote>
            <div className="mt-6 flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-600 to-teal-400 flex items-center justify-center text-white font-bold text-lg">P</div>
              <div>
                <p className="font-bold text-white">{t.social.author}</p>
                <p className="text-sm text-gray-400">{t.social.role}</p>
                <p className="text-xs text-gray-500">{t.social.location}</p>
              </div>
            </div>
          </div>
        </Section>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-16 lg:py-20 relative overflow-hidden">
        <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.06), rgba(45,212,191,0.06))' }} />
        <Section>
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">{t.finalCta.title}</h2>
            <p className="mt-4 text-lg text-gray-500">{t.finalCta.sub}</p>
            <div className="mt-8">
              <Link href={`${APP_URL}/signup`} className="inline-block px-10 py-4 rounded-full text-base font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-[1.03] animate-pulse-subtle" style={{ background: '#6C63FF' }}>
                {t.finalCta.cta}
              </Link>
            </div>
            <p className="mt-4 text-sm text-gray-400">{t.finalCta.below}</p>
          </div>
        </Section>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Image src="/logo-icon.png" alt="Estamply" width={24} height={24} className="rounded" />
              <span className="font-bold text-sm text-gray-700">Estamply</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#pricing" className="hover:text-gray-600 transition">{t.footer.plans}</a>
              <a href="mailto:hola@estamply.app" className="hover:text-gray-600 transition">{t.footer.support}</a>
              <a href="mailto:hola@estamply.app" className="hover:text-gray-600 transition">{t.footer.contact}</a>
              <span className="text-gray-200">|</span>
              <a href="/terms" className="hover:text-gray-600 transition">{t.footer.terms}</a>
              <a href="/privacy" className="hover:text-gray-600 transition">{t.footer.privacy}</a>
            </div>
            <div className="flex gap-0.5 bg-gray-100 rounded-full p-0.5">
              <Link href={esHref} className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${lang === 'es' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>ES</Link>
              <Link href={ptHref} className={`px-2.5 py-1 rounded-full text-xs font-bold transition ${lang === 'pt' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>PT</Link>
            </div>
          </div>
          <p className="text-center text-xs text-gray-300 mt-6">{t.footer.copy}</p>
        </div>
      </footer>
    </div>
  )
}

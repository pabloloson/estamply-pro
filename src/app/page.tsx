'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Calculator, FileText, LayoutGrid, ShoppingCart, BarChart3, Users, ChevronDown, ChevronRight, Check, Menu, X, Smartphone } from 'lucide-react'

// ── i18n ──
const TEXTS = {
  es: {
    nav: { features: 'Funciones', pricing: 'Precios', login: 'Iniciar sesión', cta: 'Probá gratis →' },
    hero: {
      h1: 'Gestioná tu taller de estampado como un profesional',
      sub: 'Cotizá en segundos, armá presupuestos que impresionan, gestioná pedidos sin que se te escape nada, y sabé exactamente cuánto ganás. Todo en un solo lugar.',
      cta: 'Probá gratis 14 días',
      noCc: 'Sin tarjeta de crédito. Cancelá cuando quieras.',
      badges: ['Sublimación', 'DTF', 'Vinilo', 'Serigrafía', 'UV'],
    },
    pain: {
      title: '¿Te suena familiar?',
      items: [
        { icon: '📱', text: 'Cotizás con la calculadora del celular y siempre te olvidás de algún costo' },
        { icon: '📋', text: 'Mandás presupuestos por WhatsApp como un mensaje de texto más' },
        { icon: '🤯', text: 'No sabés si estás ganando o perdiendo plata en cada pedido' },
        { icon: '📦', text: 'Se te pierden pedidos porque no tenés un sistema para seguirlos' },
        { icon: '💸', text: 'Entregás trabajos y te olvidás de cobrar el saldo' },
        { icon: '🛒', text: 'No tenés un catálogo online para mostrar lo que hacés' },
      ],
      close: 'Si te identificás con al menos 2 de estos puntos, Estamply es para vos.',
    },
    solution: {
      title: 'Todo lo que necesitás para gestionar tu taller en un solo lugar',
      sub: 'Estamply es el primer software diseñado específicamente para talleres de estampado en Latinoamérica.',
      features: [
        { title: 'Cotizador inteligente', desc: 'Cotizá cualquier producto en menos de 30 segundos. Estamply calcula automáticamente el costo de materiales, tintas, papel, amortización de equipos y hasta el desperdicio. Vos elegís tu margen y listo.' },
        { title: 'Presupuestos profesionales', desc: 'Generá presupuestos profesionales con tu logo y datos. Compartilos por WhatsApp o con un link. Tu cliente recibe un documento que genera confianza.' },
        { title: 'Gestión de pedidos', desc: 'Seguí cada pedido desde que entra hasta que se entrega. Un tablero Kanban te muestra qué está pendiente, en producción y listo. Nunca más pierdas un pedido.' },
        { title: 'Tu catálogo web propio', desc: 'Tenés tu propia tienda online en minutos. Tus clientes ven tus productos, eligen talle y color, y te hacen pedidos directo por WhatsApp. Sin comisiones.' },
        { title: 'Sabé cuánto ganás', desc: 'Ves tu rentabilidad real: margen por producto, por cliente, por técnica. Sabés exactamente qué te conviene producir y qué no vale la pena.' },
        { title: 'Tu equipo, bajo control', desc: 'Agregá empleados con permisos específicos. Tu vendedor cotiza sin ver tus costos. Tu operario ve qué producir sin ver precios. Vos tenés visibilidad total.' },
      ],
    },
    catalog: {
      title: 'Tu catálogo web en 5 minutos. Pedidos por WhatsApp las 24hs.',
      desc: 'Compartí el link en tus redes sociales o mandalo por WhatsApp. Tus clientes ven tus productos, eligen talle, color y cantidad, y te hacen un pedido organizado.',
      bullets: ['Funciona en celular y computadora', 'Tus clientes compran a cualquier hora', 'Cada pedido queda registrado en tu sistema', 'Con tu marca, tus colores y tu logo', 'Medios de pago configurables'],
      cta: 'Ver catálogo de ejemplo →',
    },
    audience: {
      title: 'Estamply es para vos si...',
      segments: [
        { emoji: '🏠', title: 'Recién empezás', desc: 'Tenés una prensa, una impresora y muchas ganas. Necesitás saber cuánto cobrar y tener un catálogo para mostrar lo que hacés. Estamply te profesionaliza desde el día uno.' },
        { emoji: '📈', title: 'Tu taller está creciendo', desc: 'Ya tenés clientes fijos, hacés varios pedidos por semana, y no das abasto con WhatsApp y Excel. Necesitás orden, control y saber si ganás plata.' },
        { emoji: '🏭', title: 'Vivís de tu taller', desc: 'Tenés empleados, múltiples técnicas, clientes corporativos. Necesitás delegar sin perder el control y saber tu rentabilidad real.' },
      ],
    },
    techniques: {
      title: 'Funciona con tu técnica',
      desc: 'Cada técnica tiene su propio cotizador con los costos específicos. Configurá tu taller una vez y cotizá cualquier producto al instante.',
      items: ['Sublimación', 'DTF Textil', 'DTF UV', 'Vinilo', 'Serigrafía'],
    },
    pricing: {
      title: 'Precios simples. Sin sorpresas.',
      sub: 'Elegí el plan que se ajuste a la etapa de tu taller. Podés cambiar en cualquier momento.',
      monthly: 'Mensual',
      annual: 'Anual — Ahorrá 3 meses',
      allInclude: 'Todos los planes incluyen 14 días gratis del plan Pro. Sin tarjeta de crédito.',
      cta: 'Empezar gratis 14 días',
      plans: [
        {
          name: 'Emprendedor', price: 9, annualPrice: 6.75, popular: false,
          features: ['Cotizador con todas las técnicas', 'Presupuestos profesionales', 'Gestión de pedidos (Kanban)', 'Catálogo web (25 productos)', 'Clientes ilimitados', 'Estadísticas del mes', '1 usuario', 'Soporte por email'],
        },
        {
          name: 'Pro', price: 17, annualPrice: 12.75, popular: true,
          features: ['Todo lo de Emprendedor', 'Catálogo web ilimitado', 'Estadísticas completas', 'Rentabilidad por producto', 'Hasta 3 usuarios con permisos', 'Descuentos en catálogo', 'Soporte email + WhatsApp'],
        },
        {
          name: 'Negocio', price: 29, annualPrice: 21.75, popular: false,
          features: ['Todo lo de Pro', 'Hasta 10 usuarios', 'Exportar Excel/PDF', 'Ocultar "Powered by Estamply"', 'Soporte prioritario'],
        },
      ],
      faq: [
        { q: '¿Puedo cambiar de plan después?', a: 'Sí, podés subir o bajar en cualquier momento.' },
        { q: '¿Qué pasa cuando terminan los 14 días?', a: 'Elegís un plan y método de pago. Si no elegís, tu cuenta baja al plan Emprendedor con sus límites.' },
        { q: '¿Puedo pagar en pesos/reales?', a: 'En Argentina aceptamos MercadoPago en pesos. En Brasil, Hotmart en reales. El resto del mundo con tarjeta en USD.' },
        { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin permanencia ni penalidad.' },
      ],
    },
    social: {
      quote: 'Construido por un dueño de taller de estampado. Sé lo que necesitás porque tengo los mismos problemas que vos.',
      author: 'Pablo Loson',
      role: 'Fundador de Estamply y dueño de Sublishop',
    },
    finalCta: {
      title: 'Tu taller merece un sistema profesional',
      sub: 'Empezá hoy. En 5 minutos tenés tu catálogo web andando y tu primer presupuesto listo.',
      cta: 'Probá gratis 14 días — Sin tarjeta de crédito',
      below: 'Únite a los talleres que dejaron de gestionar con WhatsApp y una calculadora.',
    },
    footer: {
      plans: 'Planes', support: 'Soporte', contact: 'Contacto',
      terms: 'Términos', privacy: 'Privacidad',
      copy: '© 2026 Estamply. Hecho en Córdoba, Argentina 🇦🇷 para todo el mundo.',
    },
  },
  pt: {
    nav: { features: 'Funções', pricing: 'Preços', login: 'Entrar', cta: 'Teste grátis →' },
    hero: {
      h1: 'Gerencie sua oficina de estamparia como um profissional',
      sub: 'Faça orçamentos em segundos, crie propostas que impressionam, gerencie pedidos sem perder nada, e saiba exatamente quanto você ganha. Tudo em um só lugar.',
      cta: 'Teste grátis por 14 dias',
      noCc: 'Sem cartão de crédito. Cancele quando quiser.',
      badges: ['Sublimação', 'DTF', 'Vinil', 'Serigrafia', 'UV'],
    },
    pain: {
      title: 'Isso parece familiar?',
      items: [
        { icon: '📱', text: 'Você faz orçamentos na calculadora do celular e sempre esquece algum custo' },
        { icon: '📋', text: 'Envia orçamentos pelo WhatsApp como uma mensagem qualquer' },
        { icon: '🤯', text: 'Não sabe se está ganhando ou perdendo dinheiro em cada pedido' },
        { icon: '📦', text: 'Perde pedidos porque não tem um sistema para acompanhá-los' },
        { icon: '💸', text: 'Entrega trabalhos e esquece de cobrar o saldo' },
        { icon: '🛒', text: 'Não tem um catálogo online para mostrar o que faz' },
      ],
      close: 'Se você se identificou com pelo menos 2 desses pontos, o Estamply é para você.',
    },
    solution: {
      title: 'Tudo o que você precisa para gerenciar sua oficina em um só lugar',
      sub: 'Estamply é o primeiro software projetado especificamente para oficinas de estamparia na América Latina.',
      features: [
        { title: 'Calculadora inteligente', desc: 'Faça orçamentos de qualquer produto em menos de 30 segundos. O Estamply calcula automaticamente o custo de materiais, tintas, papel, amortização de equipamentos e até o desperdício.' },
        { title: 'Orçamentos profissionais', desc: 'Gere orçamentos profissionais com seu logo e dados. Compartilhe pelo WhatsApp ou com um link. Seu cliente recebe um documento que gera confiança.' },
        { title: 'Gestão de pedidos', desc: 'Acompanhe cada pedido desde a entrada até a entrega. Um quadro Kanban mostra o que está pendente, em produção e pronto.' },
        { title: 'Seu catálogo web próprio', desc: 'Tenha sua própria loja online em minutos. Seus clientes veem seus produtos, escolhem tamanho e cor, e fazem pedidos direto pelo WhatsApp. Sem comissões.' },
        { title: 'Saiba quanto você ganha', desc: 'Veja sua rentabilidade real: margem por produto, por cliente, por técnica. Saiba exatamente o que vale a pena produzir.' },
        { title: 'Sua equipe sob controle', desc: 'Adicione funcionários com permissões específicas. Seu vendedor faz orçamentos sem ver seus custos. Você tem visibilidade total.' },
      ],
    },
    catalog: {
      title: 'Seu catálogo web em 5 minutos. Pedidos por WhatsApp 24h.',
      desc: 'Compartilhe o link nas suas redes sociais ou mande pelo WhatsApp. Seus clientes veem seus produtos, escolhem tamanho, cor e quantidade, e fazem um pedido organizado.',
      bullets: ['Funciona no celular e computador', 'Seus clientes compram a qualquer hora', 'Cada pedido fica registrado no seu sistema', 'Com sua marca, suas cores e seu logo', 'Meios de pagamento configuráveis'],
      cta: 'Ver catálogo de exemplo →',
    },
    audience: {
      title: 'O Estamply é para você se...',
      segments: [
        { emoji: '🏠', title: 'Está começando', desc: 'Tem uma prensa, uma impressora e muita vontade. Precisa saber quanto cobrar e ter um catálogo para mostrar o que faz.' },
        { emoji: '📈', title: 'Sua oficina está crescendo', desc: 'Já tem clientes fixos, faz vários pedidos por semana, e não consegue mais com WhatsApp e Excel.' },
        { emoji: '🏭', title: 'Vive da sua oficina', desc: 'Tem funcionários, múltiplas técnicas, clientes corporativos. Precisa delegar sem perder o controle.' },
      ],
    },
    techniques: {
      title: 'Funciona com sua técnica',
      desc: 'Cada técnica tem sua própria calculadora com os custos específicos. Configure sua oficina uma vez e faça orçamentos instantaneamente.',
      items: ['Sublimação', 'DTF Têxtil', 'DTF UV', 'Vinil', 'Serigrafia'],
    },
    pricing: {
      title: 'Preços simples. Sem surpresas.',
      sub: 'Escolha o plano que se ajusta à fase da sua oficina. Pode mudar a qualquer momento.',
      monthly: 'Mensal',
      annual: 'Anual — Economize 3 meses',
      allInclude: 'Todos os planos incluem 14 dias grátis do plano Pro. Sem cartão de crédito.',
      cta: 'Começar grátis 14 dias',
      plans: [
        {
          name: 'Empreendedor', price: 9, annualPrice: 6.75, popular: false,
          features: ['Calculadora com todas as técnicas', 'Orçamentos profissionais', 'Gestão de pedidos (Kanban)', 'Catálogo web (25 produtos)', 'Clientes ilimitados', 'Estatísticas do mês', '1 usuário', 'Suporte por email'],
        },
        {
          name: 'Pro', price: 17, annualPrice: 12.75, popular: true,
          features: ['Tudo do Empreendedor', 'Catálogo web ilimitado', 'Estatísticas completas', 'Rentabilidade por produto', 'Até 3 usuários com permissões', 'Descontos no catálogo', 'Suporte email + WhatsApp'],
        },
        {
          name: 'Negócio', price: 29, annualPrice: 21.75, popular: false,
          features: ['Tudo do Pro', 'Até 10 usuários', 'Exportar Excel/PDF', 'Ocultar "Powered by Estamply"', 'Suporte prioritário'],
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
      quote: 'Construído por um dono de oficina de estamparia. Sei do que você precisa porque tenho os mesmos problemas que você.',
      author: 'Pablo Loson',
      role: 'Fundador do Estamply e dono da Sublishop',
    },
    finalCta: {
      title: 'Sua oficina merece um sistema profissional',
      sub: 'Comece hoje. Em 5 minutos seu catálogo web está funcionando e seu primeiro orçamento pronto.',
      cta: 'Teste grátis 14 dias — Sem cartão de crédito',
      below: 'Junte-se às oficinas que pararam de gerenciar com WhatsApp e calculadora.',
    },
    footer: {
      plans: 'Planos', support: 'Suporte', contact: 'Contato',
      terms: 'Termos', privacy: 'Privacidade',
      copy: '© 2026 Estamply. Feito em Córdoba, Argentina 🇦🇷 para o mundo todo.',
    },
  },
}

// ── Feature icons ──
const FEATURE_ICONS = [Calculator, FileText, LayoutGrid, ShoppingCart, BarChart3, Users]
const TECHNIQUE_ICONS = ['🔥', '🖨️', '✨', '✂️', '🎨']

function LandingInner() {
  const params = useSearchParams()
  const [lang, setLang] = useState<'es' | 'pt'>('es')
  const [annual, setAnnual] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const urlLang = params.get('lang')
    if (urlLang === 'pt') { setLang('pt'); return }
    if (navigator.language?.startsWith('pt')) setLang('pt')
  }, [params])

  const t = TEXTS[lang]

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#2DD4BF' }}>
              <span className="text-white font-black text-sm">E</span>
            </div>
            <span className="font-bold text-lg text-gray-900">Estamply</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-gray-500 hover:text-gray-900 transition">{t.nav.features}</a>
            <a href="#pricing" className="text-sm text-gray-500 hover:text-gray-900 transition">{t.nav.pricing}</a>
            <div className="flex gap-1 bg-gray-100 rounded-full p-0.5">
              <button onClick={() => setLang('es')} className={`px-2 py-0.5 rounded-full text-xs font-semibold transition ${lang === 'es' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>ES</button>
              <button onClick={() => setLang('pt')} className={`px-2 py-0.5 rounded-full text-xs font-semibold transition ${lang === 'pt' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>PT</button>
            </div>
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-900 transition">{t.nav.login}</Link>
            <Link href="/signup" className="px-4 py-2 rounded-full text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{t.nav.cta}</Link>
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" className="block text-sm text-gray-600" onClick={() => setMenuOpen(false)}>{t.nav.features}</a>
            <a href="#pricing" className="block text-sm text-gray-600" onClick={() => setMenuOpen(false)}>{t.nav.pricing}</a>
            <div className="flex gap-2">
              <button onClick={() => { setLang('es'); setMenuOpen(false) }} className={`px-3 py-1 rounded-full text-xs font-semibold ${lang === 'es' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>ES</button>
              <button onClick={() => { setLang('pt'); setMenuOpen(false) }} className={`px-3 py-1 rounded-full text-xs font-semibold ${lang === 'pt' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'}`}>PT</button>
            </div>
            <Link href="/login" className="block text-sm text-gray-600">{t.nav.login}</Link>
            <Link href="/signup" className="block w-full text-center px-4 py-2.5 rounded-full text-sm font-semibold text-white" style={{ background: '#6C5CE7' }}>{t.nav.cta}</Link>
          </div>
        )}
      </nav>

      {/* ── SECTION 1: HERO ── */}
      <section className="pt-16 pb-20 lg:pt-24 lg:pb-28">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl lg:text-6xl font-black leading-tight tracking-tight text-gray-900">
            {t.hero.h1}
          </h1>
          <p className="mt-6 text-lg lg:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            {t.hero.sub}
          </p>
          <div className="mt-8">
            <Link href="/signup" className="inline-block px-8 py-4 rounded-full text-base font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105" style={{ background: '#6C5CE7' }}>
              {t.hero.cta}
            </Link>
            <p className="mt-3 text-sm text-gray-400">{t.hero.noCc}</p>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {t.hero.badges.map(b => (
              <span key={b} className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 2: PAIN ── */}
      <section className="py-16 lg:py-24" style={{ background: '#FAFAFA' }}>
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl lg:text-4xl font-black text-center mb-12">{t.pain.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {t.pain.items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-5 bg-white rounded-2xl border border-gray-100">
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-gray-500 font-medium">{t.pain.close}</p>
        </div>
      </section>

      {/* ── SECTION 3: SOLUTION ── */}
      <section id="features" className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-black">{t.solution.title}</h2>
            <p className="mt-4 text-gray-500 text-lg max-w-2xl mx-auto">{t.solution.sub}</p>
          </div>
          <div className="space-y-12">
            {t.solution.features.map((f, i) => {
              const Icon = FEATURE_ICONS[i]
              const isEven = i % 2 === 0
              return (
                <div key={i} className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-8`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#6C5CE720' }}>
                        <Icon size={20} style={{ color: '#6C5CE7' }} />
                      </div>
                      <h3 className="text-xl font-bold">{f.title}</h3>
                    </div>
                    <p className="text-gray-500 leading-relaxed">{f.desc}</p>
                  </div>
                  <div className="flex-1 w-full">
                    <div className="w-full h-48 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                      <div className="text-center">
                        <Icon size={32} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-xs text-gray-400">Screenshot del {f.title.toLowerCase()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── SECTION 4: CATALOG HIGHLIGHT ── */}
      <section className="py-16 lg:py-24" style={{ background: 'linear-gradient(135deg, #6C5CE710, #2DD4BF10)' }}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="flex-1">
              <h2 className="text-3xl lg:text-4xl font-black mb-4">{t.catalog.title}</h2>
              <p className="text-gray-500 leading-relaxed mb-6">{t.catalog.desc}</p>
              <ul className="space-y-2 mb-6">
                {t.catalog.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check size={16} style={{ color: '#2DD4BF' }} className="flex-shrink-0" /> {b}
                  </li>
                ))}
              </ul>
              <a href="https://www.estamply.app/catalogo/sublishop" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold hover:gap-2 transition-all" style={{ color: '#6C5CE7' }}>
                {t.catalog.cta} <ChevronRight size={16} />
              </a>
            </div>
            <div className="flex-1 w-full">
              <div className="w-64 mx-auto h-[420px] rounded-[2rem] border-4 border-gray-800 bg-white shadow-2xl overflow-hidden flex items-center justify-center">
                <div className="text-center px-4">
                  <Smartphone size={32} className="mx-auto mb-2 text-gray-300" />
                  <p className="text-xs text-gray-400">Mockup catálogo mobile</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 5: AUDIENCE ── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-3xl lg:text-4xl font-black text-center mb-12">{t.audience.title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.audience.segments.map((s, i) => (
              <div key={i} className="p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all">
                <span className="text-4xl block mb-4">{s.emoji}</span>
                <h3 className="text-lg font-bold mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 6: TECHNIQUES ── */}
      <section className="py-16 lg:py-24" style={{ background: '#FAFAFA' }}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-black mb-4">{t.techniques.title}</h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">{t.techniques.desc}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {t.techniques.items.map((tech, i) => (
              <div key={i} className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl border border-gray-100 shadow-sm">
                <span className="text-xl">{TECHNIQUE_ICONS[i]}</span>
                <span className="font-semibold text-gray-700">{tech}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 7: PRICING ── */}
      <section id="pricing" className="py-16 lg:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="text-3xl lg:text-4xl font-black">{t.pricing.title}</h2>
            <p className="mt-3 text-gray-500">{t.pricing.sub}</p>
            <div className="mt-6 inline-flex items-center gap-1 bg-gray-100 rounded-full p-0.5">
              <button onClick={() => setAnnual(false)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${!annual ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>{t.pricing.monthly}</button>
              <button onClick={() => setAnnual(true)} className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${annual ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>{t.pricing.annual}</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.pricing.plans.map((plan, i) => (
              <div key={i} className={`p-6 rounded-2xl border-2 ${plan.popular ? 'border-purple-400 shadow-xl scale-105' : 'border-gray-100'} bg-white relative`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold text-white uppercase tracking-wider" style={{ background: '#6C5CE7' }}>
                    {lang === 'es' ? 'Más popular' : 'Mais popular'}
                  </div>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black" style={{ color: '#6C5CE7' }}>${annual ? plan.annualPrice : plan.price}</span>
                  <span className="text-sm text-gray-400">/{lang === 'es' ? 'mes' : 'mês'}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={14} className="mt-0.5 flex-shrink-0" style={{ color: '#2DD4BF' }} /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`block w-full py-2.5 rounded-full text-center text-sm font-semibold transition ${plan.popular ? 'text-white' : 'text-gray-700 border border-gray-200 hover:bg-gray-50'}`} style={plan.popular ? { background: '#6C5CE7' } : {}}>
                  {t.pricing.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-400 mt-6">{t.pricing.allInclude}</p>

          {/* FAQ */}
          <div className="mt-12 max-w-2xl mx-auto space-y-2">
            {t.pricing.faq.map((item, i) => (
              <div key={i} className="border border-gray-100 rounded-xl overflow-hidden">
                <button onClick={() => setOpenFaq(openFaq === i ? null : i)} className="w-full flex items-center justify-between px-5 py-3 text-left">
                  <span className="text-sm font-semibold text-gray-700">{item.q}</span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && <p className="px-5 pb-4 text-sm text-gray-500">{item.a}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 8: SOCIAL PROOF ── */}
      <section className="py-16 lg:py-24" style={{ background: '#FAFAFA' }}>
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="text-5xl mb-6">&ldquo;</div>
          <blockquote className="text-xl lg:text-2xl font-medium text-gray-700 leading-relaxed italic">
            {t.social.quote}
          </blockquote>
          <div className="mt-6">
            <p className="font-bold text-gray-900">{t.social.author}</p>
            <p className="text-sm text-gray-400">{t.social.role}</p>
          </div>
        </div>
      </section>

      {/* ── SECTION 9: FINAL CTA ── */}
      <section className="py-20 lg:py-28">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-black mb-4">{t.finalCta.title}</h2>
          <p className="text-lg text-gray-500 mb-8">{t.finalCta.sub}</p>
          <Link href="/signup" className="inline-block px-8 py-4 rounded-full text-base font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105" style={{ background: '#6C5CE7' }}>
            {t.finalCta.cta}
          </Link>
          <p className="mt-4 text-sm text-gray-400">{t.finalCta.below}</p>
        </div>
      </section>

      {/* ── SECTION 10: FOOTER ── */}
      <footer className="border-t border-gray-100 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: '#2DD4BF' }}>
                <span className="text-white font-black text-[10px]">E</span>
              </div>
              <span className="font-bold text-sm text-gray-700">Estamply</span>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <a href="#pricing" className="hover:text-gray-600 transition">{t.footer.plans}</a>
              <a href="mailto:hola@estamply.app" className="hover:text-gray-600 transition">{t.footer.support}</a>
              <a href="mailto:hola@estamply.app" className="hover:text-gray-600 transition">{t.footer.contact}</a>
            </div>
            <div className="flex gap-1 bg-gray-100 rounded-full p-0.5">
              <button onClick={() => setLang('es')} className={`px-2 py-0.5 rounded-full text-xs font-semibold transition ${lang === 'es' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>ES</button>
              <button onClick={() => setLang('pt')} className={`px-2 py-0.5 rounded-full text-xs font-semibold transition ${lang === 'pt' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-400'}`}>PT</button>
            </div>
          </div>
          <p className="text-center text-xs text-gray-300 mt-6">{t.footer.copy}</p>
        </div>
      </footer>
    </div>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <LandingInner />
    </Suspense>
  )
}

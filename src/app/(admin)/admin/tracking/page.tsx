'use client'

import { useState } from 'react'
import { Globe, Eye, UserPlus, ArrowRight, TrendingUp, ExternalLink, Save } from 'lucide-react'

export default function TrackingPage() {
  const [apiKey, setApiKey] = useState('')
  const [saved, setSaved] = useState(false)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tracking & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">Analítica de visitantes y comportamiento de usuarios</p>
      </div>

      {/* KPI Cards — placeholder */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Visitas hoy', value: '—', desc: 'landing page', icon: Eye, color: '#0F766E' },
          { label: 'Registros hoy', value: '—', desc: 'nuevos talleres', icon: UserPlus, color: '#00B894' },
          { label: 'Conv. Trial', value: '—', desc: 'visita → registro', icon: ArrowRight, color: '#E17055' },
          { label: 'Conv. Pago', value: '—', desc: 'trial → pago', icon: TrendingUp, color: '#E84393' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{kpi.label}</span>
            </div>
            <p className="text-3xl font-black text-gray-300">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.desc}</p>
          </div>
        ))}
      </div>

      {/* PostHog integration */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#1D4AFF' }}>
            <Globe size={22} className="text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">Conectá PostHog para ver analytics</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              PostHog es la herramienta de product analytics que usamos para trackear visitantes,
              registros, uso de features, funnels y retención. Plan gratis: 1M eventos/mes.
            </p>

            <div className="max-w-md space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PostHog Project API Key</label>
                <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-teal-300"
                  placeholder="phc_xxxxxxxxxxxxxxxxxxxx" value={apiKey} onChange={e => setApiKey(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white" style={{ background: '#0F766E' }}>
                  <Save size={14} /> {saved ? 'Guardado ✓' : 'Guardar'}
                </button>
                <a href="https://posthog.com" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50">
                  <ExternalLink size={14} /> Ir a PostHog
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* What PostHog will track */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Qué se va a trackear</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[
            { title: 'Landing page', items: ['Visitas', 'Clicks en "Registrarse"', 'Fuente de tráfico (UTM)', 'Tiempo en página'] },
            { title: 'Registro & onboarding', items: ['Inicio de registro', 'Paso completado (1-4)', 'Abandonos por paso', 'País y técnicas elegidas'] },
            { title: 'Panel del taller', items: ['Login', 'Páginas visitadas', 'Cotización creada', 'Presupuesto enviado', 'Pedido confirmado'] },
            { title: 'Catálogo web', items: ['Visitas por taller', 'Productos vistos', 'Agregar al carrito', 'Pedido completado'] },
          ].map(section => (
            <div key={section.title} className="p-4 rounded-xl bg-gray-50">
              <p className="text-sm font-bold text-gray-700 mb-2">{section.title}</p>
              <ul className="space-y-1">
                {section.items.map(item => (
                  <li key={item} className="text-xs text-gray-500 flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-teal-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

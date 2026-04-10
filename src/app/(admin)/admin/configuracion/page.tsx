'use client'

import { useState } from 'react'
import { Save, Check, X, Settings, Globe, Mail, Clock } from 'lucide-react'

interface Plan {
  id: string; name: string; price: number; currency: string
  limits: { products: number | null; users: number }
  features: string[]
}

const DEFAULT_PLANS: Plan[] = [
  { id: 'emprendedor', name: 'Emprendedor', price: 0, currency: 'USD', limits: { products: 20, users: 1 }, features: ['Cotizador', 'Presupuestos', 'Pedidos', 'Hasta 20 productos'] },
  { id: 'crecimiento', name: 'Crecimiento', price: 19, currency: 'USD', limits: { products: null, users: 3 }, features: ['Todo de Emprendedor', 'Productos ilimitados', 'Catálogo web', 'Estadísticas', 'Hasta 3 usuarios'] },
  { id: 'negocio', name: 'Negocio', price: 39, currency: 'USD', limits: { products: null, users: 10 }, features: ['Todo de Crecimiento', 'Multi-usuario (10)', 'Soporte prioritario', 'Exportaciones'] },
]

export default function ConfiguracionPage() {
  const [plans, setPlans] = useState<Plan[]>(DEFAULT_PLANS)
  const [trialDays, setTrialDays] = useState(14)
  const [posthogKey, setPosthogKey] = useState('')
  const [emailKey, setEmailKey] = useState('')
  const [emailFrom, setEmailFrom] = useState('hello@estamply.app')
  const [saved, setSaved] = useState<string | null>(null)

  function save(section: string) {
    setSaved(section)
    setTimeout(() => setSaved(null), 2000)
  }

  function updatePlan(id: string, field: string, value: number) {
    setPlans(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-1">Configuración de la plataforma Estamply</p>
      </div>

      {/* Plans */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-gray-400" />
            <h3 className="font-bold text-gray-900">Planes y precios</h3>
          </div>
          <button onClick={() => save('plans')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>
            {saved === 'plans' ? <><Check size={12} /> Guardado</> : <><Save size={12} /> Guardar</>}
          </button>
        </div>

        <div className="space-y-4">
          {plans.map(plan => (
            <div key={plan.id} className="p-4 rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-800">{plan.name}</h4>
                  <p className="text-xs text-gray-400">{plan.features.join(' · ')}</p>
                </div>
                <span className={`text-lg font-black ${plan.price === 0 ? 'text-gray-400' : 'text-purple-600'}`}>
                  {plan.price === 0 ? 'Gratis' : `$${plan.price}/mes`}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Precio (USD/mes)</label>
                  <input type="number" min={0} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                    value={plan.price} onChange={e => updatePlan(plan.id, 'price', Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Límite productos</label>
                  <input type="number" min={0} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                    value={plan.limits.products ?? 9999} placeholder="Ilimitados"
                    onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, limits: { ...p.limits, products: Number(e.target.value) || null } } : p))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Límite usuarios</label>
                  <input type="number" min={1} className="w-full px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                    value={plan.limits.users}
                    onChange={e => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, limits: { ...p.limits, users: Number(e.target.value) || 1 } } : p))} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trial duration */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-gray-400" />
            <h3 className="font-bold text-gray-900">Duración del trial</h3>
          </div>
          <button onClick={() => save('trial')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>
            {saved === 'trial' ? <><Check size={12} /> Guardado</> : <><Save size={12} /> Guardar</>}
          </button>
        </div>
        <div className="flex items-center gap-3 max-w-xs">
          <input type="number" min={1} max={90} className="w-20 px-2 py-1.5 rounded-lg border border-gray-200 text-sm text-center"
            value={trialDays} onChange={e => setTrialDays(Number(e.target.value))} />
          <span className="text-sm text-gray-500">días de prueba gratis (plan Crecimiento)</span>
        </div>
      </div>

      {/* Integrations */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100">
        <h3 className="font-bold text-gray-900 mb-4">Integraciones</h3>
        <div className="space-y-4">
          {/* PostHog */}
          <div className="p-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#1D4AFF' }}>
                  <Globe size={14} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">PostHog</p>
                  <p className="text-xs text-gray-400">Product analytics</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${posthogKey ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {posthogKey ? '✓ Configurado' : 'No conectado'}
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              <input type="text" className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                placeholder="phc_xxxxxxxxxxxxxxxxxxxx" value={posthogKey} onChange={e => setPosthogKey(e.target.value)} />
              <button onClick={() => save('posthog')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>
                {saved === 'posthog' ? 'Guardado ✓' : 'Guardar'}
              </button>
            </div>
          </div>

          {/* Email service */}
          <div className="p-4 rounded-xl border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-100">
                  <Mail size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Email (Resend)</p>
                  <p className="text-xs text-gray-400">Emails transaccionales y marketing</p>
                </div>
              </div>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${emailKey ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {emailKey ? '✓ Configurado' : 'No conectado'}
              </span>
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex gap-2">
                <input type="text" className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  placeholder="re_xxxxxxxxxxxxxxxxxxxx" value={emailKey} onChange={e => setEmailKey(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <input type="email" className="flex-1 px-2 py-1.5 rounded-lg border border-gray-200 text-sm"
                  placeholder="hello@estamply.app" value={emailFrom} onChange={e => setEmailFrom(e.target.value)} />
                <button onClick={() => save('email')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white" style={{ background: '#6C5CE7' }}>
                  {saved === 'email' ? 'Guardado ✓' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

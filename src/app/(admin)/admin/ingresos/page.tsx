'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, Users, RefreshCw } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const FLAGS: Record<string, string> = {
  AR: '🇦🇷', MX: '🇲🇽', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪', EC: '🇪🇨',
  UY: '🇺🇾', PY: '🇵🇾', BO: '🇧🇴', BR: '🇧🇷', VE: '🇻🇪',
}

// Placeholder data — will be replaced with real billing data
const MRR_EVOLUTION = [
  { month: 'Nov', mrr: 0 }, { month: 'Dic', mrr: 0 }, { month: 'Ene', mrr: 0 },
  { month: 'Feb', mrr: 0 }, { month: 'Mar', mrr: 0 }, { month: 'Abr', mrr: 0 },
]

const PLANS = [
  { name: 'Emprendedor', price: 0, talleres: 0, subtotal: 0 },
  { name: 'Crecimiento', price: 19, talleres: 0, subtotal: 0 },
  { name: 'Negocio', price: 39, talleres: 0, subtotal: 0 },
]

export default function IngresosPage() {
  const [period, setPeriod] = useState('12m')

  const mrr = 0
  const arr = mrr * 12
  const churn = 0
  const ltv = 0

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos</h1>
          <p className="text-sm text-gray-500 mt-1">Dashboard financiero de la plataforma</p>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {['3m', '6m', '12m'].map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${period === p ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50"><DollarSign size={16} className="text-green-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">MRR</span>
          </div>
          <p className="text-3xl font-black text-gray-900">${mrr.toLocaleString()} USD</p>
          <p className="text-xs text-gray-400 mt-1">Monthly Recurring Revenue</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50"><TrendingUp size={16} className="text-blue-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">ARR</span>
          </div>
          <p className="text-3xl font-black text-gray-900">${arr.toLocaleString()} USD</p>
          <p className="text-xs text-gray-400 mt-1">Annual Recurring Revenue</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50"><TrendingDown size={16} className="text-red-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Churn</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{churn}%</p>
          <p className="text-xs text-gray-400 mt-1">Cancelaciones del mes</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-50"><Users size={16} className="text-purple-600" /></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">LTV</span>
          </div>
          <p className="text-3xl font-black text-gray-900">${ltv} USD</p>
          <p className="text-xs text-gray-400 mt-1">Lifetime Value promedio</p>
        </div>
      </div>

      {/* MRR Evolution Chart */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Evolución MRR</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={MRR_EVOLUTION}>
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9CA3AF' }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v) => [`$${v} USD`, 'MRR']} />
              <Line type="monotone" dataKey="mrr" stroke="#6C5CE7" strokeWidth={2.5} dot={{ r: 4, fill: '#6C5CE7' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Revenue by plan */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ingresos por plan</h3>
          <table className="w-full">
            <thead><tr className="border-b border-gray-100">
              {['Plan', 'Precio', 'Talleres', 'Subtotal'].map(h =>
                <th key={h} className="text-left text-xs font-semibold text-gray-400 uppercase px-3 py-2">{h}</th>)}
            </tr></thead>
            <tbody>
              {PLANS.map(p => (
                <tr key={p.name} className="border-b border-gray-50">
                  <td className="px-3 py-2.5 text-sm font-medium text-gray-800">{p.name}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">{p.price === 0 ? 'Gratis' : `$${p.price}/mes`}</td>
                  <td className="px-3 py-2.5 text-sm text-gray-500">{p.talleres}</td>
                  <td className="px-3 py-2.5 text-sm font-semibold text-gray-800">${p.subtotal}/mes</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr className="border-t-2 border-gray-200">
              <td colSpan={3} className="px-3 py-2.5 text-sm font-bold text-gray-800">Total MRR</td>
              <td className="px-3 py-2.5 text-sm font-black text-purple-600">${mrr}/mes</td>
            </tr></tfoot>
          </table>
        </div>

        {/* Revenue by country */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ingresos por país</h3>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <RefreshCw size={24} className="text-gray-300 mb-3" />
            <p className="text-sm text-gray-400">Los datos de ingresos por país estarán</p>
            <p className="text-sm text-gray-400">disponibles al conectar el billing.</p>
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Últimas transacciones</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <DollarSign size={24} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No hay transacciones todavía.</p>
          <p className="text-xs text-gray-300 mt-1">Las transacciones aparecerán cuando se conecte el sistema de pagos.</p>
        </div>
      </div>
    </div>
  )
}

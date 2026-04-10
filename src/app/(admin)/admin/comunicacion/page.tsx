'use client'

import { useState, useEffect } from 'react'
import { Mail, Send, Users, AlertTriangle } from 'lucide-react'

const SEGMENTS = [
  { id: 'all', label: 'Todos' },
  { id: 'trial', label: 'Trial' },
  { id: 'paid', label: 'Pagos' },
  { id: 'free', label: 'Gratis' },
  { id: 'expired', label: 'Trial vencido' },
  { id: 'inactive', label: 'Inactivos 30+ días' },
]

export default function ComunicacionPage() {
  const [segment, setSegment] = useState('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [recipientCount, setRecipientCount] = useState(0)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  // Fetch recipient count
  useEffect(() => {
    fetch(`/api/admin?action=talleres&filter=${segment === 'all' ? 'all' : segment}`)
      .then(r => r.json())
      .then(d => setRecipientCount(d.talleres?.length || 0))
      .catch(() => setRecipientCount(0))
  }, [segment])

  function handleSendTest() {
    alert('Email de prueba enviado a tu casilla. (Funcionalidad pendiente de conectar con Resend/SendGrid)')
  }

  function handleSendAll() {
    if (!confirm(`¿Enviar email a ${recipientCount} talleres?`)) return
    setSending(true)
    setTimeout(() => {
      setSending(false)
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    }, 1500)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Comunicación</h1>
        <p className="text-sm text-gray-500 mt-1">Enviar emails y notificaciones a los talleres</p>
      </div>

      {/* Email composer */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 mb-6">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Enviar email masivo</h3>

        {/* Segment selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Destinatarios</label>
          <div className="flex gap-1.5 flex-wrap">
            {SEGMENTS.map(s => (
              <button key={s.id} onClick={() => setSegment(s.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${segment === s.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                {s.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <Users size={12} /> Vista previa: <span className="font-semibold text-gray-600">{recipientCount}</span> destinatarios
          </p>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
          <input type="text" className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-purple-300"
            placeholder="Novedades de Estamply..." value={subject} onChange={e => setSubject(e.target.value)} />
        </div>

        {/* Body */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
          <textarea className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm outline-none focus:border-purple-300 resize-none"
            rows={8} placeholder="Escribí el contenido del email..." value={body} onChange={e => setBody(e.target.value)} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button onClick={handleSendTest} disabled={!subject || !body}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
            <Mail size={14} /> Enviar test a mi email
          </button>
          <button onClick={handleSendAll} disabled={!subject || !body || recipientCount === 0 || sending}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: '#6C5CE7' }}>
            <Send size={14} /> {sending ? 'Enviando...' : sent ? 'Enviado ✓' : `Enviar a ${recipientCount} talleres`}
          </button>
        </div>

        {/* Warning */}
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
          <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-700">
            El envío real de emails requiere conectar Resend o SendGrid en Configuración.
            Por ahora esta funcionalidad es solo visual.
          </p>
        </div>
      </div>

      {/* Sent emails history */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Emails enviados</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Mail size={24} className="text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No hay emails enviados todavía.</p>
          <p className="text-xs text-gray-300 mt-1">El historial aparecerá acá cuando envíes tu primer email.</p>
        </div>
      </div>
    </div>
  )
}

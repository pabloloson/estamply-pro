'use client'

import { FileDown, Phone, Mail, MapPin, Globe, AtSign } from 'lucide-react'

const TECHNIQUE_LABELS: Record<string, string> = {
  subli: 'Sublimación', dtf: 'DTF Textil', dtf_uv: 'DTF UV', vinyl: 'Vinilo', serigrafia: 'Serigrafía',
}
const TECHNIQUE_COLORS: Record<string, string> = {
  subli: '#6C5CE7', dtf: '#E17055', dtf_uv: '#00B894', vinyl: '#E84393', serigrafia: '#FDCB6E',
}

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

interface Item {
  tecnica: string; nombre: string; cantidad: number; precioUnit: number; precioSinDesc: number; subtotal: number
}

interface Props {
  presupuesto: {
    codigo: string; numero: string; fecha: string; validez_dias: number
    client_name: string | null; items: Item[]; total: number
    condiciones: string | null; business_profile: Record<string, string | null>
  }
}

export default function PublicQuoteView({ presupuesto }: Props) {
  const { codigo, numero, fecha, validez_dias, client_name, items, total, condiciones, business_profile: biz } = presupuesto
  const displayNumber = (numero && numero !== '0') ? numero : codigo
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  const displayName = biz?.business_name || biz?.workshop_name || 'Mi Taller'

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>

      <div className="min-h-screen" style={{ background: '#F4F5F8' }}>
        <div className="max-w-3xl mx-auto px-4 py-8">
          {/* Download button */}
          <div className="flex justify-center mb-4 no-print">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg"
              style={{ background: '#6C5CE7', boxShadow: '0 4px 20px rgba(108,92,231,0.35)' }}>
              <FileDown size={16} /> Descargar PDF
            </button>
          </div>

          {/* Quote document */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #6C5CE7, #a29bfe)' }} />

            {/* Header */}
            <div className="px-8 pt-7 pb-5 flex items-start justify-between gap-6 border-b border-gray-100">
              <div className="flex items-start gap-4">
                {biz?.business_logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={biz.business_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl flex-shrink-0" />
                ) : displayName ? (
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #6C5CE7, #a29bfe)' }}>
                    <span className="text-white font-black text-xl">{displayName[0].toUpperCase()}</span>
                  </div>
                ) : null}
                <div>
                  <h2 className="font-black text-gray-900 text-lg leading-tight">{displayName || 'Taller'}</h2>
                  {biz?.business_cuit && <p className="text-xs text-gray-500 mt-0.5">CUIT: {biz.business_cuit}</p>}
                  <div className="mt-2 space-y-0.5">
                    {biz?.business_address && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={10} />{biz.business_address}</p>}
                    {biz?.business_phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={10} />{biz.business_phone}</p>}
                    {biz?.business_email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={10} />{biz.business_email}</p>}
                    {biz?.business_instagram && <p className="text-xs text-gray-500 flex items-center gap-1.5"><AtSign size={10} />{biz.business_instagram}</p>}
                    {biz?.business_website && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Globe size={10} />{biz.business_website}</p>}
                  </div>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Presupuesto</p>
                <p className="text-2xl font-black" style={{ color: '#6C5CE7' }}>#{displayNumber}</p>
                <p className="text-xs text-gray-500 mt-2">{fechaStr}</p>
                <p className="text-xs text-gray-400 mt-0.5">Válido por {validez_dias} días</p>
              </div>
            </div>

            {/* Client */}
            {client_name && (
              <div className="px-8 py-4 border-b border-gray-100" style={{ background: '#FAFAFA' }}>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</p>
                <p className="font-bold text-gray-800">{client_name}</p>
              </div>
            )}

            {/* Items */}
            <div className="px-8 py-5">
              <table className="w-full">
                <thead><tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Técnica</th>
                  <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Descripción</th>
                  <th className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Cant.</th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">P. Unit.</th>
                  <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Subtotal</th>
                </tr></thead>
                <tbody>
                  {(items as Item[]).map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                      <td className="py-3 pr-3 align-top">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap"
                          style={{ background: `${TECHNIQUE_COLORS[item.tecnica] || '#6C5CE7'}18`, color: TECHNIQUE_COLORS[item.tecnica] || '#6C5CE7' }}>
                          {TECHNIQUE_LABELS[item.tecnica] || item.tecnica}
                        </span>
                      </td>
                      <td className="py-3 pr-3 align-top"><p className="font-semibold text-gray-800 text-sm">{item.nombre}</p></td>
                      <td className="py-3 text-center text-sm text-gray-600 font-medium align-top">{item.cantidad}</td>
                      <td className="py-3 text-right text-sm text-gray-600 align-top">
                        {item.precioSinDesc > item.precioUnit + 1 && <span className="text-xs text-gray-400 line-through mr-1">{fmt(item.precioSinDesc)}</span>}
                        {fmt(item.precioUnit)}
                      </td>
                      <td className="py-3 text-right font-bold text-gray-800 align-top">{fmt(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 flex justify-end">
                <div className="w-60 space-y-1.5">
                  <div className="flex justify-between text-sm text-gray-500"><span>Subtotal</span><span className="font-medium text-gray-700">{fmt(total)}</span></div>
                  <div className="flex justify-between pt-2" style={{ borderTop: '2px solid #6C5CE7' }}>
                    <span className="font-black text-gray-900">TOTAL</span>
                    <span className="font-black text-xl" style={{ color: '#6C5CE7' }}>{fmt(total)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Condiciones */}
            {condiciones && (
              <div className="px-8 py-4 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Condiciones</p>
                <div className="text-xs text-gray-500 whitespace-pre-line leading-relaxed">{condiciones}</div>
              </div>
            )}

            {/* Footer */}
            <div className="px-8 py-3 flex items-center justify-center" style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
              <a href="https://estamply.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-gray-300 hover:text-gray-400 transition-colors">
                <img src="/logo-icon.png" alt="" className="w-3 h-3 opacity-40" />
                Generado con Estamply
              </a>
            </div>
            <div className="h-1" style={{ background: 'linear-gradient(90deg, #6C5CE7, #a29bfe)' }} />
          </div>

          {/* Bottom download */}
          <div className="flex justify-center mt-4 no-print">
            <button onClick={() => window.print()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 shadow-sm">
              <FileDown size={15} /> Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

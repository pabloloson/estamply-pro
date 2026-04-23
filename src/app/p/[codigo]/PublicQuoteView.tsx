'use client'

import { FileDown, Phone, Mail, MapPin, Globe, AtSign } from 'lucide-react'

function fmt(n: number) { return `$${Math.round(n).toLocaleString('es-AR')}` }

interface Item {
  tecnica: string; nombre: string; cantidad: number; precioUnit: number; precioSinDesc: number; subtotal: number
  variantName?: string; variantBreakdown?: Record<string, number>; origen?: string
}

interface Props {
  presupuesto: {
    codigo: string; numero: string; fecha: string; validez_dias: number
    client_name: string | null; items: Item[]; total: number; origen?: string
    condiciones: string | null; business_profile: Record<string, string | null>
    notas?: string | null; medio_pago_nombre?: string | null
  }
}

export default function PublicQuoteView({ presupuesto }: Props) {
  const { codigo, numero, fecha, validez_dias, client_name, items, total, condiciones, business_profile: biz, origen, notas, medio_pago_nombre } = presupuesto
  const displayNumber = (numero && numero !== '0') ? numero : codigo
  const fechaStr = new Date(fecha).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
  const displayName = biz?.business_name || biz?.workshop_name || 'Mi Taller'
  const isWeb = origen === 'catalogo_web'

  // Items from web catalog don't have meaningful tecnica
  const showTechCol = !isWeb && (items as Item[]).some(item => item.tecnica && item.tecnica !== 'manual' && item.tecnica !== 'catalogo')

  function handlePrintPdf() {
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return

    const addrParts = [biz?.business_address, biz?.city, biz?.province, biz?.postal_code].filter(Boolean)
    const bizCuit = biz?.business_cuit ? `<div style="font-size:12px;color:#666">${biz.business_cuit}</div>` : ''
    const bizAddr = addrParts.length > 0 ? `<div style="font-size:12px;color:#666">${addrParts.join(', ')}</div>` : ''
    const bizPhone = biz?.business_phone ? `<div style="font-size:12px;color:#666">${biz.business_phone}</div>` : ''
    const bizEmail = biz?.business_email ? `<div style="font-size:12px;color:#666">${biz.business_email}</div>` : ''

    const clientHtml = client_name ? `
      <div style="margin-bottom:24px;padding:12px 16px;background:#f9fafb;border-radius:6px">
        <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Cliente</div>
        <div style="font-size:15px;font-weight:600">${client_name}</div>
        ${notas ? `<div style="font-size:12px;color:#666;margin-top:2px">${notas}</div>` : ''}
        ${medio_pago_nombre ? `<div style="font-size:11px;color:#999;margin-top:2px">Medio de pago: ${medio_pago_nombre}</div>` : ''}
      </div>` : ''

    const itemRows = (items as Item[]).map(item => {
      const breakdownText = item.variantBreakdown ? Object.entries(item.variantBreakdown as Record<string, number>).filter(([,v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(' · ') : ''
      return `<tr>
        <td style="padding:10px 8px"><div style="font-weight:500">${item.nombre}</div>${breakdownText ? `<div style="font-size:10px;color:#999;margin-top:2px">${breakdownText}</div>` : ''}</td>
        <td style="padding:10px 8px;text-align:center">${item.cantidad}</td>
        <td style="padding:10px 8px;text-align:right">${fmt(item.precioUnit)}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:600">${fmt(item.subtotal)}</td>
      </tr>`
    }).join('')

    const condLines = (() => {
      if (!condiciones) return ''
      let lines: string[] = []
      if (condiciones.startsWith('[')) { try { lines = JSON.parse(condiciones) } catch { lines = condiciones.split('\n').filter(Boolean) } }
      else { lines = condiciones.split('\n').filter(Boolean) }
      return lines.map(c => `<div>${c.startsWith('·') ? c : `· ${c}`}</div>`).join('')
    })()

    const socials: string[] = []
    if (biz?.business_website) socials.push(`<span>🌐 ${biz.business_website}</span>`)
    if (biz?.business_instagram) socials.push(`<span>📷 ${biz.business_instagram}</span>`)
    if (biz?.facebook) socials.push(`<span>📘 ${biz.facebook}</span>`)
    if (biz?.tiktok) socials.push(`<span>♪ ${biz.tiktok}</span>`)
    if (biz?.youtube) socials.push(`<span>▶ ${biz.youtube}</span>`)

    doc.open()
    doc.write(`<!DOCTYPE html><html><head><title>Presupuesto #${displayNumber}</title>
    <style>
      body{font-family:Arial,Helvetica,sans-serif;color:#000;margin:0;padding:20mm}
      table{width:100%;border-collapse:collapse}
      thead tr{border-bottom:2px solid #e5e7eb}
      tbody tr{border-bottom:1px solid #f3f4f6}
      th{font-size:11px;text-transform:uppercase;color:#999;font-weight:600;padding:10px 8px;text-align:left}
      @page{size:A4;margin:0}
    </style></head><body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #333">
        <div style="display:flex;align-items:flex-start;gap:12px">
          ${biz?.business_logo_url ? `<img src="${biz.business_logo_url}" alt="" style="width:56px;height:56px;object-fit:contain;border-radius:8px" />` : ''}
          <div>
            <div style="font-size:22px;font-weight:800">${displayName}</div>
            ${bizCuit}${bizAddr}${bizPhone}${bizEmail}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:11px;color:#999;text-transform:uppercase;letter-spacing:2px">Presupuesto</div>
          <div style="font-size:24px;font-weight:800;color:#000">#${displayNumber}</div>
          <div style="font-size:13px;color:#666;margin-top:4px">${fechaStr}</div>
          <div style="font-size:12px;color:#999">Válido por ${validez_dias} días</div>
        </div>
      </div>
      ${clientHtml}
      <table style="margin-bottom:24px">
        <thead><tr><th>Descripción</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. Unit.</th><th style="text-align:right">Subtotal</th></tr></thead>
        <tbody>${itemRows}</tbody>
      </table>
      <div style="display:flex;justify-content:flex-end;margin-bottom:32px">
        <div style="width:240px">
          <div style="display:flex;justify-content:space-between;padding:6px 0;font-size:14px;color:#666"><span>Subtotal</span><span>${fmt(total)}</span></div>
          <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:20px;font-weight:800;border-top:2px solid #000"><span>TOTAL</span><span>${fmt(total)}</span></div>
        </div>
      </div>
      ${condLines ? `<div style="padding:16px;background:#f9fafb;border-radius:6px;font-size:12px;color:#666;margin-bottom:32px"><div style="font-weight:600;margin-bottom:8px;font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#999">Condiciones</div>${condLines}</div>` : ''}
      <div style="display:flex;justify-content:space-between;margin:48px 32px 32px;gap:48px">
        <div style="flex:1;text-align:center"><div style="border-bottom:1px solid #333;margin-bottom:8px;height:40px"></div><div style="font-size:12px;color:#666">Firma del taller</div></div>
        <div style="flex:1;text-align:center"><div style="border-bottom:1px solid #333;margin-bottom:8px;height:40px"></div><div style="font-size:12px;color:#666">Firma del cliente</div></div>
      </div>
      ${socials.length > 0 ? `<div style="text-align:center;font-size:11px;color:#888;padding:16px 0;border-top:1px solid #e5e7eb;margin-top:24px"><div style="display:flex;flex-wrap:wrap;justify-content:center;gap:16px">${socials.join('')}</div></div>` : ''}
      <div style="text-align:center;font-size:11px;color:#ccc;padding-top:16px;border-top:1px solid #eee">Generado con Estamply · estamply.app</div>
    </body></html>`)
    doc.close()
    iframe.contentWindow?.focus()
    iframe.contentWindow?.print()
    setTimeout(() => document.body.removeChild(iframe), 2000)
  }

  return (
    <div className="min-h-screen" style={{ background: '#F4F5F8' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Download button */}
        <div className="flex justify-center mb-4">
          <button onClick={handlePrintPdf}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-lg"
            style={{ background: '#0F766E', boxShadow: '0 4px 20px rgba(15,118,110,0.35)' }}>
            <FileDown size={16} /> Descargar PDF
          </button>
        </div>

        {/* Quote document — on-screen preview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="h-2" style={{ background: 'linear-gradient(90deg, #0F766E, #a29bfe)' }} />

          {/* Header */}
          <div className="px-8 pt-7 pb-5 flex items-start justify-between gap-6 border-b border-gray-100">
            <div className="flex items-start gap-4">
              {biz?.business_logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={biz.business_logo_url} alt="Logo" className="w-16 h-16 object-contain rounded-xl flex-shrink-0" />
              ) : displayName ? (
                <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0F766E, #a29bfe)' }}>
                  <span className="text-white font-black text-xl">{displayName[0].toUpperCase()}</span>
                </div>
              ) : null}
              <div>
                <h2 className="font-black text-gray-900 text-lg leading-tight">{displayName || 'Taller'}</h2>
                {biz?.business_cuit && <p className="text-xs text-gray-500 mt-0.5">{biz.business_cuit}</p>}
                <div className="mt-2 space-y-0.5">
                  {(biz?.business_address || biz?.city) && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={10} />{[biz.business_address, biz.city, biz.province, biz.postal_code].filter(Boolean).join(', ')}</p>}
                  {biz?.business_phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={10} />{biz.business_phone}</p>}
                  {biz?.business_email && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Mail size={10} />{biz.business_email}</p>}
                  {biz?.business_instagram && <p className="text-xs text-gray-500 flex items-center gap-1.5"><AtSign size={10} />{biz.business_instagram}</p>}
                  {biz?.business_website && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Globe size={10} />{biz.business_website}</p>}
                </div>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-0.5">Presupuesto</p>
              <p className="text-2xl font-black text-gray-900">#{displayNumber}</p>
              <p className="text-xs text-gray-500 mt-2">{fechaStr}</p>
              <p className="text-xs text-gray-400 mt-0.5">Válido por {validez_dias} días</p>
            </div>
          </div>

          {/* Client */}
          {client_name && (
            <div className="px-8 py-4 border-b border-gray-100" style={{ background: '#FAFAFA' }}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Cliente</p>
              <p className="font-bold text-gray-800">{client_name}</p>
              {notas && <p className="text-xs text-gray-500 mt-1">{notas}</p>}
              {medio_pago_nombre && <p className="text-xs text-gray-400 mt-0.5">Medio de pago: {medio_pago_nombre}</p>}
            </div>
          )}

          {/* Items */}
          <div className="px-8 py-5">
            <table className="w-full">
              <thead><tr style={{ borderBottom: '2px solid #F3F4F6' }}>
                {showTechCol && <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Técnica</th>}
                <th className="text-left text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Descripción</th>
                <th className="text-center text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Cant.</th>
                <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">P. Unit.</th>
                <th className="text-right text-xs font-bold uppercase tracking-wider text-gray-400 pb-3">Subtotal</th>
              </tr></thead>
              <tbody>
                {(items as Item[]).map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F9FAFB' }}>
                    {showTechCol && <td className="py-3 pr-3 align-top"><span className="text-xs text-gray-500">{item.tecnica}</span></td>}
                    <td className="py-3 pr-3 align-top">
                      <p className="font-semibold text-gray-800 text-sm">{item.nombre}</p>
                      {item.variantBreakdown && Object.values(item.variantBreakdown as Record<string, number>).some(v => v > 0) && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {Object.entries(item.variantBreakdown as Record<string, number>).filter(([,v]) => v > 0).map(([k, v]) => `${k} ×${v}`).join(' · ')}
                        </p>
                      )}
                    </td>
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
                <div className="flex justify-between pt-2 border-t-2 border-gray-900">
                  <span className="font-black text-gray-900">TOTAL</span>
                  <span className="font-black text-xl text-gray-900">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Condiciones */}
          {condiciones && (
            <div className="px-8 py-4 border-t border-gray-100">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2">Condiciones</p>
              <div className="text-xs text-gray-500 leading-relaxed">{(() => {
                let lines: string[] = []
                if (condiciones!.startsWith('[')) { try { lines = JSON.parse(condiciones!) } catch { lines = condiciones!.split('\n').filter(Boolean) } }
                else { lines = condiciones!.split('\n').filter(Boolean) }
                return lines.map((c, i) => <div key={i}>· {c.replace(/^[·\-•]\s*/, '')}</div>)
              })()}</div>
            </div>
          )}

          {/* Footer */}
          <div className="px-8 py-3 flex items-center justify-center" style={{ borderTop: '1px solid #F3F4F6', background: '#FAFAFA' }}>
            <a href="https://estamply.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-gray-300 hover:text-gray-400 transition-colors">
              <img src="/logo-icon.png" alt="" className="w-3 h-3 opacity-40" />
              Generado con Estamply
            </a>
          </div>
          <div className="h-1" style={{ background: 'linear-gradient(90deg, #0F766E, #a29bfe)' }} />
        </div>

        {/* Bottom download */}
        <div className="flex justify-center mt-4">
          <button onClick={handlePrintPdf}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 border border-gray-200 bg-white hover:bg-gray-50 shadow-sm">
            <FileDown size={15} /> Descargar PDF
          </button>
        </div>
      </div>
    </div>
  )
}

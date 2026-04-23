'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'

interface Props {
  value: string
  onChange: (url: string) => void
  type?: 'products' | 'logos'
  maxSize?: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }

export default function ImageUpload({ value, onChange, type = 'products', maxSize = 5 * 1024 * 1024, className = '', size = 'md' }: Props) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError('')
    if (file.size > maxSize) { setError(`Máximo ${Math.round(maxSize / 1024 / 1024)}MB`); return }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Solo JPG, PNG o WebP'); return }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = await res.json()
      if (json.error) { setError(json.error); return }
      onChange(json.url || json.publicUrl)
    } catch {
      setError('Error al subir')
    } finally {
      setUploading(false)
      if (ref.current) ref.current.value = ''
    }
  }

  async function handleRemove() {
    if (!value) return
    try {
      await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value }),
      })
    } catch { /* ignore delete errors */ }
    onChange('')
  }

  return (
    <div className={`relative inline-block ${className}`}>
      {value ? (
        <div className={`${SIZES[size]} rounded-xl overflow-hidden border border-gray-200 group relative`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
          <button type="button" onClick={handleRemove}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <X size={16} className="text-white" />
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} disabled={uploading}
          className={`${SIZES[size]} rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center hover:border-teal-300 transition-colors`}>
          {uploading
            ? <Loader2 size={18} className="text-teal-500 animate-spin" />
            : <Upload size={18} className="text-gray-300" />}
        </button>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      {error && <p className="text-[10px] text-red-500 mt-1 absolute -bottom-4 left-0 whitespace-nowrap">{error}</p>}
    </div>
  )
}

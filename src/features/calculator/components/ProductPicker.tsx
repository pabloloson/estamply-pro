'use client'

import { useState, useRef, useEffect } from 'react'
import { Search, ChevronDown } from 'lucide-react'

interface ProductPickerProps {
  products: Array<{ id: string; name: string }>
  value: string
  onChange: (id: string) => void
}

export default function ProductPicker({ products, value, onChange }: ProductPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const [highlightIdx, setHighlightIdx] = useState(0)

  const selectedName = products.find(p => p.id === value)?.name ?? ''

  const filtered = query
    ? products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()))
    : products

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset highlight when filtered list changes
  useEffect(() => { setHighlightIdx(0) }, [query])

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || !listRef.current) return
    const el = listRef.current.children[highlightIdx] as HTMLElement
    el?.scrollIntoView({ block: 'nearest' })
  }, [highlightIdx, open])

  function handleSelect(id: string) {
    onChange(id)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { setOpen(true); e.preventDefault() }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIdx(i => Math.min(i + 1, filtered.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIdx(i => Math.max(i - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filtered[highlightIdx]) handleSelect(filtered[highlightIdx].id)
        break
      case 'Escape':
        setOpen(false)
        setQuery('')
        break
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        className="input-base flex items-center gap-2 cursor-text"
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }}
      >
        <Search size={14} className="text-gray-400 flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400"
          placeholder="Buscar producto..."
          value={open ? query : selectedName}
          onChange={e => { setQuery(e.target.value); if (!open) setOpen(true) }}
          onFocus={() => { setOpen(true); setQuery('') }}
          onKeyDown={handleKeyDown}
          readOnly={!open}
        />
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div
          ref={listRef}
          className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-gray-200 shadow-lg max-h-52 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sin resultados</p>
          ) : (
            filtered.map((p, i) => (
              <button
                key={p.id}
                type="button"
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  i === highlightIdx ? 'bg-teal-50' : 'hover:bg-gray-50'
                } ${p.id === value ? 'font-semibold text-teal-800' : 'text-gray-700'}`}
                onMouseEnter={() => setHighlightIdx(i)}
                onClick={() => handleSelect(p.id)}
              >
                {p.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

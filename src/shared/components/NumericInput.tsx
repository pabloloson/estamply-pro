'use client'

import { useState, useEffect } from 'react'

interface NumericInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  className?: string
  errorMessage?: string
}

export default function NumericInput({ value, onChange, min, className = 'input-base', errorMessage }: NumericInputProps) {
  const [display, setDisplay] = useState(String(value))
  const [error, setError] = useState('')

  useEffect(() => {
    setDisplay(String(value))
    setError('')
  }, [value])

  return (
    <div>
      <input
        type="text"
        inputMode="decimal"
        className={`${className}${error ? ' ring-2 ring-red-300 border-red-300' : ''}`}
        value={display}
        onFocus={e => e.target.select()}
        onChange={e => {
          const raw = e.target.value.replace(/[^0-9.,]/g, '')
          setDisplay(raw)
          // Clear error while typing
          if (error) setError('')
        }}
        onBlur={() => {
          let num = parseFloat(display.replace(',', '.')) || 0
          if (min !== undefined && num < min) {
            setError(errorMessage || `Mínimo: ${min}`)
            num = min
          } else {
            setError('')
          }
          setDisplay(String(num))
          onChange(num)
        }}
      />
      {error && <p className="text-[10px] text-red-500 font-medium mt-0.5">{error}</p>}
    </div>
  )
}

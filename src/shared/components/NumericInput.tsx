'use client'

import { useState, useEffect } from 'react'

interface NumericInputProps {
  value: number
  onChange: (v: number) => void
  min?: number
  className?: string
}

export default function NumericInput({ value, onChange, min, className = 'input-base' }: NumericInputProps) {
  const [display, setDisplay] = useState(String(value))

  useEffect(() => {
    setDisplay(String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      className={className}
      value={display}
      onFocus={e => e.target.select()}
      onChange={e => {
        const raw = e.target.value.replace(/[^0-9.,]/g, '')
        setDisplay(raw)
      }}
      onBlur={() => {
        let num = parseFloat(display.replace(',', '.')) || 0
        if (min !== undefined && num < min) num = min
        setDisplay(String(num))
        onChange(num)
      }}
    />
  )
}

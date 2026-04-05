'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { type ManoDeObraConfig, computeAutoMo, getMoRuleLabel } from '@/features/presupuesto/types'

interface UseManoDeObraProps {
  config: ManoDeObraConfig
  timePerUnit: number
  costoTotal: number
  currentMo: number
  merma: number
  margin: number
  setMo: (v: number) => void
}

export function useManoDeObra({
  config,
  timePerUnit,
  costoTotal,
  currentMo,
  merma,
  margin,
  setMo,
}: UseManoDeObraProps) {
  const [isOverride, setIsOverride] = useState(false)
  const prevConfigRef = useRef(config)

  // Reset override when config mode changes
  useEffect(() => {
    if (prevConfigRef.current.modo !== config.modo) {
      setIsOverride(false)
    }
    prevConfigRef.current = config
  }, [config])

  // Auto-compute MO when not overridden
  useEffect(() => {
    if (isOverride) return
    const auto = computeAutoMo(config, timePerUnit, costoTotal, currentMo, merma, margin)
    const rounded = Math.round(auto * 100) / 100
    if (Math.abs(rounded - currentMo) > 0.01) {
      setMo(rounded)
    }
  }, [config, timePerUnit, costoTotal, currentMo, merma, margin, isOverride, setMo])

  const handleMoChange = useCallback((val: number) => {
    setIsOverride(true)
    setMo(val)
  }, [setMo])

  const resetOverride = useCallback(() => {
    setIsOverride(false)
  }, [])

  const ruleLabel = isOverride ? 'Manual' : getMoRuleLabel(config)
  const hasConfig = config.sueldo_mensual > 0 || config.monto_por_unidad > 0 || config.porcentaje_comision > 0

  return { isOverride, handleMoChange, resetOverride, ruleLabel, hasConfig }
}

'use client'

import { useCalculator } from '@/features/calculator/hooks/useCalculator'
import { CalculatorForm } from '@/features/calculator/components/CalculatorForm'
import { PriceTicket } from '@/features/calculator/components/PriceTicket'

export default function CalculatorPage() {
  const calc = useCalculator()

  if (calc.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Calculadora</h1>
        <p className="text-gray-500 text-sm mt-1">Calculá el precio exacto de tu trabajo</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left: Form */}
        <div className="card p-6 lg:w-[420px] flex-shrink-0">
          <CalculatorForm
            products={calc.products}
            technique={calc.technique}
            setTechnique={calc.setTechnique}
            productId={calc.productId}
            setProductId={calc.setProductId}
            quantity={calc.quantity}
            setQuantity={calc.setQuantity}
            designWidth={calc.designWidth}
            setDesignWidth={calc.setDesignWidth}
            designHeight={calc.designHeight}
            setDesignHeight={calc.setDesignHeight}
            margin={calc.margin}
            setMargin={calc.setMargin}
            merma={calc.merma}
            setMerma={calc.setMerma}
            peelTime={calc.peelTime}
            setPeelTime={calc.setPeelTime}
          />
        </div>

        {/* Right: Ticket */}
        <div className="flex-1 flex">
          <PriceTicket
            result={calc.result}
            technique={calc.technique}
            quantity={calc.quantity}
            designWidth={calc.designWidth}
            designHeight={calc.designHeight}
          />
        </div>
      </div>
    </div>
  )
}

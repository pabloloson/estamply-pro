import { prisma } from './db/prisma'

/**
 * Seeds demo data for a new workshop based on selected techniques.
 * All records are created with isDemo: true so they can be cleaned up later.
 */
export async function seedDemoData(userId: string, techniques: string[]) {
  // Check if demo data already exists for this user
  const existing = await prisma.product.findFirst({ where: { userId, isDemo: true } })
  if (existing) return // Don't seed twice

  // ── Suppliers ──
  const suppliers: Record<string, string> = {}
  const supplierData = [
    { name: 'Sublishop', notes: 'Equipamiento y máquinas' },
    { name: 'Todo insumos', notes: 'Papel, tinta, film' },
    { name: 'Don Camiseta', notes: 'Remeras y textiles' },
    { name: 'El rey de las tazas', notes: 'Tazas y cerámica' },
    { name: 'Todo gorras', notes: 'Gorras y accesorios' },
  ]
  for (const s of supplierData) {
    const created = await prisma.supplier.create({
      data: { userId, name: s.name, notes: s.notes, isDemo: true },
    })
    suppliers[s.name] = created.id
  }

  // ── Categories ──
  const categories: Record<string, string> = {}
  for (const name of ['Textil', 'Tazas', 'Gorras']) {
    const created = await prisma.category.create({
      data: { userId, name, isDemo: true },
    })
    categories[name] = created.id
  }

  // ── Medios de pago (always created) ──
  await prisma.medioPago.createMany({
    data: [
      { userId, nombre: 'Efectivo', tipoAjuste: 'descuento', porcentaje: 5, activo: true, orden: 0, isDemo: true },
      { userId, nombre: 'Transferencia', tipoAjuste: 'sin_ajuste', porcentaje: 0, activo: true, orden: 1, isDemo: true },
      { userId, nombre: 'Tarjeta de crédito', tipoAjuste: 'recargo', porcentaje: 10, activo: true, orden: 2, isDemo: true },
    ],
  })

  // ── Sublimación data ──
  if (techniques.includes('subli')) {
    // Insumos
    const papel = await prisma.insumo.create({
      data: {
        userId, nombre: 'Papel para sublimar A4', tipo: 'papel',
        tecnicaAsociada: 'subli', moneda: 'USD', isDemo: true,
        supplierId: suppliers['Todo insumos'],
        config: { tipo: 'papel', formato: 'hojas', precio_resma: 7, hojas_resma: 100, ancho: 21, alto: 29.7, precio_rollo: 0, rollo_ancho: 61, rollo_largo: 100 },
      },
    })
    const tinta = await prisma.insumo.create({
      data: {
        userId, nombre: 'Kit de tintas para sublimar', tipo: 'tinta',
        tecnicaAsociada: 'subli', moneda: 'USD', isDemo: true,
        supplierId: suppliers['Todo insumos'],
        config: { tipo: 'tinta', precio: 100, rendimiento: 4000, unidad_rendimiento: 'hojas' },
      },
    })

    // Equipment
    const impresora = await prisma.equipment.create({
      data: {
        userId, name: 'Epson F170', type: 'printer_subli', clasificacion: 'impresora',
        cost: 450, lifespanUses: 20000, tecnicasSlugs: ['subli'], moneda: 'USD',
        marca: 'Epson', printTimeSec: 60, isDemo: true,
        assignedPaperId: papel.id, assignedInkId: tinta.id,
      },
    })
    const planchaPlana = await prisma.equipment.create({
      data: {
        userId, name: 'Plancha Plana 38x38', type: 'press_flat', clasificacion: 'plancha',
        cost: 450, lifespanUses: 20000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'USD', isDemo: true,
      },
    })
    const planchaTazas = await prisma.equipment.create({
      data: {
        userId, name: 'Plancha de tazas', type: 'press_mug', clasificacion: 'plancha',
        cost: 100, lifespanUses: 2000, tecnicasSlugs: ['subli'], moneda: 'USD', isDemo: true,
      },
    })
    const planchaGorras = await prisma.equipment.create({
      data: {
        userId, name: 'Plancha de gorras', type: 'press_cap', clasificacion: 'plancha',
        cost: 200, lifespanUses: 2000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'USD', isDemo: true,
      },
    })

    // Products
    await prisma.product.create({
      data: {
        userId, name: 'Camiseta', baseCost: 5, category: 'Textil', categoryId: categories['Textil'],
        pressEquipmentId: planchaPlana.id, printerEquipmentId: impresora.id,
        timeSubli: 45, timeDtf: 15, timeVinyl: 15, moneda: 'USD',
        variantName: 'Talle', variantOptions: ['S', 'M', 'L', 'XL', 'XXL'],
        supplierId: suppliers['Don Camiseta'], isDemo: true,
      },
    })
    await prisma.product.create({
      data: {
        userId, name: 'Taza blanca', baseCost: 2, category: 'Tazas', categoryId: categories['Tazas'],
        pressEquipmentId: planchaTazas.id, printerEquipmentId: impresora.id,
        timeSubli: 180, moneda: 'USD',
        supplierId: suppliers['El rey de las tazas'], isDemo: true,
      },
    })
    await prisma.product.create({
      data: {
        userId, name: 'Gorra trucker', baseCost: 1, category: 'Gorras', categoryId: categories['Gorras'],
        pressEquipmentId: planchaGorras.id, printerEquipmentId: impresora.id,
        timeSubli: 30, timeDtf: 15, timeVinyl: 15, moneda: 'USD',
        variantName: 'Color', variantOptions: ['Negra frente blanco', 'Roja frente blanco', 'Negra completa', 'Roja completa'],
        supplierId: suppliers['Todo gorras'], isDemo: true,
      },
    })

    // Update tecnica config with demo settings
    await prisma.tecnica.updateMany({
      where: { userId, slug: 'subli' },
      data: {
        config: {
          tipo: 'subli', modo: 'propia', margen_seguridad: 0.5,
          desperdicio_pct: 5, pedido_minimo: 1, tiempo_preparacion: 15,
          descuento_override: false, descuentos: [
            { desde: 1, hasta: 9, porcentaje: 0 },
            { desde: 10, hasta: 49, porcentaje: 0.05 },
            { desde: 50, hasta: 99, porcentaje: 0.10 },
            { desde: 100, hasta: 9999, porcentaje: 0.15 },
          ],
        },
        equipmentIds: [impresora.id],
        insumoIds: [papel.id, tinta.id],
      },
    })
  }
}

/**
 * Removes all demo data for a user.
 */
export async function cleanDemoData(userId: string) {
  await Promise.all([
    prisma.product.deleteMany({ where: { userId, isDemo: true } }),
    prisma.equipment.deleteMany({ where: { userId, isDemo: true } }),
    prisma.insumo.deleteMany({ where: { userId, isDemo: true } }),
    prisma.supplier.deleteMany({ where: { userId, isDemo: true } }),
    prisma.category.deleteMany({ where: { userId, isDemo: true } }),
    prisma.medioPago.deleteMany({ where: { userId, isDemo: true } }),
  ])
}

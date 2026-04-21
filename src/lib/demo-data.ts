import { prisma } from './db/prisma'

/**
 * Seeds demo data for a new workshop based on selected techniques.
 * All records are created with isDemo: true so they can be cleaned up later.
 * Uses findOrCreate pattern to avoid duplicates when multiple techniques share resources.
 */
export async function seedDemoData(userId: string, techniques: string[]) {
  const existing = await prisma.product.findFirst({ where: { userId, isDemo: true } })
  if (existing) return

  // ── Helpers: find-or-create to avoid duplicates ──
  const supplierCache: Record<string, string> = {}
  async function getSupplier(name: string, notes: string) {
    if (supplierCache[name]) return supplierCache[name]
    const found = await prisma.supplier.findFirst({ where: { userId, name, isDemo: true } })
    if (found) { supplierCache[name] = found.id; return found.id }
    const created = await prisma.supplier.create({ data: { userId, name, notes, isDemo: true } })
    supplierCache[name] = created.id
    return created.id
  }

  const categoryCache: Record<string, string> = {}
  async function getCategory(name: string) {
    if (categoryCache[name]) return categoryCache[name]
    const found = await prisma.category.findFirst({ where: { userId, name, isDemo: true } })
    if (found) { categoryCache[name] = found.id; return found.id }
    const created = await prisma.category.create({ data: { userId, name, isDemo: true } })
    categoryCache[name] = created.id
    return created.id
  }

  const equipCache: Record<string, string> = {}
  async function getEquipment(name: string, data: Record<string, unknown>) {
    if (equipCache[name]) return equipCache[name]
    const found = await prisma.equipment.findFirst({ where: { userId, name, isDemo: true } })
    if (found) { equipCache[name] = found.id; return found.id }
    const created = await prisma.equipment.create({ data: { userId, name, isDemo: true, ...data } as never })
    equipCache[name] = created.id
    return created.id
  }

  const productCache: Record<string, string> = {}
  async function getProduct(name: string, data: Record<string, unknown>) {
    if (productCache[name]) return productCache[name]
    const found = await prisma.product.findFirst({ where: { userId, name, isDemo: true } })
    if (found) { productCache[name] = found.id; return found.id }
    const created = await prisma.product.create({ data: { userId, name, isDemo: true, ...data } as never })
    productCache[name] = created.id
    return created.id
  }

  // ── Medios de pago (always, deduplicated) ──
  const existingMedios = await prisma.medioPago.findFirst({ where: { userId, isDemo: true } })
  if (!existingMedios) {
    await prisma.medioPago.createMany({
      data: [
        { userId, nombre: 'Efectivo', tipoAjuste: 'descuento', porcentaje: 5, activo: true, orden: 0, isDemo: true },
        { userId, nombre: 'Transferencia', tipoAjuste: 'sin_ajuste', porcentaje: 0, activo: true, orden: 1, isDemo: true },
        { userId, nombre: 'Tarjeta de crédito', tipoAjuste: 'recargo', porcentaje: 10, activo: true, orden: 2, isDemo: true },
      ],
    })
  }

  // ── Shared suppliers ──
  const sublishopId = await getSupplier('Sublishop', 'Equipamiento y máquinas')
  const todoInsumosId = await getSupplier('Todo insumos', 'Papel, tinta, film')
  const donCamisetaId = await getSupplier('Don Camiseta', 'Remeras y textiles')
  const reyTazasId = await getSupplier('El rey de las tazas', 'Tazas y cerámica')
  const todoGorrasId = await getSupplier('Todo gorras', 'Gorras y accesorios')
  const donImpresionesId = await getSupplier('Don impresiones', 'Servicio de impresión DTF')

  // ── Shared categories ──
  const catTextil = await getCategory('Textil')
  const catTazas = await getCategory('Tazas')
  const catGorras = await getCategory('Gorras')

  // ── Shared equipment (used by multiple techniques) ──
  let planchaPlanaId: string | null = null
  let planchaGorrasId: string | null = null
  let planchaTazasId: string | null = null
  let impresoraId: string | null = null

  // ══ SUBLIMACIÓN ══
  if (techniques.includes('subli')) {
    const papel = await prisma.insumo.create({
      data: {
        userId, nombre: 'Papel para sublimar A4', tipo: 'papel',
        tecnicaAsociada: 'subli', moneda: 'local', isDemo: true,
        supplierId: todoInsumosId,
        config: { tipo: 'papel', formato: 'hojas', precio_resma: 12000, hojas_resma: 100, ancho: 21, alto: 29.7, precio_rollo: 0, rollo_ancho: 61, rollo_largo: 100 },
      },
    })
    const tinta = await prisma.insumo.create({
      data: {
        userId, nombre: 'Kit de tintas para sublimar', tipo: 'tinta',
        tecnicaAsociada: 'subli', moneda: 'local', isDemo: true,
        supplierId: todoInsumosId,
        config: { tipo: 'tinta', precio: 220000, rendimiento: 4000, unidad_rendimiento: 'hojas' },
      },
    })

    impresoraId = await getEquipment('Epson F170', {
      type: 'printer_subli', clasificacion: 'impresora',
      cost: 600000, lifespanUses: 20000, tecnicasSlugs: ['subli'], moneda: 'local',
      marca: 'Epson', printTimeSec: 65, assignedPaperId: papel.id, assignedInkId: tinta.id,
    })
    planchaPlanaId = await getEquipment('Plancha Plana 38x38', {
      type: 'press_flat', clasificacion: 'plancha',
      cost: 600000, lifespanUses: 20000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'local',
    })
    planchaTazasId = await getEquipment('Plancha de tazas', {
      type: 'press_mug', clasificacion: 'plancha',
      cost: 200000, lifespanUses: 2000, tecnicasSlugs: ['subli'], moneda: 'local',
    })
    planchaGorrasId = await getEquipment('Plancha de gorras', {
      type: 'press_cap', clasificacion: 'plancha',
      cost: 30000, lifespanUses: 2000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'local',
    })

    await getProduct('Camiseta', {
      baseCost: 10000, category: 'Textil', categoryId: catTextil,
      pressEquipmentId: planchaPlanaId, printerEquipmentId: impresoraId,
      timeSubli: 45, timeDtf: 15, timeVinyl: 15, moneda: 'local',
      variantName: 'Talle', variantOptions: ['S', 'M', 'L', 'XL', 'XXL'],
      supplierId: donCamisetaId,
    })
    await getProduct('Taza blanca', {
      baseCost: 3000, category: 'Tazas', categoryId: catTazas,
      pressEquipmentId: planchaTazasId, printerEquipmentId: impresoraId,
      timeSubli: 180, moneda: 'local', supplierId: reyTazasId,
    })
    await getProduct('Gorra trucker', {
      baseCost: 2500, category: 'Gorras', categoryId: catGorras,
      pressEquipmentId: planchaGorrasId, printerEquipmentId: impresoraId,
      timeSubli: 30, timeDtf: 15, timeVinyl: 15, moneda: 'local',
      variantName: 'Color', variantOptions: ['Negra frente blanco', 'Roja frente blanco', 'Negra completa', 'Roja completa'],
      supplierId: todoGorrasId,
    })

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
        equipmentIds: [impresoraId],
        insumoIds: [papel.id, tinta.id],
      },
    })
  }

  // ══ DTF TEXTIL ══
  if (techniques.includes('dtf')) {
    // Shared equipment (creates only if not already created by subli)
    planchaPlanaId = planchaPlanaId || await getEquipment('Plancha Plana 38x38', {
      type: 'press_flat', clasificacion: 'plancha',
      cost: 600000, lifespanUses: 20000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'local',
    })
    planchaGorrasId = planchaGorrasId || await getEquipment('Plancha de gorras', {
      type: 'press_cap', clasificacion: 'plancha',
      cost: 30000, lifespanUses: 2000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'local',
    })

    // DTF-specific insumo: servicio tercerizado
    const servicioDtf = await prisma.insumo.create({
      data: {
        userId, nombre: 'Servicio de Impresión por metro DTF Textil', tipo: 'servicio_impresion',
        tecnicaAsociada: 'dtf', moneda: 'local', isDemo: true,
        supplierId: donImpresionesId,
        config: { tipo: 'servicio_impresion', precio_metro: 15000, ancho_material: 60, proveedor: 'Don impresiones' },
      },
    })

    // Shared products (creates only if not already created by subli)
    await getProduct('Camiseta', {
      baseCost: 10000, category: 'Textil', categoryId: catTextil,
      pressEquipmentId: planchaPlanaId,
      timeSubli: 45, timeDtf: 15, timeVinyl: 15, moneda: 'local',
      variantName: 'Talle', variantOptions: ['S', 'M', 'L', 'XL', 'XXL'],
      supplierId: donCamisetaId,
    })
    await getProduct('Gorra trucker', {
      baseCost: 2500, category: 'Gorras', categoryId: catGorras,
      pressEquipmentId: planchaGorrasId,
      timeSubli: 30, timeDtf: 15, timeVinyl: 15, moneda: 'local',
      variantName: 'Color', variantOptions: ['Negra frente blanco', 'Roja frente blanco', 'Negra completa', 'Roja completa'],
      supplierId: todoGorrasId,
    })

    // Update DTF technique config
    await prisma.tecnica.updateMany({
      where: { userId, slug: 'dtf' },
      data: {
        config: {
          tipo: 'dtf', modo: 'tercerizado', margen_seguridad: 0.5,
          desperdicio_pct: 5, pedido_minimo: 1, tiempo_preparacion: 15,
          descuento_override: false, descuentos: [
            { desde: 1, hasta: 9, porcentaje: 0 },
            { desde: 10, hasta: 49, porcentaje: 0.05 },
            { desde: 50, hasta: 99, porcentaje: 0.10 },
            { desde: 100, hasta: 9999, porcentaje: 0.15 },
          ],
        },
        insumoIds: [servicioDtf.id],
      },
    })
  }

  // ══ DTF UV ══
  if (techniques.includes('dtf_uv')) {
    // Shared product (reuses if subli already created it)
    planchaTazasId = planchaTazasId || await getEquipment('Plancha de tazas', {
      type: 'press_mug', clasificacion: 'plancha',
      cost: 200000, lifespanUses: 2000, tecnicasSlugs: ['subli'], moneda: 'local',
    })
    await getProduct('Taza blanca', {
      baseCost: 3000, category: 'Tazas', categoryId: catTazas,
      pressEquipmentId: planchaTazasId,
      timeSubli: 180, moneda: 'local', supplierId: reyTazasId,
    })

    // DTF UV-specific insumo
    const servicioDtfUv = await prisma.insumo.create({
      data: {
        userId, nombre: 'Servicio de Impresión por metro DTF UV', tipo: 'servicio_impresion',
        tecnicaAsociada: 'dtf_uv', moneda: 'local', isDemo: true,
        supplierId: donImpresionesId,
        config: { tipo: 'servicio_impresion', precio_metro: 18000, ancho_material: 30, proveedor: 'Don impresiones' },
      },
    })

    await prisma.tecnica.updateMany({
      where: { userId, slug: 'dtf_uv' },
      data: {
        config: {
          tipo: 'dtf_uv', modo: 'tercerizado', margen_seguridad: 0.5,
          desperdicio_pct: 5, pedido_minimo: 1, tiempo_preparacion: 15,
          descuento_override: false, descuentos: [
            { desde: 1, hasta: 9, porcentaje: 0 },
            { desde: 10, hasta: 49, porcentaje: 0.05 },
            { desde: 50, hasta: 99, porcentaje: 0.10 },
            { desde: 100, hasta: 9999, porcentaje: 0.15 },
          ],
        },
        insumoIds: [servicioDtfUv.id],
      },
    })
  }

  // ══ VINILO TEXTIL ══
  if (techniques.includes('vinyl')) {
    // New supplier
    const srViniloId = await getSupplier('El Sr. Vinilo', 'Vinilos textiles y autoadhesivos')

    // Shared equipment
    planchaPlanaId = planchaPlanaId || await getEquipment('Plancha Plana 38x38', {
      type: 'press_flat', clasificacion: 'plancha',
      cost: 600000, lifespanUses: 20000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'local',
    })
    planchaGorrasId = planchaGorrasId || await getEquipment('Plancha de gorras', {
      type: 'press_cap', clasificacion: 'plancha',
      cost: 30000, lifespanUses: 2000, tecnicasSlugs: ['subli', 'dtf', 'vinyl'], moneda: 'local',
    })

    // Plotter de corte (shared with vinyl_adhesivo)
    const plotterId = await getEquipment('Silhouette Cameo 5', {
      type: 'plotter_corte', clasificacion: 'plotter',
      cost: 800000, lifespanUses: 40000, tecnicasSlugs: ['vinyl', 'vinyl_adhesivo'], moneda: 'local',
      marca: 'Silhouette',
    })

    // Vinilo textil insumo
    const viniloTextil = await prisma.insumo.create({
      data: {
        userId, nombre: 'Vinilo textil económico', tipo: 'vinilo',
        tecnicaAsociada: 'vinyl', moneda: 'local', isDemo: true,
        supplierId: srViniloId,
        config: { tipo: 'vinilo', aplicacion: 'textil', acabado: 'Liso', precio_metro: 7000, ancho: 50, colores: ['Blanco', 'Negro', 'Rojo', 'Azul'] },
      },
    })

    // Shared products
    await getProduct('Camiseta', {
      baseCost: 10000, category: 'Textil', categoryId: catTextil,
      pressEquipmentId: planchaPlanaId,
      timeSubli: 45, timeDtf: 15, timeVinyl: 15, moneda: 'local',
      variantName: 'Talle', variantOptions: ['S', 'M', 'L', 'XL', 'XXL'],
      supplierId: donCamisetaId,
    })
    await getProduct('Gorra trucker', {
      baseCost: 2500, category: 'Gorras', categoryId: catGorras,
      pressEquipmentId: planchaGorrasId,
      timeSubli: 30, timeDtf: 15, timeVinyl: 15, moneda: 'local',
      variantName: 'Color', variantOptions: ['Negra frente blanco', 'Roja frente blanco', 'Negra completa', 'Roja completa'],
      supplierId: todoGorrasId,
    })

    // Technique config
    await prisma.tecnica.updateMany({
      where: { userId, slug: 'vinyl' },
      data: {
        config: {
          tipo: 'vinyl', modo: 'propia', margen_seguridad: 2,
          desperdicio_pelado_pct: 10, pedido_minimo: 1, tiempo_preparacion: 20,
          descuento_override: false, descuentos: [
            { desde: 1, hasta: 9, porcentaje: 0 },
            { desde: 10, hasta: 49, porcentaje: 0.05 },
            { desde: 50, hasta: 99, porcentaje: 0.10 },
            { desde: 100, hasta: 9999, porcentaje: 0.15 },
          ],
        },
        equipmentIds: [plotterId],
        insumoIds: [viniloTextil.id],
      },
    })
  }

  // ══ VINILO AUTOADHESIVO ══
  if (techniques.includes('vinyl_adhesivo')) {
    const srViniloId = await getSupplier('El Sr. Vinilo', 'Vinilos textiles y autoadhesivos')
    const donBotellasId = await getSupplier('Don botellas', 'Botellas y envases')

    // Shared plotter (reuses vinyl's if exists)
    const plotterId = await getEquipment('Silhouette Cameo 5', {
      type: 'plotter_corte', clasificacion: 'plotter',
      cost: 800000, lifespanUses: 40000, tecnicasSlugs: ['vinyl', 'vinyl_adhesivo'], moneda: 'local',
      marca: 'Silhouette',
    })

    // New category
    const catBotellas = await getCategory('Botellas')

    // Vinilo autoadhesivo insumo
    const viniloAdh = await prisma.insumo.create({
      data: {
        userId, nombre: 'Vinilo autoadhesivo premium', tipo: 'vinilo',
        tecnicaAsociada: 'vinyl_adhesivo', moneda: 'local', isDemo: true,
        supplierId: srViniloId,
        config: { tipo: 'vinilo', aplicacion: 'rigido', acabado: 'Liso', precio_metro: 5000, ancho: 60, colores: ['Blanco', 'Negro', 'Rojo', 'Azul'] },
      },
    })

    // New product
    await getProduct('Botella de vidrio', {
      baseCost: 1000, category: 'Botellas', categoryId: catBotellas,
      moneda: 'local', supplierId: donBotellasId,
    })

    // Technique config
    await prisma.tecnica.updateMany({
      where: { userId, slug: 'vinyl_adhesivo' },
      data: {
        config: {
          tipo: 'vinyl_adhesivo', modo: 'propia', margen_seguridad: 2,
          desperdicio_pelado_pct: 10, pedido_minimo: 1, tiempo_preparacion: 20,
          descuento_override: false, descuentos: [
            { desde: 1, hasta: 9, porcentaje: 0 },
            { desde: 10, hasta: 49, porcentaje: 0.05 },
            { desde: 50, hasta: 99, porcentaje: 0.10 },
            { desde: 100, hasta: 9999, porcentaje: 0.15 },
          ],
        },
        equipmentIds: [plotterId],
        insumoIds: [viniloAdh.id],
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

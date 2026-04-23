# Cotizador — Design Overrides

Hereda todo de MASTER.md. Particularidades:

## Tipografía numérica
- Todos los precios y cantidades: `tabular-nums` para alineación vertical
- Precio final: `text-2xl font-bold` en `#1A1A1A`
- Costos parciales: `text-sm` en `#6B7280`

## Layout del formulario
- Panel izquierdo (configuración): max-width 600px
- Panel derecho (resumen/ticket): sticky, max-width 360px
- En mobile: ticket se mueve abajo del formulario

## Badges de técnica
- Sublimación: fondo `#F0FDFA`, texto `#0F766E`
- DTF: fondo `#FFF7ED`, texto `#C2410C`
- Vinilo Textil: fondo `#FDF2F8`, texto `#BE185D`
- Serigrafía: fondo `#EFF6FF`, texto `#1D4ED8`
- DTF UV: fondo `#FAF5FF`, texto `#7C3AED`

## Inputs numéricos
- Ancho fijo (w-20 o w-24) para cantidades
- Botones +/- con touch target de 44px
- Formato de moneda: símbolo + número con 2 decimales cuando < 100

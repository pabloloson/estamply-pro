# Estamply Design System — MASTER

> Fuente de verdad para toda decisión visual en Estamply.
> Consultar ANTES de diseñar cualquier página o componente.

---

## Filosofía

Estamply se siente como un taller bien organizado: todo en su lugar, fácil de encontrar, agradable de usar. Profesional pero cercano. Limpio pero con calidez. No es un SaaS enterprise frío ni una startup tech genérica.

**Audiencia**: emprendedoras de personalización textil en LATAM. 25-45 años, nivel técnico bajo-medio. Priorizan simplicidad, claridad y velocidad. Desktop primero, mobile segundo.

---

## 1. Paleta de Colores

### Primario (acento)

| Token | Hex | Uso |
|-------|-----|-----|
| `teal-700` | `#0F766E` | CTAs principales, enlaces, íconos activos, estados seleccionados |
| `teal-600` | `#0D9488` | Hover de CTAs |
| `teal-50` | `#F0FDFA` | Fondo de elemento activo (sidebar, tabs) |
| `teal-100` | `#CCFBF1` | Fondo de badges teal |

**Regla**: el teal es un acento, NUNCA un fondo de áreas grandes.

### Fondos

| Token | Hex | Uso |
|-------|-----|-----|
| `bg-app` | `#FAFAF8` | Fondo principal de toda la app |
| `bg-card` | `#FFFFFF` | Cards, sidebar, modales |
| `bg-input` | `#F5F5F3` | Fondo de inputs |

### Grises (warm gray, NO cool/blue gray)

| Token | Hex | Uso |
|-------|-----|-----|
| `gray-900` | `#1A1A1A` | Texto principal, títulos |
| `gray-700` | `#404040` | Texto secundario fuerte |
| `gray-500` | `#6B7280` | Texto secundario, labels |
| `gray-400` | `#9CA3AF` | Texto terciario, placeholders |
| `gray-200` | `#E5E5E3` | Bordes de cards, dividers |
| `gray-100` | `#F3F3F1` | Fondo de hover en filas, separadores |
| `gray-50` | `#FAFAF8` | Fondo de app (= bg-app) |

### Semánticos

| Estado | Fondo | Texto | Uso |
|--------|-------|-------|-----|
| Éxito | `#D1FAE5` | `#059669` | Completado, pagado, activo |
| Warning | `#FEF3C7` | `#D97706` | Pendiente, por vencer, trial |
| Error | `#FEE2E2` | `#DC2626` | Rechazado, vencido, error |
| Info | `#DBEAFE` | `#2563EB` | Información, en producción |

### PROHIBIDO

- ~~`#6C5CE7` violeta/purple~~ — eliminar de toda la app
- Gradientes decorativos
- Colores neón o saturados como fondo
- Más de 2 colores de acento por vista

---

## 2. Tipografía

### Familia

```
DM Sans — headlines, body, UI
```

**CDN**: `https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap`

Se usa una sola familia. NO usar Inter, Roboto, Arial, ni system fonts.

### Escala

| Token | Tamaño | Weight | Uso |
|-------|--------|--------|-----|
| `text-2xl` | 24px | `font-semibold` | Títulos de página |
| `text-lg` | 18px | `font-semibold` | Títulos de sección/card |
| `text-base` | 16px | `font-normal` | Texto de lectura |
| `text-sm` | 14px | `font-medium` | Labels, botones, UI general |
| `text-xs` | 12px | `font-medium` | Badges, captions, meta |

### Números

Usar `font-variant-numeric: tabular-nums` en tablas, precios, y cotizador para alineación.

### PROHIBIDO

- Más de 1 familia tipográfica
- ALL CAPS en textos largos (solo badges/labels cortos)
- `font-light` o `font-thin`
- `font-bold` excesivo — preferir `font-semibold`
- Cursiva/italic decorativa

---

## 3. Spacing y Layout

### Grid

| Elemento | Medida |
|----------|--------|
| Sidebar desktop | 256px (w-64) |
| Contenido max-width | 1200px |
| Padding de página | `py-6 px-6` (mobile: `p-4 pt-20`) |
| Padding desktop | `lg:px-8 lg:pt-8` |

### Spacing system (escala Tailwind)

| Contexto | Valor |
|----------|-------|
| Entre secciones de página | `space-y-8` |
| Entre cards | `gap-5` o `gap-6` |
| Dentro de cards | `p-5` o `p-6`, `space-y-3` |
| Entre form fields | `space-y-4` |

### PROHIBIDO

- Filas de tabla < 48px de alto
- Scroll horizontal en mobile
- Apretar demasiados elementos en una vista

---

## 4. Componentes

### Botones

| Tipo | Fondo | Texto | Borde |
|------|-------|-------|-------|
| Primario | `#0F766E` | blanco | ninguno |
| Secundario | transparente | `#404040` | `#E5E5E3` |
| Ghost | transparente | `#0F766E` | ninguno |

Todos: `rounded-lg` (8px), `py-2.5 px-4`, `text-sm font-semibold`, `transition-colors duration-150`.
Sin sombras por defecto. Hover: darken sutil del fondo.

### Inputs

- Fondo: `#F5F5F3`
- Borde: `2px solid transparent`
- Focus: `border-color: #0F766E`, `ring-2 ring-teal-500/20`
- Altura: 40-44px
- `rounded-lg` (10px)
- Labels SIEMPRE arriba del input

### Cards

- Fondo: `#FFFFFF`
- Borde: `1px solid #E5E5E3`
- `rounded-xl` (16px)
- Sin sombras pesadas. Máximo `shadow-sm` para jerarquía
- Padding: `p-5` o `p-6`

### Sidebar

- Fondo: `#FFFFFF` con borde derecho `#E5E5E3`
- Items inactivos: texto `#6B7280`, sin fondo
- Item activo: fondo `#F0FDFA`, texto `#0F766E`, borde izquierdo `3px solid #0F766E`
- Hover: fondo `#F0FDFA` sutil, texto `#0F766E`
- Sin separadores entre items — usar spacing
- Logo + nombre del taller en la parte superior

### Tablas

- Header: fondo `#F3F3F1`, texto `text-xs font-medium uppercase tracking-wider` en `#6B7280`
- Filas: divider `#F3F3F1` entre filas, hover `#FAFAF8`
- Acciones: íconos al final, no botones pesados
- Mínimo 48px de alto por fila

### Modales

- Desktop: centrado, `max-w-md`, `rounded-xl`, `p-6`, overlay `bg-black/40`
- Mobile: drawer desde abajo, `rounded-t-xl`, full width, max 95vh
- Fade-in en desktop, slide-up en mobile

### Toasts

- Posición: arriba a la derecha
- Compactos con ícono de estado (Lucide, no emojis)
- Fondo blanco, borde sutil, shadow-sm

---

## 5. Iconografía

- **Librería**: Lucide (ya en el proyecto)
- **Stroke width**: 1.5 o 2
- **Tamaños**: 16px inline, 18-20px navigation, 24px highlights
- **Color**: `currentColor` (hereda del texto)
- NUNCA emojis como íconos de UI
- NUNCA íconos sin label en navegación principal

---

## 6. Micro-interacciones

- `transition-colors duration-150` en botones e items interactivos
- Hover en botones: luminosidad sutil (no cambio de color)
- Hover en filas: fondo gris suave
- Modales: fade-in + scale 95%→100% en desktop, slide-up en mobile
- Sidebar collapse: transición suave
- NO animaciones de entrada en cards/listas al cargar
- NO rebotes, bounces, o movimientos que distraigan

---

## 7. Estados vacíos y Loading

### Empty states

- Ícono grande (48-64px) en gris claro
- Título: "No tenés presupuestos todavía"
- Subtítulo con acción: "Creá tu primer presupuesto para empezar"
- Botón primario teal
- Sin emojis ni ilustraciones complejas

### Loading

- Skeletons con `animate-pulse` para contenido
- Forma del skeleton = forma del contenido
- Spinners solo para acciones puntuales

---

## 8. Responsive / Mobile

- Sidebar → hamburger menu o bottom nav
- Cards apiladas verticalmente
- Tablas → cards apilables
- Modales → drawers full-width desde abajo
- Touch targets: mínimo 44x44px
- Font-size mínimo: 14px

---

## ANTI-PATTERNS GLOBALES

| NUNCA hacer | Por qué |
|-------------|---------|
| Teal como fondo de áreas grandes | Es acento, no fondo |
| Violeta/purple/lila (#6C5CE7) | Eliminado del design system |
| Gradientes decorativos | Ruido visual innecesario |
| Emojis en UI | Audiencia profesional |
| Sombras pesadas (shadow-lg+) | Usar bordes sutiles |
| Inter, Roboto, Arial | Tipografía sin personalidad |
| font-light/font-thin | Ilegible en monitores baratos |
| Dark mode | La audiencia no lo necesita |
| Bordes rounded-full en cards | Excesivo |
| ALL CAPS en textos largos | Solo badges/labels cortos |
| Texto decorativo en inglés | UI en español |
| Fondos de color en headers | Mantener limpio |

---

## Tokens CSS (variables)

```css
:root {
  --color-teal-700: #0F766E;
  --color-teal-600: #0D9488;
  --color-teal-50: #F0FDFA;
  --bg-app: #FAFAF8;
  --bg-card: #FFFFFF;
  --bg-input: #F5F5F3;
  --text-primary: #1A1A1A;
  --text-secondary: #6B7280;
  --border-default: #E5E5E3;
  --border-subtle: #F3F3F1;
  --font-family: 'DM Sans', sans-serif;
}
```

---

*Última actualización: 2026-04-22*

# PRP-002: Panel de Administracion (Super Admin)

> **Estado**: PENDIENTE
> **Fecha**: 2026-04-10
> **Proyecto**: Estamply

---

## Objetivo

Construir un panel de Super Admin aislado del app principal que permita al equipo de Estamply monitorear todos los talleres registrados, ver metricas globales de la plataforma (ingresos, uso, churn), gestionar planes/trials de usuarios, y hacer troubleshooting sin acceder directamente a Supabase.

## Por Que

| Problema | Solucion |
|----------|----------|
| No hay visibilidad sobre cuantos talleres usan la plataforma ni su estado | Dashboard con metricas globales: talleres activos, trials, expirados, churn |
| No se puede gestionar planes/trials de usuarios sin queries manuales en Supabase | Panel CRUD para editar plan, plan_status, trial_ends_at desde la UI |
| No hay forma de ver ingresos potenciales ni conversion de trial a pago | Metricas de conversion funnel: registro -> onboarding -> trial -> pago |
| Para hacer soporte al cliente hay que buscar en la BD directamente | Vista de detalle por taller con sus pedidos, presupuestos, config |

**Valor de negocio**: Visibilidad total sobre la salud del SaaS. Permite tomar decisiones de negocio (pricing, features, soporte) basadas en datos reales. Prerequisito para escalar.

## Que

### Criterios de Exito
- [ ] Ruta `/admin` protegida: solo accesible por emails en whitelist de super admins
- [ ] Dashboard con KPIs globales: total talleres, activos (ultimos 7d), en trial, expirados, planes pagos
- [ ] Lista de talleres con filtros (plan, estado, fecha registro) y busqueda
- [ ] Vista de detalle de taller: perfil, pedidos, presupuestos, equipo, actividad reciente
- [ ] Acciones admin: extender trial, cambiar plan, cambiar plan_status
- [ ] Grafico de registros por mes y conversion funnel
- [ ] Todo funciona sin modificar tablas existentes (lectura cross-tenant via service_role o RLS bypass)

### Comportamiento Esperado

1. Super admin accede a `/admin` -> middleware verifica que el email del usuario esta en la whitelist
2. Si no esta autorizado, redirect a `/`
3. Dashboard muestra cards con KPIs: Total talleres, Activos (7d), En trial, Expirados, Planes pagos
4. Grafico de registros por mes (ultimos 12 meses)
5. Tabla de talleres con columnas: nombre, email, plan, estado, fecha registro, ultimo acceso
6. Click en un taller abre detalle: perfil completo, # pedidos, # presupuestos, # productos, miembros de equipo
7. Acciones: boton "Extender Trial" (date picker), dropdown "Cambiar Plan", dropdown "Cambiar Estado"
8. Busqueda por nombre o email, filtros por plan y estado

---

## Contexto

### Referencias
- `src/app/(main)/layout.tsx` - Patron de layout con auth check
- `src/app/(main)/estadisticas/page.tsx` - Patron de dashboard con graficos (recharts)
- `src/app/(main)/DashboardClient.tsx` - Patron de KPI cards
- `src/shared/context/PermissionsContext.tsx` - Sistema de permisos existente (team_members)
- `src/shared/components/Sidebar.tsx` - Sidebar existente (no se reutiliza, admin tiene su propio layout)

### Arquitectura Propuesta (Feature-First)

```
src/
├── app/
│   └── (admin)/
│       ├── layout.tsx              # Layout admin: auth check + sidebar admin
│       ├── admin/
│       │   ├── page.tsx            # Dashboard KPIs
│       │   └── workshops/
│       │       ├── page.tsx        # Lista de talleres
│       │       └── [id]/
│       │           └── page.tsx    # Detalle de taller
│
├── features/
│   └── admin/
│       ├── components/
│       │   ├── AdminSidebar.tsx
│       │   ├── KpiCards.tsx
│       │   ├── WorkshopTable.tsx
│       │   ├── WorkshopDetail.tsx
│       │   ├── RegistrationChart.tsx
│       │   └── AdminActions.tsx
│       ├── hooks/
│       │   ├── useAdminAuth.ts
│       │   └── useAdminData.ts
│       ├── services/
│       │   └── admin-api.ts        # Server actions con service_role
│       └── types/
│           └── index.ts
```

**Decisiones de arquitectura clave**:

1. **Route group `(admin)` separado**: Layout propio, sin sidebar del taller, sin PresupuestoProvider ni PermissionsProvider. Completamente aislado.
2. **Whitelist de emails**: La forma mas simple y segura. Array de emails en env var `ADMIN_EMAILS`. Sin tabla nueva ni roles en BD.
3. **Server Actions con service_role**: Para leer datos cross-tenant (las tablas tienen RLS por user_id). Los Server Actions usan `createClient` con service_role key para bypass de RLS. NUNCA exponer service_role al cliente.
4. **Sin tablas nuevas**: Todo se lee de las tablas existentes (profiles, orders, presupuestos, equipment, team_members, etc). Solo lectura + updates puntuales en profiles.

### Modelo de Datos

No se crean tablas nuevas. Se leen las existentes cross-tenant:

| Tabla | Datos para Admin |
|-------|-----------------|
| `profiles` | workshop_name, email, plan, plan_status, trial_ends_at, onboarding_completed, created_at |
| `orders` | count, sum(total_price), status distribution por taller |
| `presupuestos` | count, sum(total), origen distribution por taller |
| `products` | count por taller |
| `equipment` | count por taller |
| `team_members` | count por taller |
| `clients` | count por taller |

**Env var nueva**:
```
ADMIN_EMAILS=admin@estamply.com,pablo@estamply.com
```

---

## Blueprint (Assembly Line)

### Fase 1: Infraestructura Admin (Auth + Layout)
**Objetivo**: Ruta `/admin` protegida con layout propio. Solo emails autorizados pueden acceder. Redirect para no autorizados.
**Validacion**: Navegar a `/admin` con email no autorizado redirige a `/`. Con email autorizado muestra layout admin vacio.

### Fase 2: Dashboard KPIs + Graficos
**Objetivo**: Server actions que leen datos cross-tenant con service_role. Dashboard con cards de KPIs globales y grafico de registros por mes.
**Validacion**: Dashboard muestra numeros reales de la BD. Grafico renderiza correctamente.

### Fase 3: Lista de Talleres
**Objetivo**: Tabla paginada con todos los talleres. Columnas: nombre, email, plan, estado, fecha registro. Filtros por plan/estado. Busqueda por nombre/email.
**Validacion**: Tabla muestra todos los profiles. Filtros y busqueda funcionan correctamente.

### Fase 4: Detalle de Taller + Acciones Admin
**Objetivo**: Vista de detalle al clickear un taller: datos del perfil, conteos de pedidos/presupuestos/productos/equipo. Acciones: extender trial, cambiar plan, cambiar estado.
**Validacion**: Detalle muestra datos reales. Acciones modifican profiles correctamente y se reflejan en la UI.

### Fase 5: Validacion Final
**Objetivo**: Sistema funcionando end-to-end
**Validacion**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Ruta protegida funciona (redirect para no admins)
- [ ] KPIs muestran datos reales
- [ ] Lista de talleres con filtros funciona
- [ ] Detalle de taller muestra datos correctos
- [ ] Acciones admin (extender trial, cambiar plan) funcionan
- [ ] Criterios de exito cumplidos

---

## Aprendizajes (Self-Annealing)

> Esta seccion CRECE con cada error encontrado durante la implementacion.

---

## Gotchas

- [ ] Server Actions con service_role: crear un `createAdminClient()` separado que use `SUPABASE_SERVICE_ROLE_KEY` para bypass de RLS
- [ ] Recharts requiere `'use client'` y puede necesitar dynamic import para evitar SSR issues
- [ ] La env var `ADMIN_EMAILS` debe estar en `.env.local` y NO commitearse
- [ ] El layout admin NO debe cargar PresupuestoProvider, PermissionsProvider, ni LocaleProvider del app principal
- [ ] Los counts cross-tenant pueden ser lentos con muchos talleres; considerar queries agregadas en lugar de N+1

## Anti-Patrones

- NO crear una tabla de admin_users — la whitelist de emails es suficiente para MVP
- NO reutilizar el Sidebar del taller — el admin tiene navegacion completamente distinta
- NO exponer service_role key al cliente (solo en Server Actions / server components)
- NO modificar las tablas existentes ni su RLS — todo es lectura cross-tenant desde server
- NO hardcodear emails de admin en codigo — usar env var

---

*PRP pendiente aprobacion. No se ha modificado codigo.*

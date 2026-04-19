# MIGRATION INVENTORY — Estamply Supabase Dependencies

Generated: 2026-04-19

---

## 1. AUTENTICACION

### Metodos de auth usados
- **Email/Password** — `signInWithPassword()`, `signUp()`
- **OAuth** — `exchangeCodeForSession()` (callback route exists for Google/third-party)
- **Password reset** — `resetPasswordForEmail()` (referenced in login page)
- **Password update** — `updateUser({ password })` (in cuenta page)

### Archivos que usan auth

| Archivo | Metodos | Descripcion |
|---------|---------|-------------|
| `src/app/actions/auth.ts` | `signInWithPassword`, `signUp`, `signOut` | Login, registro, logout (server actions) |
| `src/app/auth/callback/route.ts` | `exchangeCodeForSession` | OAuth callback handler |
| `src/app/(main)/layout.tsx` | `getUser` | Proteccion de rutas principales |
| `src/app/(admin)/layout.tsx` | `getUser` | Proteccion admin (+ email whitelist) |
| `src/app/(main)/cuenta/page.tsx` | `getUser`, `signInWithPassword`, `updateUser` | Cuenta: ver perfil, cambiar password |
| `src/shared/context/PermissionsContext.tsx` | `getUser` | Permisos por rol |
| `src/shared/context/LocaleContext.tsx` | `getUser` | Locale del taller |
| `src/features/onboarding/components/OnboardingWizard.tsx` | `getUser` | Onboarding flow |
| `src/app/api/admin/route.ts` | `getUser` | API admin (+ service role) |
| `src/app/api/team/route.ts` | `getUser`, `admin.createUser` | Invitar miembros de equipo |
| `src/app/api/catalog-order/route.ts` | (service role client) | Pedidos del catalogo publico |
| `src/app/api/validate-coupon/route.ts` | (service role client) | Validacion de cupones |
| `middleware.ts` | `getUser` | Middleware global de rutas |

### Middleware
- **Archivo:** `middleware.ts`
- **Rutas publicas:** `/`, `/login`, `/signup`, `/auth/callback`, `/onboarding`, `/p/*`, `/catalogo/*`, `/br`
- **Rutas admin:** `/admin/*` — skip middleware, auth manejada por layout
- **Logica:** redirige no-autenticados a `/login`, autenticados en `/login` a `/dashboard`

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado. 47 politicas definidas:

| Tabla | Politica | Rol | Comando | Condicion |
|-------|----------|-----|---------|-----------|
| catalog_products | Anon can read visible | anon | SELECT | `visible_in_catalog = true` |
| catalog_products | catalog_team | public | ALL | `user_id = get_team_owner_id()` |
| categories | Anon can read | anon | SELECT | `true` |
| categories | categories_team | public | ALL | `user_id = get_team_owner_id()` |
| categories | categories_user_policy | public | ALL | `auth.uid() = user_id` |
| clients | Anon can insert (catalog) | anon | INSERT | `true` |
| clients | Anon can search (catalog) | anon | SELECT | `true` |
| clients | clients_team | public | ALL | `user_id = get_team_owner_id()` |
| coupons | coupons_public_read | anon | SELECT | `true` |
| coupons | coupons_select/insert/update/delete | public | CRUD | `user_id = auth.uid() OR user_id = get_team_owner_id()` |
| equipment | equipment_select/insert/update/delete | authenticated | CRUD | `user_id = auth.uid() OR user_id = get_team_owner_id()` |
| guias_talles | Anon can read | anon | SELECT | `true` |
| guias_talles | guias_team | public | ALL | `user_id = get_team_owner_id()` |
| insumos | insumos_team | public | ALL | `user_id = get_team_owner_id()` |
| insumos | insumos_user_policy | public | ALL | `auth.uid() = user_id` |
| medios_pago | Anon can read | anon | SELECT | `true` |
| medios_pago | medios_team | public | ALL | `user_id = get_team_owner_id()` |
| operators | operators_team | public | ALL | `user_id = get_team_owner_id()` |
| orders | orders_team | public | ALL | `user_id = get_team_owner_id()` |
| payments | payments_team | authenticated | ALL | `user_id = get_team_owner_id()` |
| payments | payments_user_policy | public | ALL | `auth.uid() = user_id` |
| pedido_materiales | pedido_materiales_team | authenticated | ALL | `user_id = get_team_owner_id()` |
| presupuestos | Anon can insert (catalogo_web) | anon | INSERT | `origen = 'catalogo_web'` |
| presupuestos | Anon can read by codigo | anon | SELECT | `true` |
| presupuestos | presupuestos_owner | public | ALL | `auth.uid() = user_id` |
| presupuestos | presupuestos_team | public | ALL | `user_id = get_team_owner_id()` |
| products | products_team | public | ALL | `user_id = get_team_owner_id()` |
| profiles | Anon can read | anon | SELECT | `true` |
| profiles | profiles_own | authenticated | ALL | `auth.uid() = id` |
| promotions | promotions_select/insert/update/delete | public | CRUD | `user_id = auth.uid() OR user_id = get_team_owner_id()` |
| stock_movements | stock_team | public | ALL | `user_id = get_team_owner_id()` |
| suppliers | suppliers_team | authenticated | ALL | `user_id = get_team_owner_id()` |
| team_members | Member reads own | public | SELECT | `auth.uid() = user_id` |
| team_members | Owner manages team | public | ALL | `auth.uid() = owner_id` |
| tecnicas | tecnicas_team | public | ALL | `user_id = get_team_owner_id()` |
| tecnicas | tecnicas_user_policy | public | ALL | `auth.uid() = user_id` |
| workshop_settings | ws_anon_read | anon | SELECT | `true` |
| workshop_settings | ws_team | public | ALL | `user_id = get_team_owner_id()` |

### Roles y permisos
- **Modelo:** campo `permisos` (JSONB) en tabla `team_members`
- **Roles:** `vendedor` (default), configurable via permisos JSON
- **Permisos JSON estructura:**
  ```json
  {
    "acciones": { "crear_clientes": true, "exportar_datos": false, ... },
    "secciones": { "inicio": true, "cotizador": true, "estadisticas": false, ... },
    "datos_sensibles": { "ver_costos": false, "ver_margen": false, "ver_precios_venta": true }
  }
  ```
- **Admin:** determinado por env var `ADMIN_EMAILS` (email whitelist)

### Funcion SQL clave para multi-tenant
```sql
CREATE OR REPLACE FUNCTION public.get_team_owner_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT COALESCE(
    (SELECT owner_id FROM team_members WHERE user_id = auth.uid() LIMIT 1),
    auth.uid()
  );
$function$
```
Usada en casi todas las RLS policies para soportar equipos multi-usuario.

---

## 2. BASE DE DATOS

### Tablas (20 tablas en schema public)

| Tabla | RLS | Filas | Columnas | Foreign Keys |
|-------|-----|-------|----------|--------------|
| profiles | si | 5 | 23 | profiles.id → auth.users.id |
| workshop_settings | si | 3 | 4 | user_id → auth.users.id |
| tecnicas | si | 18 | 10 | user_id → auth.users.id |
| products | si | 13 | 22 | user_id → auth.users, category_id → categories, press/printer → equipment, supplier_id → suppliers |
| catalog_products | si | 7 | 30 | user_id → auth.users, category_id → categories, base_product_id → products, guia_talles_id → guias_talles |
| categories | si | 8 | 7 | user_id → auth.users.id |
| equipment | si | 19 | 17 | user_id → auth.users, assigned_paper/ink → insumos |
| insumos | si | 30 | 10 | user_id → auth.users, supplier_id → suppliers |
| orders | si | 12 | 12 | user_id → auth.users, client_id → clients |
| presupuestos | si | 14 | 21 | user_id → auth.users, client_id → clients |
| clients | si | 11 | 14 | user_id → auth.users.id |
| payments | si | 8 | 7 | order_id → orders, user_id → auth.users |
| team_members | si | 2 | 9 | owner_id → auth.users, user_id → auth.users |
| suppliers | si | 5 | 9 | user_id → auth.users.id |
| promotions | si | 1 | 11 | (user_id, no FK explicit) |
| coupons | si | 1 | 13 | (user_id, no FK explicit) |
| medios_pago | si | 7 | 8 | user_id → auth.users.id |
| guias_talles | si | 2 | 8 | user_id → auth.users.id |
| pedido_materiales | si | 14 | 11 | pedido_id → orders, user_id → auth.users, proveedor_id → suppliers |
| operators | si | 1 | 12 | user_id → auth.users.id |
| stock_movements | si | 0 | 7 | user_id → auth.users, product_id → catalog_products |

### Funciones SQL custom
1. **`get_team_owner_id()`** — Retorna el owner_id del equipo del usuario actual (o el uid propio si no es miembro). Usada en RLS y llamada via `supabase.rpc()`.

### Triggers
Ninguno.

### Views
1. **`public_workshop`** — Vista de workshop_settings que extrae campos del JSONB settings (nombre, logo, color, slug, whatsapp, instagram).

### Realtime
No se usa Supabase Realtime en ningun archivo del proyecto.

### Archivos con queries por tabla

**workshop_settings** (40 queries): settings page, cotizador, presupuesto, catalogo publico, layout, locale context, dashboard, onboarding, admin API
**profiles** (27 queries): auth actions, layout, cuenta, admin API, presupuesto, catalogo, onboarding
**tecnicas** (26 queries): cotizador, materiales, insumos, equipamiento, tecnicas page
**catalog_products** (21 queries): catalogo page, promociones, presupuesto, admin API, catalogo publico
**presupuestos** (19 queries): presupuesto page, estadisticas, clientes detail, admin API, catalogo-order API
**equipment** (18 queries): equipamiento page, materiales, cotizador
**clients** (17 queries): clients page, clientes detail, presupuesto, orders, catalog-order API
**products** (16 queries): materiales, cotizador, inventario
**orders** (16 queries): orders page, estadisticas, dashboard, admin API
**categories** (15 queries): catalogo, materiales, promociones, cotizador
**suppliers** (12 queries): materiales, settings
**insumos** (11 queries): insumos page, materiales, cotizador
**promotions** (9 queries): promociones page, catalogo publico
**medios_pago** (9 queries): settings, presupuesto, catalogo publico
**team_members** (8 queries): settings, permissions context, admin API, team API
**coupons** (8 queries): promociones, validate-coupon API, catalog-order API
**pedido_materiales** (7 queries): orders page
**guias_talles** (7 queries): settings, catalogo, presupuesto
**payments** (6 queries): orders, estadisticas, dashboard, clientes
**stock_movements** (2 queries): catalogo page
**operators** (4 queries): materiales page

---

## 3. STORAGE

### Buckets

| Bucket | Publico | Contenido | Limite tamaño | MIME types |
|--------|---------|-----------|---------------|------------|
| logos | si | Logos de talleres, avatares | Sin limite | Todos |
| product-photos | si | Fotos de productos del catalogo | Sin limite | Todos |

### Archivos que usan Storage

| Archivo | Bucket | Operaciones |
|---------|--------|-------------|
| `src/app/(main)/catalogo/page.tsx` | product-photos | upload, getPublicUrl |
| `src/app/(main)/settings/[[...section]]/page.tsx` | logos, product-photos | upload, getPublicUrl |
| `src/app/(main)/cuenta/page.tsx` | logos | list, upload, getPublicUrl |

### Generacion de URLs
- `supabase.storage.from('bucket').getPublicUrl(path)` — URLs publicas directas
- No se usan signed URLs
- Path pattern: `{user_id}/{timestamp}-{filename}`

---

## 4. VARIABLES DE ENTORNO

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Clave anonima (publica)
- `SUPABASE_SERVICE_ROLE_KEY` — Clave de servicio (solo server-side)

### Otras
- `ADMIN_EMAILS` — Lista de emails de admins (comma-separated)
- `NEXT_PUBLIC_APP_URL` — URL de la app (app.estamply.app)
- `NEXT_PUBLIC_SITE_URL` — URL del sitio (estamply.app)

---

## 5. OTROS SERVICIOS

### SDK
- `@supabase/supabase-js`: ^2.49.0
- `@supabase/ssr`: ^0.6.0
- No se usa `@supabase/auth-helpers-nextjs`

### Cliente factory
- **Browser:** `src/lib/supabase/client.ts` — `createBrowserClient()` de `@supabase/ssr`
- **Server:** `src/lib/supabase/server.ts` — `createServerClient()` de `@supabase/ssr` con cookies

### Features NO usados
- Edge Functions: No
- Cron Jobs: No
- Webhooks: No
- Realtime: No
- Signed URLs: No

---

## 6. RESUMEN DE IMPACTO

### Totales
- **Archivos que importan Supabase:** 41
- **Auth:** 13 archivos
- **Database queries:** 35+ archivos
- **Storage:** 3 archivos
- **Tablas:** 20 + 1 view
- **RLS policies:** 47
- **SQL functions:** 1 (`get_team_owner_id`)
- **Triggers:** 0
- **Storage buckets:** 2

### Top 10 archivos con mas dependencias Supabase

| # | Archivo | Queries | Tablas |
|---|---------|---------|--------|
| 1 | `src/app/(main)/settings/[[...section]]/page.tsx` | ~30 | profiles, workshop_settings, medios_pago, guias_talles, team_members, suppliers, storage |
| 2 | `src/app/(main)/materiales/page.tsx` | ~25 | products, equipment, categories, suppliers, insumos, tecnicas |
| 3 | `src/app/(main)/presupuesto/page.tsx` | ~20 | clients, profiles, workshop_settings, catalog_products, presupuestos, medios_pago |
| 4 | `src/app/(main)/cotizador/page.tsx` | ~18 | products, equipment, tecnicas, insumos, categories, workshop_settings |
| 5 | `src/app/api/admin/route.ts` | ~15 | profiles, workshop_settings, orders, presupuestos, clients, catalog_products, team_members |
| 6 | `src/app/(main)/orders/page.tsx` | ~14 | orders, payments, pedido_materiales, profiles |
| 7 | `src/app/(main)/catalogo/page.tsx` | ~12 | catalog_products, categories, guias_talles, stock_movements, storage |
| 8 | `src/app/(main)/estadisticas/page.tsx` | ~10 | orders, payments, presupuestos |
| 9 | `src/app/(main)/promociones/page.tsx` | ~10 | promotions, catalog_products, coupons, categories |
| 10 | `src/app/(main)/clients/page.tsx` | ~8 | clients, orders |

### Patron multi-tenant
El proyecto usa un patron de multi-tenancy basado en `user_id` en cada tabla + la funcion `get_team_owner_id()` para soportar equipos. Cada query esta filtrada automaticamente por RLS usando esta funcion. En la migracion, este filtrado debera replicarse a nivel de aplicacion o middleware de base de datos.

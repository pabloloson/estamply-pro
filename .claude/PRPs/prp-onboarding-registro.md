# PRP-001: Onboarding de Registro para Estamply

> **Estado**: PENDIENTE
> **Fecha**: 2026-04-10
> **Proyecto**: Estamply

---

## Objetivo

Implementar un flujo completo de registro con wizard de configuracion post-signup, trial de 14 dias, y redireccion inteligente post-login para que nuevos usuarios configuren su taller paso a paso y accedan a todas las funcionalidades durante el periodo de prueba.

## Por Que

| Problema | Solucion |
|----------|----------|
| El signup actual solo pide nombre, taller, email y password — el usuario entra a la app sin configurar nada y no sabe por donde empezar | Wizard de onboarding guiado que configura tecnicas, equipos e insumos basicos en 3-4 pasos |
| No hay concepto de trial ni limitacion de acceso — no hay mecanismo para convertir usuarios free a pagos | Trial de 14 dias con campo `trial_ends_at` en profiles, banner de dias restantes, y bloqueo suave al vencer |
| Despues del login, todos van a `/` sin importar si completaron onboarding o no | Redireccion inteligente: si no completo onboarding va al wizard, si ya completo va al dashboard |

**Valor de negocio**: Aumentar tasa de activacion de nuevos usuarios (de "se registran y abandonan" a "se registran, configuran y usan"). Habilitar modelo freemium/trial para monetizacion futura.

## Que

### Criterios de Exito
- [ ] Un nuevo usuario puede registrarse y es llevado automaticamente al wizard de onboarding
- [ ] El wizard tiene 3-4 pasos: Bienvenida/perfil, Tecnicas que usa, Equipamiento basico, Listo
- [ ] Al completar el wizard, `onboarding_completed` se marca true en profiles y el usuario va al dashboard
- [ ] El campo `trial_ends_at` se setea automaticamente a NOW() + 14 dias al hacer signup
- [ ] Un usuario logueado que no completo onboarding es redirigido al wizard (no al dashboard)
- [ ] Banner visible en el layout principal mostrando dias restantes de trial
- [ ] `npm run typecheck` y `npm run build` pasan sin errores

### Comportamiento Esperado (Happy Path)

```
1. Usuario llega a /signup
2. Llena nombre, nombre del taller, email, password
3. Click "Crear cuenta"
4. Se crea usuario en Supabase Auth + profile con trial_ends_at = NOW()+14d, onboarding_completed = false
5. Redirect a /onboarding
6. Paso 1: Bienvenida — "Hola [nombre]! Vamos a configurar tu taller" (confirmar datos basicos del taller)
7. Paso 2: Tecnicas — Seleccionar que tecnicas usa (subli, DTF, vinilo, serigrafia, DTF UV)
8. Paso 3: Equipamiento — Agregar al menos 1 plancha/impresora (nombre, tipo)
9. Paso 4: Listo — Resumen + "Empezar a usar Estamply" (CTA)
10. Click CTA → onboarding_completed = true → redirect a /
11. Proximo login → middleware detecta onboarding_completed = true → va directo a /
12. Banner en layout: "Te quedan X dias de prueba"
```

**Flujo alternativo — usuario existente sin onboarding:**
```
1. Usuario hace login
2. Middleware detecta onboarding_completed = false
3. Redirect a /onboarding
4. Completa wizard → va a /
```

---

## Contexto

### Referencias
- `src/app/(auth)/signup/page.tsx` — Pagina de registro actual (pide full_name, workshop_name, email, password)
- `src/app/actions/auth.ts` — Server actions de login/signup/logout (signup crea profile con upsert)
- `middleware.ts` — Middleware de auth (redirige no-auth a /login, auth en /login a /)
- `src/app/(main)/layout.tsx` — Layout principal con Sidebar, lee workshop_name de profiles
- `src/app/(main)/settings/page.tsx` — Settings con business profile, medios de pago, guias de talles, equipo
- `src/features/calculator/` — Calculadora existente (referencia de patron feature-first)

### Arquitectura Propuesta (Feature-First)
```
src/features/onboarding/
├── components/
│   ├── OnboardingWizard.tsx    # Wizard principal con stepper
│   ├── StepWelcome.tsx         # Paso 1: Bienvenida y datos del taller
│   ├── StepTechniques.tsx      # Paso 2: Seleccion de tecnicas
│   ├── StepEquipment.tsx       # Paso 3: Equipamiento basico
│   └── StepReady.tsx           # Paso 4: Resumen y CTA final
├── hooks/
│   └── useOnboarding.ts        # Estado del wizard, navegacion entre pasos
├── services/
│   └── onboarding-service.ts   # Guardar progreso, marcar completado
└── types/
    └── index.ts                # Tipos del onboarding

src/app/(auth)/onboarding/
└── page.tsx                    # Ruta /onboarding (usa OnboardingWizard)

src/shared/components/
└── TrialBanner.tsx             # Banner de dias restantes de trial
```

### Modelo de Datos

Agregar columnas a `profiles` (tabla existente):

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
```

No se crean tablas nuevas. Las tecnicas se guardan en `tecnicas` (ya existe), los equipos en `equipment` (ya existe). El wizard solo facilita la creacion inicial de estos registros.

### Tablas existentes que el wizard usara
- `profiles` — onboarding_completed, trial_ends_at (nuevos campos)
- `tecnicas` — El usuario selecciona que tecnicas usa (ya existe, tiene slug, nombre, activa)
- `equipment` — El usuario agrega su equipamiento basico (ya existe, tiene name, type, cost, lifespan_uses)

---

## Blueprint (Assembly Line)

### Fase 1: Migracion de BD + Server Actions
**Objetivo**: Agregar campos `onboarding_completed` y `trial_ends_at` a profiles. Actualizar el server action de signup para setear `trial_ends_at = NOW() + 14 days` y `onboarding_completed = false`. Crear server action para marcar onboarding como completado.
**Validacion**: Hacer signup de prueba y verificar que el profile tiene los nuevos campos con valores correctos.

### Fase 2: Middleware + Redireccion Inteligente
**Objetivo**: Modificar `middleware.ts` para que despues del login, si `onboarding_completed = false`, redirija a `/onboarding`. Agregar `/onboarding` como ruta protegida (requiere auth pero no requiere onboarding completado).
**Validacion**: Un usuario con `onboarding_completed = false` es redirigido a `/onboarding` al intentar acceder a cualquier ruta principal.

### Fase 3: Wizard de Onboarding (UI)
**Objetivo**: Crear el wizard completo con 4 pasos: Bienvenida, Tecnicas, Equipamiento, Listo. Cada paso guarda datos en las tablas correspondientes. Al finalizar, marca `onboarding_completed = true` y redirige a `/`.
**Validacion**: Flujo completo de onboarding funciona end-to-end. El usuario puede ir adelante/atras en los pasos. Los datos se persisten correctamente.

### Fase 4: Trial Banner + Validacion Final
**Objetivo**: Crear componente `TrialBanner` que muestra dias restantes. Integrarlo en el layout principal. Verificar que todo el flujo funciona end-to-end (signup → onboarding → dashboard con banner).
**Validacion**:
- [ ] `npm run typecheck` pasa
- [ ] `npm run build` exitoso
- [ ] Nuevo signup lleva al wizard
- [ ] Wizard completo lleva al dashboard
- [ ] Banner de trial visible con dias correctos
- [ ] Login de usuario existente (con onboarding completo) va directo al dashboard

---

## Aprendizajes (Self-Annealing)

> Esta seccion CRECE con cada error encontrado durante la implementacion.

_(vacio — se llena durante la ejecucion)_

---

## Gotchas

- [ ] El middleware hace una query a Supabase por cada request — agregar campo de onboarding al check existente de auth, no hacer query adicional
- [ ] Las tablas `tecnicas` y `equipment` usan `auth.uid()` como default para `user_id` — los inserts desde server actions necesitan pasar el user_id explicitamente
- [ ] El signup actual hace redirect a `/` despues de crear el profile — hay que cambiar a `/onboarding`
- [ ] La ruta `/onboarding` debe estar en el grupo `(auth)` para no tener el Sidebar, pero requiere usuario autenticado (a diferencia de `/login` y `/signup`)

## Anti-Patrones

- NO guardar estado del wizard en localStorage (usar BD para que persista entre dispositivos)
- NO crear una tabla nueva para onboarding — usar campos en `profiles` + tablas existentes
- NO bloquear completamente al usuario cuando vence el trial (bloqueo suave con banner + modal, no muro)
- NO hardcodear los 14 dias — usar constante configurable
- NO hacer el wizard obligatorio para usuarios existentes — solo para nuevos signups

---

*PRP pendiente aprobacion. No se ha modificado codigo.*

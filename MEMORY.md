# MEMORY — Disciplined

> **Regla:** máximo 50 líneas. Resumir o eliminar lo que ya no aporte en cada sesión.

## Estado actual (2026-10-28)
Hito `specs/001-main-dashboard` **COMPLETADO** y corregido (ciclos 1–2). `/` monta el Dashboard Semanal: 5 secciones, siembra idempotente (5 categorías + 4 hábitos), bienvenida única y acciones optimistas.
Stack: Next 16.4.0 (App Router, Turbopack), React 19.3.0, Tailwind v4, TypeScript strict. `lint` y `tsc --noEmit` en verde; `build` en verde **al reintentar** (el primer intento aborta por el nudge de seguridad de Next 16.4.0). Tras el ciclo 1 se re-verificaron V-01…V-07, V-09 y V-12; V-08, V-10, V-11 y V-13–V-15 proceden del ciclo 0.
V-09 corregido: con `getItem` lanzando y con `localStorage` inaccesible → valores por defecto, **un** aviso, sin bienvenida ni excepciones. V-12 en producción: 3/3 recargas sin long tasks > 50 ms (DCL 34–50 ms, load 73–137 ms).

## Contrato de datos
- Tipos en `src/types/` (barril `index.ts`): `Category`, `Habit`, `CompletionLog`, `StudySession`, `SleepLog`, `WeeklyGoals`, vista semanal; fechas `ISODateString` (`YYYY-MM-DD` local).
- 9 claves `STORAGE_KEYS` (`disciplined:*`): `STARTUP_SHOWN`, `MOTIVATIONAL_PHRASE_STATE`, `HABITS`, `COMPLETION_LOGS`, `STUDY_SESSIONS`, `SLEEP_LOGS`, `WEEKLY_GOALS`, `CATEGORIES`, `SEED_STATE`.
- Lógica pura en `src/lib/`: `date`, `numbers`, `time`, `habits`, `study`, `sleep`, `goals`, `phrases`, `seeds`, `normalize`, `dashboard`; reciben "hoy" por parámetro.
- `persistence.ts` única E/S: `isStorageAvailable()` hace sonda de lectura (`getItem(STARTUP_SHOWN)`); si lanza, no hay bienvenida, no se escribe y se muestra un aviso.
- Hooks: `useToday` (reloj: tick 60 s + focus/visibility), `useDashboardData` (siembra, relectura, optimismo con reversión; `reload()` limpia avisos manuales), `useMounted` (esqueleto SSR/hidratación).
- UI: `components/ui/`, `components/dashboard/`, `app/page.tsx` con un solo `buildDashboardViewModel`.

## Decisiones
- Semana lunes→domingo; "hoy" local `YYYY-MM-DD` (prohibido `toISOString`/UTC).
- Promedio solo sobre días transcurridos; sueño por fecha de registro (D11); frase determinista por día del año.
- Siembra por colección con `SEED_STATE`; reset de clave corrupta re-siembra solo sin `SEED_STATE`.
- Rendimiento: `buildCompletionIndex`/`isCompletedInIndex` (último registro gana) en `countCompleted`, promedio semanal, próxima acción y checklist (O(L + 7·H)).
- Alias `@/` (Opción A); cero `any`; `emerald-500` solo progreso/checks; foco `zinc-400`; `Startscreen` conserva `dark:` (RF-13/H-24).
- Tensión RF-03/D9: la tarjeta excluye completados (`checked={false}`); desmarcar se hace desde el checklist.
- `layout.tsx` restaurado a HEAD (metadata "Create Next App", `LayoutProps<"/">`); no se tocó nada más.

## Riesgos y pendientes
- R-06: recálculo retroactivo aceptado.
- R-10: `tsconfig_new.json` sin seguimiento (artefacto previo).
- R-11: `lang="en"` en `layout.tsx` con UI en español.
- Aviso de seguridad de Next 16.4.0 (build y `dev`): el primer `npm run build` aborta con `SecurityFatalError`; reintentar continúa y sale 0. Actualizar Next queda pendiente de decisión del usuario.
- Prefetch desactivado (`prefetch={false}`) en los 4 enlaces a rutas futuras (`/gym`, `/study`, `/tasks`, `/calendar`); no se crean páginas.
- Próximas specs: `/gym`, `/study`, `/tasks`, `/calendar`. Supabase pospuesto.

# 001 — Tareas: Dashboard Principal (`/`)

**Estado:** propuesto (pendiente de aprobación del usuario)
**Plan de referencia:** `specs/001-main-dashboard/plan.md`
**Spec de referencia:** `specs/001-main-dashboard/spec.md` (revisión 2, aprobada)
**Regla de calidad por tarea:** `npm run lint` y después `npx tsc --noEmit`. `npm run build` solo en T10.
**Regla de alcance:** ninguna tarea toca archivos fuera de los listados. Nada de dependencias nuevas.

## Resumen y dependencias

| # | Tarea | Depende de | Archivos | ¿Navegador? |
|---|---|---|---|---|
| T1 | Saneamiento de línea base, alias `@/` y retirada del legado | — | 8 (3 borrados) | Sí (humo) |
| T2 | Contrato de datos (`types/`) | T1 | 4 | No |
| T3 | Utilidades puras + reglas de hábitos | T2 | 4 | No |
| T4 | Estudio, sueño, metas, frases y semilla | T2, T3 | 5 | No |
| T5 | Normalización y persistencia tipada | T2, T4 | 2 | Sí (humo) |
| T6 | Hooks y composición del modelo de vista | T3, T4, T5 | 4 | No |
| T7 | Primitivas de UI | T2 | 5 | Sí (visual) |
| T8 | Componentes del dashboard I | T6, T7 | 6 | Sí (visual) |
| T9 | Componentes II + composición de `/` | T8 | 5 | **Sí (flujos)** |
| T10 | Verificación integral y `MEMORY.md` | T9 | 1 (docs) | **Sí (todos)** |

**Ajustes respecto del orden sugerido (justificados):**
1. **La retirada del legado se adelanta a T1** (el usuario la situaba al final). Motivos: (a) `StartscreenChecker.tsx` no es TypeScript válido, por lo que `npx tsc --noEmit` **falla en el estado inicial** y ninguna tarea podría cumplir su criterio de calidad; (b) `MotivationalBanner` ya no tiene importadores, así que borrarlo primero evita que la reescritura de `persistence.ts` (T5) deje el repo roto entre tareas (riesgo R-04 del plan).
2. **Utilidades y hábitos se agrupan en T3** (fecha/número/hora y `habits.ts` son la misma capa pura y comparten `DayOfWeek`/`TimeOfDay`); la lógica de estudio/sueño/metas/frases/semilla queda en T4.
3. **La composición de `page.tsx` se agrupa con los últimos componentes (T9)** para que la página se escriba una sola vez, cuando ya existen todas sus piezas.
4. **T10 es verificación integral + `MEMORY.md`** (antes T11): es la única tarea que ejecuta `npm run build`.

**Alias `@/` (R-01, Opción A):** se aplica en **T1** con una línea en `tsconfig.json` — mantener `"baseUrl": "./src"` y cambiar `"@/*": ["./src/*"]` por `"@/*": ["./*"]` —, de modo que `@/types`, `@/lib/...` y `@/components/...` resuelvan sin reescribir los imports existentes. La Opción B (`baseUrl: "."` + `"@/*": ["./src/*"]`) queda descartada porque obligaría a reescribir los imports "bare" en el mismo commit.

---

## T1 — Saneamiento de línea base, alias `@/` y retirada del legado

- [x] **T1 completada** (2026-10-28): `lint` y `tsc --noEmit` en verde, alias `@/` verificado con importación temporal, 3 archivos de legado eliminados y `/` renderizando sin errores de consola.

**Objetivo.** Dejar el repositorio en un estado que compile, habilitar el alias `@/` y eliminar el código muerto que estorba a las tareas siguientes.

**Archivos exactos**
- Eliminar `src/components/ui/StartscreenChecker.tsx` (contenido corrupto, sin importadores).
- Eliminar `src/components/ui/MotivationalBanner.tsx` (sin importadores).
- Eliminar `src/lib/motivationalPhrases.ts` (frases en inglés).
- Modificar `src/lib/persistence.ts`: quitar `getMotivationalPhraseState`/`setMotivationalPhraseState` y sus imports; corregir la lectura de `STARTUP_SHOWN` para que use la clave simple (sin doble prefijo); normalizar todos los imports a `@/`.
- Modificar `src/types/storage.ts`: retirar el tipo `MotivationalPhraseState` y conservar la constante `MOTIVATIONAL_PHRASE_STATE` como legado reservado.
- Modificar `src/types/motivational.ts`: retirar `StorageMotivationalState`; conservar `MotivationalPhrase`.
- Modificar `src/types/index.ts`: quitar del barril los exports retirados.
- Modificar `tsconfig.json`: aplicar la **Opción A** de R-01 — mantener `"baseUrl": "./src"` y cambiar `"@/*": ["./src/*"]` por `"@/*": ["./*"]`. No se toca ningún otro campo ni se reescriben imports existentes.

**Dependencias.** Ninguna. T1 aplica la corrección de R-01 (Opción A).

**Criterios de aceptación**
- `npx tsc --noEmit` pasa por primera vez (el archivo corrupto era el único bloqueo estructural) — RF-15, RNF-02.
- Con `tsconfig.json` corregido, `npx tsc --noEmit` resuelve `@/types`, `@/types/storage` y `@/lib/persistence` (importaciones de prueba temporales que se retiran al terminar la tarea), y los imports existentes (`components/ui/Startscreen` y los relativos) siguen resolviendo sin cambios — RNF-09, R-01.
- No quedan referencias a `MotivationalBanner` ni a `defaultMotivationalPhrases` — RF-01, RF-15.
- `getStartupState` lee `disciplined:startupShown` (clave simple) — RF-11, CL-37.
- `MOTIVATIONAL_PHRASE_STATE` sigue declarada y no se lee ni se escribe en ningún punto — RF-01, RF-15.
- Todos los imports del archivo tocado usan `@/` — RNF-09.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```
Navegador (humo): `localhost:3000` carga sin errores en consola.

**Hecho cuando:** `lint` y `tsc --noEmit` en verde, los 3 archivos ya no existen, `tsconfig.json` resuelve `@/` (sin cambios en los imports preexistentes), `grep -r "MotivationalBanner\|defaultMotivationalPhrases" src/` no devuelve resultados y `/` sigue renderizando.

---

## T2 — Contrato de datos (`src/types/`)

- [x] **T2 completada** (2026-10-28): 4 módulos de tipos creados/actualizados, barril con `export *`, `lint` y `tsc --noEmit` en verde y contrato verificado con archivo temporal (eliminado).

**Objetivo.** Fijar el contrato único de dominio, almacenamiento y modelo de vista, sin lógica.

**Archivos exactos**
- Crear `src/types/domain.ts`: alias (`ISODateString`, `TimeOfDay`, `DayOfWeek`, `CategorySlug`, `CategoryColor`), entidades (`Category`, `Habit`, `CompletionLog`, `StudySession`, `SleepLog`, `WeeklyGoals`), `NextAction` y guards de forma (`isRecord`, `isDayOfWeek`, `isCategorySlug`, `isCategoryColor`).
- Crear `src/types/dashboard.ts`: `CompletionMetricView`, `StudyMetricView`, `SleepMetricView`, `NextActionView`, `ChecklistItemView`, `DashboardViewModel`.
- Modificar `src/types/storage.ts`: `STORAGE_KEYS` con las 9 claves de §3.2 (valores exactos, prefijo `disciplined:` incluido), `StorageKey`, `StorageReadStatus`, `StorageRead<T>`, `WriteFailureReason`, `WriteResult`, `StartupState`, `SeedState`.
- Modificar `src/types/index.ts`: barril que reexporta `domain`, `dashboard`, `storage` y `motivational`.

**Dependencias.** T1.

**Criterios de aceptación**
- Las entidades coinciden campo por campo con §3.1 (incluidos opcionales `icon?`, `isSeed?`, `description?`, `subject?` y `createdAt` en `StudySession`/`SleepLog`) — RF-10, §3.1.
- Los valores de `STORAGE_KEYS` son exactamente los de §3.2 (camelCase, sin doble prefijo) — RF-09, RF-11.
- `StorageKey` es el nombre lógico de la clave, no el string — RF-09.
- `SeedState` es `{ seededAt: ISODateString; version: 1 }` — RF-14.
- Cero `any`; todo exportado por `src/types/index.ts` — RNF-02.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```

**Hecho cuando:** los 4 archivos existen, el barril exporta todas las entidades y guards, y no hay ningún `any` en `src/types/`.

---

## T3 — Utilidades puras y reglas de hábitos

- [x] **T3 completada** (2026-10-28): 4 módulos puros creados, 77 comprobaciones numéricas en verde (script temporal eliminado), `lint` y `tsc --noEmit` sin errores.

**Objetivo.** Implementar toda la aritmética de fechas, números y horas, y las reglas de hábitos, sin React ni almacenamiento.

**Archivos exactos**
- Crear `src/lib/date.ts`: `toLocalISODate(date)`, `isValidISODate`, `parseISODate`, `formatISODate`, `addDays`, `getDayOfWeek`, `getDayOfYear`, `getWeekRange`, `getWeekDates`, `formatWeekLabel`, `compareISODates`.
- Crear `src/lib/numbers.ts`: `roundHalfUp`, `formatDecimal`, `formatPercent`, `formatHours`, `formatMinutesAsHours`, `formatGoalHours`.
- Crear `src/lib/time.ts`: `isValidTimeOfDay`, `toMinutes`, `formatTimeOfDay`.
- Crear `src/lib/habits.ts`: `getHabitsForDate`, `isCompletedOn`, `countCompleted`, `getDailyCompletionRate`, `getWeeklyCompletionAverage`, `getChecklistHabits`, `getNextAction`, `upsertCompletion`.

**Dependencias.** T2.

**Criterios de aceptación**
- `getWeekRange("2026-10-28")` → `{ start: "2026-10-26", end: "2026-11-01" }`; `getWeekRange("2026-11-01")` (domingo) → el mismo rango — RF-02, CL-14.
- `formatWeekLabel` → `"26 oct – 1 nov"` y, al cruzar año, `"29 dic 2025 – 4 ene 2026"` — RF-02, CL-31.
- `isValidISODate` rechaza `2026-02-30`, `2026-13-01`, `28/10/2026`, `2026-2-3` y acepta `2028-02-29` — CL-42.
- `roundHalfUp(66.5, 0) === 67`; `formatDecimal(7.25, 1) === "7,3"`; sin `Intl`/`toLocaleString` — CL-36, RF-13.
- `getNextAction` con hábitos 09:00/14:00/19:00 y `now = "13:30"` → 14:00 `upcoming`; con `now = "20:00"` → 19:00 `overdue`; excluye completados; empate por `title` y luego `id`; sin `startTime` válido → `null` — RF-03, CL-09, CL-10, CL-25, CL-35, CL-40.
- `getDailyCompletionRate` devuelve `null` sin hábitos aplicables y entero 0–100 en el resto — RF-04, CL-02.
- `getWeeklyCompletionAverage` promedia solo días transcurridos con hábitos aplicables (ignora futuros) — RF-04, CL-33.
- `upsertCompletion` es idempotente por `(habitId, date)` y nunca duplica — RF-07, CL-24.
- `getChecklistHabits` usa prioritarios y cae a todos los aplicables si no hay prioritarios — RF-07, CL-11, CL-12.
- Sin `new Date()` sin argumentos, sin `localStorage`, sin React y sin leer el reloj del sistema en ninguno de los 4 módulos (`date.ts` solo recibe el `Date` que le pasa el llamador en `toLocalISODate`) — RF-10, RNF-01.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```

**Hecho cuando:** los 4 módulos existen, `grep -n "new Date()" src/lib/` no devuelve nada y las comprobaciones numéricas anteriores se confirman con un `node -e` puntual o inspección del código (sin dejar archivos de prueba).

---

## T4 — Estudio, sueño, metas, frases y semilla

- [x] **T4 completada** (2026-10-28): 5 módulos puros creados, 80 comprobaciones en verde (arnés temporal eliminado), `lint` y `tsc --noEmit` sin errores.

**Objetivo.** Completar la capa pura de métricas restantes y los datos semilla.

**Archivos exactos**
- Crear `src/lib/study.ts`: `isValidStudyMinutes`, `getWeeklyStudyMinutes`, `getGoalProgress`.
- Crear `src/lib/sleep.ts`: `isValidSleepHours`, `dedupeSleepLogsByDate`, `getWeeklySleepAverage`, `getSleepLogForDate`, `upsertSleepLog`.
- Crear `src/lib/goals.ts`: `defaultWeeklyGoals`, `isValidStudyGoal`, `isValidSleepGoal`, `normalizeWeeklyGoals`.
- Crear `src/lib/phrases.ts`: `dailyPhrases` (≥12, ≤120 caracteres), `getDailyPhrase(today)`.
- Crear `src/lib/seeds.ts`: `seedCategories`, `createSeedHabits(today)`, `buildSeedState(today)`, `resolveSeedPlan`.

**Dependencias.** T2, T3 (`date`, `time`, `numbers`).

**Criterios de aceptación**
- `getWeeklyStudyMinutes` suma sesiones válidas solapadas (60 + 30 = 90) y excluye `minutes` ≤ 0 o no entero — RF-05, CL-18, CL-34.
- `getGoalProgress(720, 600)` → `{ percent: 120, cappedPercent: 100 }`; meta ≤ 0 ⇒ `percent 0` sin dividir — RF-05, CL-15, CL-16.
- `dedupeSleepLogsByDate` gana el `createdAt` más reciente (empate ⇒ último del array) — RF-06, CL-05.
- `getWeeklySleepAverage` usa fechas únicas como denominador, devuelve `excludedCount` y `average: null` sin registros válidos — RF-06, CL-04, CL-17, CL-27.
- `isValidSleepHours` acepta `0.5`, `13`, `24` y rechaza `0`, `26`, `7.25` — CL-17.
- `normalizeWeeklyGoals` devuelve `defaultWeeklyGoals` (600 min / 8 h) ante valores inválidos — RF-08, CL-16.
- `dailyPhrases` tiene ≥ 12 frases, todas ≤ 120 caracteres y en español; `getDailyPhrase(today)` = `dailyPhrases[getDayOfYear(today) % dailyPhrases.length]`, idéntica en recargas y distinta entre días consecutivos — RF-01.
- `seedCategories` = 5 categorías con `id === slug`; `createSeedHabits` = 4 hábitos (3 prioritarios, 4 con `startTime` válido, cobertura de los 7 días) con `categoryId` resoluble — RF-14, CL-29, §3.4.
- `resolveSeedPlan` implementa exactamente la tabla de §5.5 del plan, con siembra **por colección independiente** (RF-14): con `SEED_STATE` ⇒ no escribe nada; con alguna clave `corrupt` ⇒ no escribe nada (se reevalúa tras restablecer); sin `SEED_STATE` y sin corrupción ⇒ `writeCategories = (categoriesStatus === "empty")`, `writeHabits = (habitsStatus === "empty")` y `writeSeedState = true` (aunque una de las dos colecciones ya tenga datos) — RF-14, CL-08, CL-30.
- Sin React, `localStorage` ni reloj interno — RF-10.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```

**Hecho cuando:** los 5 módulos existen y las comprobaciones anteriores se confirman por inspección/`node -e`, sin archivos de prueba permanentes.

---

## T5 — Normalización y persistencia tipada

**Objetivo.** Implementar la única capa con efectos de E/S, con validación estricta, bloqueo de claves ilegibles y lectura/escritura por entidad.

**Archivos exactos**
- Crear `src/lib/normalize.ts`: `normalizeCategories`, `normalizeHabits`, `normalizeCompletionLogs`, `normalizeStudySessions`, `normalizeSleepLogs`.
- Reescribir `src/lib/persistence.ts`: `isStorageAvailable`, `get/set` por entidad (7 claves), `getSeedState`/`setSeedState`, `resetKey`, `isWriteBlocked`, `subscribeToStorage`.

**Dependencias.** T2 (tipos), T4 (`normalizeWeeklyGoals`, `defaultWeeklyGoals`).

**Criterios de aceptación**
- La normalización aplica la política campo por campo de §3.5: descarta `Habit` sin `id`/`title`/`categoryId`/`createdAt` válidos, deduplica `id` conservando la primera aparición, normaliza `targetDays` (dedupe + orden, inválido ⇒ `[]`), aplica `active: true`, `priority: false`, `isSeed: false` y `startTime` inválido ⇒ `undefined` — RF-09, CL-11, CL-13, CL-26, CL-42.
- Descarta `CompletionLog` con `completed` no booleano y conserva los que apuntan a hábitos inexistentes — §3.5.
- Excluye `StudySession` con `minutes` inválidos y `SleepLog` con `hours` fuera de rango — CL-17, CL-18.
- Clave ausente ⇒ `status: "empty"` con el valor por defecto y **sin** bloquear; JSON inválido o forma de nivel superior incorrecta ⇒ `status: "corrupt"`, valor por defecto y **bloqueo de escritura** — RF-09, CL-07.
- Ningún `get` escribe en disco (el valor por defecto no se persiste solo) — §3.2, RF-09.
- Los `set` devuelven `{ ok: true }` o `{ ok: false, reason: "blocked" | "quota" | "unavailable" }`, sin lanzar — RF-09, CL-20, CL-28.
- El prefijo `disciplined:` se aplica una sola vez (nunca `disciplined:disciplined:`) — RF-11, CL-37.
- `subscribeToStorage` filtra por `STORAGE_KEYS`, ignora `event.key === null` y devuelve la función de baja — RF-12, CL-21.
- `resetKey` borra la clave, limpia el bloqueo y devuelve `WriteResult` — RF-09, CL-28.
- Cero `any`; datos externos tratados como `unknown` — RNF-02.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```
Navegador (humo): en consola, `localStorage.setItem('disciplined:habits','{no-json')` y recargar no debe romper la carga (aún sin UI, sin excepciones).

**Hecho cuando:** ambos módulos existen, no hay `throw` en `persistence.ts` fuera de los `catch` internos y `grep -n "disciplined:disciplined" src/` no devuelve nada.

- [x] **T5 completada** (2026-10-28): `src/lib/normalize.ts` creado y `src/lib/persistence.ts` reescrito con la superficie de §5.1; 72 comprobaciones en verde sobre `localStorage` en memoria (arnés temporal eliminado), humo de `/` con `disciplined:habits` corrupto sin excepciones, `lint` y `tsc --noEmit` sin errores.

---

## T6 — Hooks y composición del modelo de vista

**Objetivo.** Conectar la capa pura con React: un solo reloj, carga tipada, siembra idempotente, upserts optimistas y un único compositor de métricas.

**Archivos exactos**
- Crear `src/hooks/useMounted.ts`.
- Crear `src/hooks/useToday.ts`.
- Crear `src/hooks/useDashboardData.ts`.
- Crear `src/lib/dashboard.ts`: `buildDashboardViewModel`.

**Dependencias.** T3, T4, T5.

**Criterios de aceptación**
- `useToday()` devuelve `null` antes de montar y `{ today, now }` después; recalcula cada 60 s con pestaña visible y en `focus`/`visibilitychange` — RF-12, CL-06, CL-32, CL-39.
- `useDashboardData(null)` no toca `localStorage` y devuelve `loading: true` — RNF-06, plan R-03.
- La siembra se ejecuta una sola vez por sesión, después de leer, y respeta `resolveSeedPlan` — RF-14, CL-08, CL-29, CL-30.
- `toggleHabit` actualiza el estado antes de escribir y revierte en el mismo tick si la escritura falla, exponiendo `issues.notice` — RF-07, CL-38, CL-28, CL-20.
- `saveSleep`/`saveGoals` validan antes de escribir y revierten si falla — RF-06, RF-08.
- Se relee en `focus`/`visibilitychange` y en el evento `storage` — RF-12, CL-21.
- `buildDashboardViewModel` produce todas las vistas de `types/dashboard.ts` usando solo funciones puras: frase (RF-01), semana (RF-02), próxima acción (RF-03), cumplimiento (RF-04), estudio (RF-05), sueño (RF-06, `meetsGoal = average >= goal`), checklist (RF-07) — CL-41.
- Ninguna métrica recalcula en los componentes; `dashboard.ts` es el único agregador — RF-10, plan §4.6.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```

**Hecho cuando:** los 4 archivos existen, `grep -n "new Date()" src/` solo aparece en `src/hooks/useToday.ts`, y `src/lib/dashboard.ts` no importa React ni `localStorage`.

- [x] **T6 completada** (2026-10-28): `useMounted`, `useToday`, `useDashboardData` y `lib/dashboard.ts` creados; 40 comprobaciones del view model en verde (arnés eliminado), humo en navegador con rutas temporales ya borradas (siembra, toggle optimista con reversión, sueño/metas, relectura en `storage`/`focus`, reset + resiembra), `lint` y `tsc --noEmit` sin errores.

---

## T7 — Primitivas de UI

**Objetivo.** Crear las 5 primitivas presentacionales reutilizables, sin lógica de negocio.

**Archivos exactos**
- Crear `src/components/ui/MetricCard.tsx`.
- Crear `src/components/ui/ProgressBar.tsx`.
- Crear `src/components/ui/EmptyState.tsx`.
- Crear `src/components/ui/NumberInput.tsx`.
- Crear `src/components/ui/Notice.tsx`.

**Dependencias.** T2 (tipos, si aplica) — no dependen de hooks.

**Criterios de aceptación**
- `ProgressBar` recibe `percent` ya topado, usa `role="progressbar"` con `aria-valuenow`/`aria-valuemin`/`aria-valuemax` y relleno `bg-emerald-500` sobre pista `bg-zinc-800` — RF-13, CL-15.
- `NumberInput` asocia `label`/`id`, expone `aria-describedby` cuando hay `error`, acepta `suffix` (p. ej. "h") y no permite `NaN` (`onChange` entrega `number | ""`) — RF-06, RF-08, RF-13.
- `Notice` usa `role="status"` para `info` y `role="alert"` para `error`, con acción opcional ("Restablecer") — RF-09, CL-07, CL-28.
- `EmptyState` y `MetricCard` no calculan nada: reciben texto y `children` — plan §4.5.
- Clases exactas del plan §6.5: sin `dark:`, sin `emerald-400`, sin `animate-pulse`, sin valores arbitrarios nuevos, foco visible con `focus-visible:outline-zinc-400` (el verde queda reservado a progreso/checks, nunca al foco) — RF-13, CL-44.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```
Navegador (visual, opcional en esta tarea): montar temporalmente no está permitido; se validan al integrarse en T8/T9.

**Hecho cuando:** los 5 archivos existen, ninguno importa de `src/lib/` funciones de negocio ni usa estado global, y `grep -rn "dark:\|emerald-400\|animate-pulse\|outline-emerald" src/components/ui/` no devuelve nada (el foco usa `outline-zinc-400`).

- [x] **T7 completada** (2026-10-28): 5 primitivas creadas con las props exactas de §4.5 y las clases de §6.5; `lint` y `tsc --noEmit` en verde; greps de prohibiciones, estado y `@/lib` sin resultados en las 5 (las únicas coincidencias de `dark:` están en `Startscreen.tsx`, fuera de alcance); `/` en 200 sin errores de consola.

---

## T8 — Componentes del dashboard I (cabecera, frase y métricas)

**Objetivo.** Construir la cabecera, la frase y el bloque de métricas como componentes presentacionales.

**Archivos exactos**
- Crear `src/components/dashboard/WeeklyHeader.tsx`.
- Crear `src/components/dashboard/DailyPhraseCard.tsx`.
- Crear `src/components/dashboard/WeeklyMetrics.tsx`.
- Crear `src/components/dashboard/metrics/CompletionMetric.tsx`.
- Crear `src/components/dashboard/metrics/StudyMetric.tsx`.
- Crear `src/components/dashboard/metrics/SleepMetric.tsx`.

**Dependencias.** T6 (tipos de vista), T7 (primitivas).

**Criterios de aceptación**
- `WeeklyHeader` muestra la marca, `weekLabel` y exactamente 4 enlaces (`/gym`, `/study`, `/tasks`, `/calendar`) con `next/link`, sin número de semana ni "Semana en curso", y un único `<h1>` — RF-02, CL-14.
- `DailyPhraseCard` muestra la frase recibida sin lógica de selección — RF-01.
- `CompletionMetric` muestra `—` cuando `todayPercent === null`, y `0–100 %` con `tabular-nums` — RF-04, CL-01, CL-02.
- `StudyMetric` muestra total en horas con coma (`12,0 h`), meta (`10 h`) y barra saturada al 100 % con porcentaje > 100 % visible — RF-05, CL-15.
- `SleepMetric` muestra promedio con un decimal, meta, `meetsGoal` en `emerald-500`, aviso de `excludedCount` y el formulario de registro de hoy (prellenado con `todayValue`) — RF-06, CL-04, CL-27, CL-41.
- `WeeklyMetrics` dispone las 3 métricas en `grid gap-4 md:grid-cols-3` y delega en las tarjetas; no calcula — plan §6.1.
- Todos los textos en español; sin `any`; props exactas del plan §4.5 — RF-13, RNF-02.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```
Navegador (visual): tras T9.

**Hecho cuando:** los 6 archivos existen, ningún componente importa de `src/lib/` más que tipos y formateadores, y no hay cálculos de porcentajes/promedios en su cuerpo.

- [x] **T8 completada** (2026-10-28): 6 componentes presentacionales creados con las props exactas de §4.5 (`WeeklyHeader`, `DailyPhraseCard`, `WeeklyMetrics`, `CompletionMetric`, `StudyMetric`, `SleepMetric`); `lint` y `tsc --noEmit` en verde; greps de prohibiciones y de `@/lib/persistence`/`localStorage`/`new Date()` sin resultados en `src/components/dashboard/`; `WeeklyHeader` con un único `<h1>` y 4 enlaces `next/link`; sin rutas nuevas en `src/app/`; `/` en 200 con consola limpia (las piezas se montan en T9).

---

## T9 — Componentes II y composición de `/`

**Objetivo.** Completar la UI (próxima acción, checklist, metas, esqueleto) y montar la página con las 5 secciones, la bienvenida y el tema oscuro forzado.

**Archivos exactos**
- Crear `src/components/dashboard/NextActionCard.tsx`.
- Crear `src/components/dashboard/QuickChecklist.tsx`.
- Crear `src/components/dashboard/GoalsEditor.tsx`.
- Crear `src/components/dashboard/DashboardSkeleton.tsx`.
- Modificar `src/app/page.tsx`.

**Dependencias.** T8 (todas las piezas previas).

**Criterios de aceptación**
- `page.tsx` renderiza en orden: cabecera, frase, próxima acción, métricas y checklist; un solo `buildDashboardViewModel` — RF-02, RF-03, RF-04, RF-05, RF-06, RF-07.
- Tema oscuro forzado en el contenedor raíz (`min-h-screen bg-zinc-950 text-zinc-50`), sin `dark:` — RF-13, CL-44.
- `NextActionCard` muestra hora, título, categoría y la etiqueta "Atrasado" cuando corresponde; su checkbox ejecuta `onToggle` y la tarjeta avanza — RF-03, CL-09, CL-40.
- `QuickChecklist` muestra contador `n / total`, checkbox accesible por hábito, hora solo si existe y chip de semilla cuando `isSeed`; estado vacío correcto — RF-07, CL-01, CL-02, CL-03, CL-10, CL-23.
- `GoalsEditor` valida estudio (60–4200, entero) y sueño (0.5–24, paso 0.5) antes de llamar a `onSave`, con mensaje de error accesible — RF-08, CL-16.
- `DashboardSkeleton` reproduce la jerarquía con bloques estáticos (sin animación) y se muestra mientras `useToday()` es `null` o `loading` es `true`, es decir, en el render previo al montaje y en la recarga por cambio de día — RF-12, plan §6.2.
- La bienvenida (`Startscreen`) se muestra solo si `STARTUP_SHOWN` no está marcado, una vez por dispositivo, y se marca al cerrarse — RF-11, CL-08, CL-37, D10.
- Sin errores de hidratación ni de `key` en consola — RNF-02, plan R-03.
- 375 px: una columna, sin scroll horizontal, 4 enlaces accionables — RF-13, RF-02.

**Verificación**
```bash
npm run lint
npx tsc --noEmit
```
Navegador (obligatoria): V-01, V-02, V-03, V-04, V-05, V-06, V-13, V-14 del plan §8.

**Hecho cuando:** `/` muestra las 5 secciones con datos semilla en una sesión limpia, la bienvenida aparece una sola vez, los flujos V-01…V-06 pasan y la consola está limpia.

- [x] **T9 completada** (2026-10-28): 4 componentes creados (`NextActionCard`, `QuickChecklist`, `GoalsEditor`, `DashboardSkeleton`), `WeeklyMetrics` con `GoalsEditor` y `page.tsx` reescrito con un único `buildDashboardViewModel`; V-01…V-06, V-13 y V-14 verificadas en navegador (semilla 5+4, bienvenida una vez, avance de próxima acción, contador 2/2 persistente, sueño 7,5/13/0,5 aceptados y 26/0/7,25 rechazados, metas 420/7,5 persistentes y 0/5000/7,25 rechazadas, tema oscuro con `prefers-color-scheme: light`, 375/320 px sin scroll horizontal); consola sin errores ni warnings de hidratación; `lint` y `tsc --noEmit` en verde; almacenamiento final en semilla limpia.

---

## T10 — Verificación integral, conformidad y `MEMORY.md`

**Objetivo.** Cerrar el hito: ejecutar la batería completa de verificaciones manuales, comprobar la conformidad de estilo/arquitectura y dejar la memoria del proyecto actualizada.

**Archivos exactos**
- Modificar `MEMORY.md` (≤ 50 líneas): estado de la fase, contrato de datos y decisiones, riesgos aceptados (R-06 recálculo retroactivo), pendientes (R-10, R-11).

**Dependencias.** T9.

**Criterios de aceptación**
- V-01…V-15 del plan §8 en verde, incluidas las de fallo (clave ilegible, cuota, dos pestañas, volumen, tema claro, 375 px) — RF-09, RF-12, RF-13, RNF-04, RNF-05.
- Con ~1 500 registros, el panel Performance no muestra long tasks > 50 ms — RNF-04, RNF-05, CL-19.
- `npm run lint` → `npx tsc --noEmit` → `npm run build` en ese orden, los tres en verde — RNF-03.
- Greps de conformidad sin resultados en `src/`: `any`, `dark:`, `emerald-400`, `outline-emerald` (el foco debe ser neutro), `animate-pulse`, `toISOString(`, `localeCompare`, `Intl`, `toLocaleString`, imports relativos y "bare" — RNF-02, RNF-09, RF-13.
- No existe ninguna página nueva bajo `/gym`, `/study`, `/tasks` ni `/calendar` — RF-02.
- `MEMORY.md` actualizado y coherente con el estado real — RNF-12.

**Verificación**
```bash
npm run lint && npx tsc --noEmit
npm run build
```
Navegador (obligatoria): batería completa V-01…V-15.

**Hecho cuando:** los 15 flujos pasan, los tres comandos de calidad están en verde, los greps de conformidad están limpios y `MEMORY.md` refleja el estado final.

- [x] **T10 completada** (2026-10-28): batería V-01…V-15 en verde con Chrome DevTools MCP (semilla 5+4 e idempotencia, próxima acción y checklist coherentes, sueño y metas válidos persistidos e inválidos rechazados, clave ilegible con bloqueo y restablecimiento + resiembra, fallo de escritura con reversión y aviso, indisponibilidad total con valores por defecto y aviso, dos pestañas sin duplicados, cambio de día en vivo por `focus`, volumen 1 500×3 con 0 long tasks en 4/5 recargas y un pico aislado de 55 ms no reproducible, tema claro `zinc-950`, 375/320 px sin scroll horizontal, foco neutro visible y `aria-valuenow` correcto, un solo `<h1>`); consola sin errores, warnings de hidratación ni claves duplicadas; `npm run lint` → `npx tsc --noEmit` → `npm run build` en verde; greps de conformidad limpios (0 `any`, `dark:` solo en `Startscreen.tsx`, 0 `emerald-400`/`outline-emerald`/`animate-pulse`, 0 `toISOString(`/`localeCompare`/`Intl`/`toLocaleString`, 0 imports relativos salvo `./globals.css` en `layout.tsx`, 0 imports bare internos, sin rutas nuevas, `package.json` sin dependencias añadidas); `MEMORY.md` reescrito (32 líneas); almacenamiento final en semilla limpia (5 categorías + 4 hábitos + `SEED_STATE` + `startupShown`).

---

## Cobertura de requisitos por tarea

| RF | Tareas que lo implementan | Tareas que lo verifican |
|---|---|---|
| RF-01 Frase diaria | T4, T8 | T9, T10 |
| RF-02 Cabecera | T3, T8 | T9, T10 |
| RF-03 Próxima acción | T3, T9 | T9, T10 |
| RF-04 Cumplimiento | T3, T8 | T9, T10 |
| RF-05 Estudio | T3, T4, T8 | T9, T10 |
| RF-06 Sueño | T3, T4, T8 | T9, T10 |
| RF-07 Checklist | T3, T6, T9 | T9, T10 |
| RF-08 Metas | T4, T9 | T9, T10 |
| RF-09 Persistencia y fallos | T1, T5, T6 | T10 |
| RF-10 Cálculos puros | T2, T3, T4, T6 | T10 |
| RF-11 Primera visita | T1, T4, T6, T9 | T9, T10 |
| RF-12 Cambio de día y render previo al montaje | T5, T6, T9 | T9, T10 |
| RF-13 Diseño y localización | T3, T7, T8, T9 | T9, T10 |
| RF-14 Semilla | T4, T6 | T9, T10 |
| RF-15 Retirada y esqueleto | T1, T9 | T10 |

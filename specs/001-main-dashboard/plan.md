# 001 — Plan técnico: Dashboard Principal (`/`)

**Estado:** propuesto (pendiente de aprobación del usuario)
**Fase SDD:** 3 — Plan técnico y tareas
**Spec de referencia:** `specs/001-main-dashboard/spec.md` (revisión 2, aprobada)
**Tareas:** `specs/001-main-dashboard/tasks.md` (T1–T10)
**Base técnica verificada:** Next 16.4.0, React 19.3.0, TypeScript 5 estricto, Tailwind v4, ESLint 9 (`eslint-config-next`), sin runner de tests.

---

## 1. Resumen ejecutivo y estrategia

El dashboard se construye **de abajo hacia arriba** en 8 capas, de modo que cada capa sea verificable sin UI y que ninguna regla de negocio viva en JSX:

| Capa | Qué aporta | Módulos |
|---|---|---|
| 1. Contrato de datos | Tipos de dominio, claves de almacenamiento, resultados de lectura/escritura y modelo de vista | `src/types/` |
| 2. Utilidades puras | Fechas civiles sin `Date` en cálculos, redondeo/formato, validación de hora | `src/lib/date.ts`, `numbers.ts`, `time.ts` |
| 3. Reglas de hábitos | Aplicabilidad por día, cumplimiento diario/semanal, próxima acción, checklist, upsert | `src/lib/habits.ts` |
| 4. Reglas de estudio, sueño, metas, frases y semilla | Ventanas semanales, promedios, rangos canónicos, plan de siembra | `src/lib/study.ts`, `sleep.ts`, `goals.ts`, `phrases.ts`, `seeds.ts` |
| 5. Persistencia | Normalización §3.5, lectura tipada con estado, bloqueo de claves ilegibles, prefijo corregido, evento `storage` | `src/lib/normalize.ts`, `persistence.ts` |
| 6. Hooks y composición | Único lector del reloj, carga/guardado optimista con reversión, siembra, view model | `src/hooks/*`, `src/lib/dashboard.ts` |
| 7. UI | Primitivas y componentes presentacionales con props y callbacks | `src/components/ui/*`, `src/components/dashboard/*` |
| 8. Integración y limpieza | Composición de `/`, `Startscreen` gobernada por `STARTUP_SHOWN`, retirada de legado | `src/app/page.tsx` |

**Principios de implementación**

1. **Un solo reloj.** `useToday()` es el único punto del árbol que lee `new Date()` sin argumentos. Todo cálculo recibe `today: ISODateString` (y `now: TimeOfDay` cuando aplica) como parámetro. `src/lib/` no importa React ni toca `localStorage` ni lee el reloj.
2. **Frontera pura/impura explícita.** `src/lib/*.ts` (excepto `persistence.ts`) son funciones totales y deterministas; `persistence.ts` es la única capa con efectos de E/S; `hooks/` es la única capa con React.
3. **Un único agregador.** `buildDashboardViewModel()` (`src/lib/dashboard.ts`) compone todas las métricas a partir de las funciones puras; `page.tsx` solo orquesta hooks y pasa props.
4. **Sin lógica en JSX.** Ningún componente calcula porcentajes, promedios ni fechas; recibe valores ya formateados o números ya redondeados.
5. **Escritura optimista síncrona.** `localStorage` es síncrono: el estado se actualiza primero y, si la escritura falla, se revierte en el mismo tick (sin ventana asíncrona que perder).
6. **KISS/YAGNI.** Sin gestor de estado, sin librería de fechas, sin gráficas, sin `Intl`, sin abstracciones de repositorio genéricas.

**Orden de ejecución:** tipos → lib pura → persistencia → hooks/view model → primitivas UI → componentes → composición de `/` → verificación integral. Cada tarea deja `npm run lint && npx tsc --noEmit` en verde.

---

## 2. Decisiones técnicas y alternativas descartadas

| ID | Decisión | Alternativa descartada (motivo) |
|---|---|---|
| **D-P1** | Consolidar el dominio en `src/types/domain.ts` (alias de fecha, `Category`, `Habit`, `CompletionLog`, `StudySession`, `SleepLog`, `WeeklyGoals`, `NextAction` y guards de forma) en lugar de un archivo por entidad como proponía §7.2 de la spec. La spec (H-15) delega los nombres definitivos al plan y fija que el **contrato** (§3.1) no cambia. | 8 archivos de tipos con imports cruzados: más ruido, cero beneficio, y ninguna diferencia para el consumidor (todo sale por `src/types/index.ts`). |
| **D-P2** | Los **guards de forma** (`isRecord`, `isDayOfWeek`, `isCategorySlug`, `isCategoryColor`) viven en `src/types/`; la **normalización semántica** (§3.5: fechas válidas, horas, `targetDays`, dedupe) vive en `src/lib/normalize.ts` con extractores `unknown → T \| undefined`. | Guards "completos" en `src/types/`: obligarían a que la capa de tipos dependa de `lib/date.ts` y `lib/time.ts` (ciclo conceptual y duplicación de validación). |
| **D-P3** | La siembra es **por colección independiente**, tal como fija RF-14: sin `SEED_STATE` y sin claves corruptas, se siembra cada colección que esté `empty` y se escribe `SEED_STATE` siempre, aunque una de las dos ya tenga datos. | Siembra como unidad (marcar sin sembrar cuando ya hay datos): contradice el bullet 1 de RF-14, que condiciona la siembra de cada colección a su propio estado (resuelto por la spec, no requiere decisión). |
| **D-P4** | `CompletionLog` duplicado para el mismo `(habitId, date)` al leer: **gana el último** del array. `SleepLog` duplicado por fecha: no se deduplica al leer; se deduplica antes de calcular (RF-05/CL-05) para poder informar `excludedCount`. | Deduplicar `CompletionLog` conservando el primero: contradice la semántica de "la última escritura manda" de `upsertCompletion`. |
| **D-P5** | Los setters devuelven `WriteResult` (`{ ok: true } \| { ok: false; reason }`) y los getters `StorageRead<T>` (`{ data, status }`), nunca lanzan. | Excepciones: obligarían a `try/catch` en cada hook y a `any` implícito en el manejo; los objetos resultado son verificables por el compilador. |
| **D-P6** | Acciones de escritura **síncronas** (`toggleHabit(): boolean`). La reversión optimista ocurre en el mismo tick, por lo que no existe "escritura pendiente" que una relectura de foco pueda pisar (CL-43 se cumple estructuralmente). | Cola asíncrona con `Promise` + `pendingKeys`: complejidad sin efecto observable en `localStorage` (YAGNI). |
| **D-P7** | Aritmética de fechas **civil-date** (`daysFromCivil`/`civilFromDays`) sobre `YYYY-MM-DD`; `Date` solo aparece en `toLocalISODate(date: Date)` para leer año/mes/día locales. | `new Date("2026-10-28")` + `getDay()`: desplazamientos de zona horaria (CL-22). |
| **D-P8** | Orden alfabético por **code points** (`a < b`), nunca `localeCompare`; meses en español con tabla propia de 12 abreviaturas. | `localeCompare`/`Intl`: dependen del locale del navegador (RF-13/CL-35). |
| **D-P9** | Navegación con `next/link` (`Link`), no `<a href>`. | `<a>`: dispara `@next/next/no-html-link-for-pages` en `npm run lint`. |
| **D-P10** | No se modifica `src/app/globals.css`: el tema oscuro forzado se aplica en el contenedor raíz de `/` (`min-h-screen bg-zinc-950`), que cubre el viewport. | Cambiar variables globales: afectaría a rutas futuras fuera del alcance de esta spec. |

---

## 3. Árbol de archivos final

### 3.1 Creados

| Archivo | Propósito (una línea) |
|---|---|
| `src/types/domain.ts` | Alias de fecha/hora/día, entidades de dominio, `NextAction` y guards de forma. |
| `src/types/dashboard.ts` | Modelo de vista (`DashboardViewModel` y vistas por sección) que consumen los componentes. |
| `src/lib/date.ts` | Fechas civiles puras: validación, semana lunes–domingo, día de la semana, etiqueta de rango. |
| `src/lib/numbers.ts` | Redondeo half-up y formateo decimal/porcentaje/horas con coma decimal (sin `Intl`). |
| `src/lib/time.ts` | Validación `HH:mm` y conversión a minutos desde medianoche. |
| `src/lib/habits.ts` | Aplicabilidad por día, cumplimiento diario/semanal, próxima acción, checklist y upsert de `CompletionLog`. |
| `src/lib/study.ts` | Minutos de estudio de la semana y progreso frente a la meta. |
| `src/lib/sleep.ts` | Dedupe de sueño por fecha, promedio semanal con `excludedCount`, lectura por fecha y upsert. |
| `src/lib/goals.ts` | Metas por defecto, rangos canónicos y normalización de `WeeklyGoals`. |
| `src/lib/phrases.ts` | Lista de frases (≥12, ≤120 caracteres) y selección determinista por fecha. |
| `src/lib/seeds.ts` | 5 categorías base, 4 hábitos semilla y plan de siembra puro (`resolveSeedPlan`). |
| `src/lib/normalize.ts` | Normalización §3.5 de las 5 colecciones persistidas (descarta inválidos, deduplica). |
| `src/lib/dashboard.ts` | Compositor puro del modelo de vista (único lugar donde se cruzan todas las métricas). |
| `src/hooks/useMounted.ts` | Bandera de montaje en cliente para evitar desajustes de hidratación. |
| `src/hooks/useToday.ts` | Único lector del reloj: `today` + `now`, tick de 60 s, `focus` y `visibilitychange`. |
| `src/hooks/useDashboardData.ts` | Lectura tipada, siembra idempotente, upserts optimistas con reversión y suscripción a `storage`. |
| `src/components/ui/MetricCard.tsx` | Tarjeta base de sección con etiqueta, contenido y pista opcional. |
| `src/components/ui/ProgressBar.tsx` | Barra de progreso accesible con relleno `emerald-500` y tope visual al 100 %. |
| `src/components/ui/EmptyState.tsx` | Mensaje de estado vacío reutilizable. |
| `src/components/ui/NumberInput.tsx` | Campo numérico etiquetado con rango, paso, sufijo y error accesible. |
| `src/components/ui/Notice.tsx` | Aviso informativo/error con acción opcional y `role="status"`. |
| `src/components/dashboard/WeeklyHeader.tsx` | Marca, etiqueta de semana y navegación a `/gym`, `/study`, `/tasks`, `/calendar`. |
| `src/components/dashboard/DailyPhraseCard.tsx` | Frase del día. |
| `src/components/dashboard/NextActionCard.tsx` | Próxima acción pendiente con checkbox y estado "vencida". |
| `src/components/dashboard/WeeklyMetrics.tsx` | Contenedor de las 3 métricas semanales y del editor de metas. |
| `src/components/dashboard/metrics/CompletionMetric.tsx` | Cumplimiento de hoy y promedio semanal. |
| `src/components/dashboard/metrics/StudyMetric.tsx` | Total de estudio, meta y progreso. |
| `src/components/dashboard/metrics/SleepMetric.tsx` | Promedio de sueño, meta, registros excluidos y registro de hoy. |
| `src/components/dashboard/QuickChecklist.tsx` | Checklist de hábitos de hoy con contador y toggle. |
| `src/components/dashboard/GoalsEditor.tsx` | Edición de metas semanales con validación en cliente. |
| `src/components/dashboard/DashboardSkeleton.tsx` | Esqueleto SSR estático con la misma jerarquía que el dashboard. |

### 3.2 Modificados

| Archivo | Cambio |
|---|---|
| `src/types/storage.ts` | `STORAGE_KEYS` completo (9 claves: 7 nuevas + 2 heredadas), `SeedState`, `StorageRead<T>`, `WriteResult`, `StorageReadStatus`; retira `MotivationalPhraseState`. |
| `src/types/index.ts` | Barril único: reexporta `domain`, `dashboard`, `storage` y `motivational`. |
| `src/types/motivational.ts` | Retira `StorageMotivationalState` (muerto tras RF-15); conserva `MotivationalPhrase`. |
| `src/lib/persistence.ts` | Reescritura: helpers `get/set` por entidad, prefijo corregido, bloqueo por clave ilegible, `storage` y `resetKey`; retira los helpers de frases. |
| `src/app/page.tsx` | Composición del dashboard (hooks + view model + 5 secciones + `Startscreen`), tema oscuro forzado. |
| `tsconfig.json` | Corrección del alias (**R-01, Opción A**): `"@/*": ["./src/*"]` → `"@/*": ["./*"]`, manteniendo `"baseUrl": "./src"`. Habilita `@/types`, `@/lib/...` y `@/components/...` sin tocar los imports existentes. |

### 3.3 Eliminados

| Archivo | Motivo |
|---|---|
| `src/components/ui/StartscreenChecker.tsx` | Contenido corrupto (volcado de códigos numéricos); impide `npx tsc --noEmit`. Sin importadores. |
| `src/components/ui/MotivationalBanner.tsx` | Legado sin importadores; usa rutas relativas y `toISOString()` (RF-15). |
| `src/lib/motivationalPhrases.ts` | Frases en inglés fuera de RF-13; sustituido por `src/lib/phrases.ts` (RF-15). |

> `tsconfig.json` se modifica en **T1** con la **Opción A** de R-01 (alias `@/` funcional, sin reescribir imports existentes). `tsconfig_new.json` es un artefacto muerto no referenciado: se recomienda eliminarlo, pero queda **fuera del alcance** de esta spec (R-10).

---

## 4. Contratos

Regla transversal: **todas** las importaciones usan el alias `@/` (RNF-09); ningún archivo nuevo importa con rutas relativas ni "bare".

### 4.1 Tipos de dominio — `src/types/domain.ts`

```ts
export type ISODateString = string;                 // "YYYY-MM-DD" (validado por lib/date.ts)
export type TimeOfDay = string;                     // "HH:mm" (validado por lib/time.ts)
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;  // 1 = lunes … 7 = domingo
export type CategorySlug = "training" | "study" | "work" | "personal" | "rest";
export type CategoryColor = "zinc" | "sky" | "amber" | "violet" | "rose";

export interface Category {
  id: string;
  name: string;
  slug: CategorySlug;
  color: CategoryColor;
  icon?: string;
  isSeed?: boolean;
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  targetDays: DayOfWeek[];        // normalizado: sin duplicados, ascendente
  createdAt: ISODateString;
  active: boolean;                // ausente/no booleano ⇒ true
  startTime?: TimeOfDay;          // inválido ⇒ undefined
  priority: boolean;              // ausente/no booleano ⇒ false
  isSeed?: boolean;
}

export interface CompletionLog {
  habitId: string;
  date: ISODateString;
  completed: boolean;
}

export interface StudySession {
  id: string;
  date: ISODateString;
  minutes: number;                // entero > 0; el resto se excluye de la suma
  subject?: string;
  createdAt: ISODateString;
}

export interface SleepLog {
  id: string;
  date: ISODateString;            // fecha de la MAÑANA en que se despierta
  hours: number;                  // 0.5..24, múltiplo de 0.5
  createdAt: ISODateString;       // desempate de duplicados (CL-05)
}

export interface WeeklyGoals {
  studyMinutesPerWeek: number;    // entero 60..4200
  sleepHoursPerNight: number;     // 0.5..24, múltiplo de 0.5
}

export interface NextAction {
  habit: Habit;
  status: "upcoming" | "overdue";
}

// Type Guards de forma (sin semántica de fecha)
export function isRecord(value: unknown): value is Record<string, unknown>;
export function isDayOfWeek(value: unknown): value is DayOfWeek;
export function isCategorySlug(value: unknown): value is CategorySlug;
export function isCategoryColor(value: unknown): value is CategoryColor;
```

> El contrato es exactamente el de §3.1 de la spec. `WeeklySchedule` (§3.1) **no** se materializa como tipo: la vista semanal es el resultado de `buildDashboardViewModel` (estado derivado, §3.1 última fila).

### 4.2 Almacenamiento — `src/types/storage.ts`

```ts
export const STORAGE_KEYS = {
  STARTUP_SHOWN: "disciplined:startupShown",
  SEED_STATE: "disciplined:seedState",
  CATEGORIES: "disciplined:categories",
  HABITS: "disciplined:habits",
  COMPLETION_LOGS: "disciplined:completionLogs",
  STUDY_SESSIONS: "disciplined:studySessions",
  SLEEP_LOGS: "disciplined:sleepLogs",
  WEEKLY_GOALS: "disciplined:weeklyGoals",
  MOTIVATIONAL_PHRASE_STATE: "disciplined:motivationalPhraseState", // legado reservado, sin uso
} as const;

export type StorageKey = keyof typeof STORAGE_KEYS;       // nombre lógico, no el string
export type StorageReadStatus = "ok" | "empty" | "corrupt";

export interface StorageRead<T> {
  data: T;
  status: StorageReadStatus;      // "empty" = clave ausente; "corrupt" = ilegible → escritura bloqueada
}

export type WriteFailureReason = "blocked" | "quota" | "unavailable";
export type WriteResult = { ok: true } | { ok: false; reason: WriteFailureReason };

export interface StartupState { hasSeenStartup: boolean }
export interface SeedState { seededAt: ISODateString; version: 1 }
```

`StorageKey` es el **nombre lógico** (`"HABITS"`), no el string completo: así `resetKey(key)` y la UI de bloqueo no pueden recibir una clave arbitraria.

### 4.3 Modelo de vista — `src/types/dashboard.ts`

```ts
export interface CompletionMetricView {
  todayPercent: number | null;    // entero 0..100; null = sin hábitos aplicables hoy
  weekAverage: number | null;     // entero 0..100; null = sin días aplicables
  hasHabitsToday: boolean;
}

export interface StudyMetricView {
  totalMinutes: number;
  goalMinutes: number;
  percent: number;                // sin tope (puede superar 100)
  cappedPercent: number;          // 0..100 para la barra
  hasSessions: boolean;           // informativo; NO controla estado vacío (RF-05)
}

export interface SleepMetricView {
  averageHours: number | null;    // 1 decimal; null = sin registros válidos
  goalHours: number;
  excludedCount: number;          // registros descartados por inválidos
  meetsGoal: boolean | null;      // null si averageHours === null
}

export interface NextActionView {
  habitId: string;
  title: string;
  startTime: TimeOfDay;
  categoryName: string | null;
  status: "upcoming" | "overdue";
}

export interface ChecklistItemView {
  habitId: string;
  title: string;
  startTime: TimeOfDay | null;
  completed: boolean;
  isSeed: boolean;
  categoryName: string | null;
}

export interface DashboardViewModel {
  weekLabel: string;
  phrase: MotivationalPhrase;
  nextAction: NextActionView | null;
  completion: CompletionMetricView;
  study: StudyMetricView;
  sleep: SleepMetricView;
  checklist: ChecklistItemView[];
  checklistCompleted: number;
  checklistTotal: number;
  todaySleepHours: number | null; // valor para prellenar el input
}
```

### 4.4 Firmas de hooks

```ts
// src/hooks/useMounted.ts
export function useMounted(): boolean;

// src/hooks/useToday.ts
export interface TodayState { today: ISODateString; now: TimeOfDay }
export function useToday(): TodayState | null;   // null antes de montar (SSR sin reloj)

// src/hooks/useDashboardData.ts
export interface DashboardData {
  categories: Category[];
  habits: Habit[];
  completionLogs: CompletionLog[];
  studySessions: StudySession[];
  sleepLogs: SleepLog[];
  weeklyGoals: WeeklyGoals;
}

export interface DashboardNotice {
  tone: "info" | "error";
  message: string;
  resetKey?: StorageKey;          // presente si el aviso ofrece "restablecer clave"
}

export interface DashboardIssues {
  corruptKeys: StorageKey[];      // claves ilegibles (escritura bloqueada)
  storageUnavailable: boolean;    // localStorage no disponible (modo privado, bloqueo)
  notice: DashboardNotice | null;
}

export interface DashboardActions {
  toggleHabit: (habitId: string, completed: boolean) => boolean;
  saveSleep: (hours: number) => boolean;
  saveGoals: (goals: WeeklyGoals) => boolean;
  resetKey: (key: StorageKey) => void;
  dismissNotice: () => void;
}

export interface UseDashboardDataResult extends DashboardData, DashboardActions {
  issues: DashboardIssues;
  loading: boolean;               // true hasta la primera lectura en cliente
}

export function useDashboardData(today: ISODateString | null): UseDashboardDataResult;
```

**Comportamiento de `useToday`**
- `null` en SSR y en el primer render de cliente; tras el montaje devuelve `{ today, now }`.
- Recalcula `today` y `now` cada **60 s** con `setInterval` mientras la pestaña está visible; al volver el foco (`focus`) y al cambiar `visibilitychange → visible` recalcula inmediatamente (CL-06, CL-32, CL-39).
- Limpia intervalo y listeners en el desmontaje.

**Comportamiento de `useDashboardData`**
- Con `today === null` no toca `localStorage` y devuelve `loading: true` (garantiza SSR sin acceso a almacenamiento).
- Con `today !== null`: (1) siembra si procede, (2) lee las 7 claves, (3) `loading: false`.
- Se suscribe a `storage` para releer la clave afectada (CL-21) y a `focus`/`visibilitychange` para releer todas las claves legibles (RF-12).
- Toda escritura fallida produce `notice` con `tone: "error"` y, si aplica, `resetKey`.

### 4.5 Props de los componentes

```ts
// ui
interface MetricCardProps { label: string; hint?: string; children: ReactNode; className?: string }
interface ProgressBarProps { percent: number; label: string }         // percent ya topado 0..100
interface EmptyStateProps { title: string; hint?: string }
interface NumberInputProps {
  id: string; label: string; value: number | ""; onChange: (value: number | "") => void;
  min: number; max: number; step: number; suffix?: string; error?: string | null; disabled?: boolean;
}
interface NoticeProps { tone: "info" | "error"; children: ReactNode; actionLabel?: string; onAction?: () => void; onDismiss?: () => void }

// dashboard
interface WeeklyHeaderProps { weekLabel: string }
interface DailyPhraseCardProps { phrase: MotivationalPhrase }
interface NextActionCardProps {
  action: NextActionView | null; now: TimeOfDay;
  onToggle: (habitId: string, completed: boolean) => void;
}
interface CompletionMetricProps { view: CompletionMetricView }
interface StudyMetricProps { view: StudyMetricView }
interface SleepMetricProps {
  view: SleepMetricView; todayValue: number | null;
  onSave: (hours: number) => boolean;
}
interface WeeklyMetricsProps {
  completion: CompletionMetricView; study: StudyMetricView; sleep: SleepMetricView;
  goals: WeeklyGoals; todaySleepHours: number | null;
  onSaveSleep: (hours: number) => boolean; onSaveGoals: (goals: WeeklyGoals) => boolean;
}
interface QuickChecklistProps {
  items: ChecklistItemView[]; completedCount: number; totalCount: number;
  onToggle: (habitId: string, completed: boolean) => void;
}
interface GoalsEditorProps { goals: WeeklyGoals; onSave: (goals: WeeklyGoals) => boolean }
interface DashboardSkeletonProps { /* sin props */ }
```

Ningún componente importa de `src/lib/` funciones de negocio; solo tipos. `GoalsEditor` y `SleepMetric` mantienen **estado de formulario local** (valor tecleado, mensaje de validación) — estado de UI, no de negocio.

### 4.6 Flujos de datos

**Flujo de "hoy" (unidireccional)**

```
useToday() ──today/now──► useDashboardData(today) ──datos──► buildDashboardViewModel({today, now, ...datos})
                                   │                                        │
                                   └──actions──────────────────────────────┴──► page.tsx ──props──► componentes
```

- `page.tsx` es el único que llama a `buildDashboardViewModel`; el resultado se pasa ya desglosado por props.
- Cambio de día: `useToday` actualiza `today` → cambia la dependencia del efecto de `useDashboardData` → recarga; `viewModel` se recalcula en el render (función pura, sin efectos).
- Ningún componente conoce `Date`, `localStorage` ni el formato ISO.

**Upsert optimista con reversión (RF-07, H-01, CL-38, CL-43)**

```
toggleHabit(habitId, completed):
  prev = completionLogs
  next = upsertCompletion(prev, habitId, today, completed)   // puro, idempotente
  setState({ completionLogs: next })                          // 1. UI responde ya
  result = setCompletionLogs(next)                            // 2. escritura síncrona
  if (!result.ok) {
    setState({ completionLogs: prev })                        // 3. reversión mismo tick
    setNotice({ tone: "error", message: describe(result.reason) })
    return false
  }
  return true
```

- `saveSleep` y `saveGoals` siguen el mismo patrón (calcular → estado → escribir → revertir si falla).
- Al ser síncrono no hay ventana en la que una relectura de foco pueda intercalarse (CL-43 se cumple por construcción); se documenta en el código con un comentario de una línea.
- `resetKey(key)`: elimina la clave, limpia la marca de bloqueo, relee la colección y siembra de nuevo si la clave era `HABITS`/`CATEGORIES` y no hay `SEED_STATE`.

---

## 5. Persistencia (`src/lib/persistence.ts`)

### 5.1 Superficie pública

```ts
export function isStorageAvailable(): boolean;

export function getStartupState(): StorageRead<StartupState>;
export function setStartupState(state: StartupState): WriteResult;

export function getCategories(): StorageRead<Category[]>;
export function setCategories(value: Category[]): WriteResult;
export function getHabits(): StorageRead<Habit[]>;
export function setHabits(value: Habit[]): WriteResult;
export function getCompletionLogs(): StorageRead<CompletionLog[]>;
export function setCompletionLogs(value: CompletionLog[]): WriteResult;
export function getStudySessions(): StorageRead<StudySession[]>;
export function setStudySessions(value: StudySession[]): WriteResult;
export function getSleepLogs(): StorageRead<SleepLog[]>;
export function setSleepLogs(value: SleepLog[]): WriteResult;
export function getWeeklyGoals(): StorageRead<WeeklyGoals>;
export function setWeeklyGoals(value: WeeklyGoals): WriteResult;
export function getSeedState(): StorageRead<SeedState | null>;
export function setSeedState(value: SeedState): WriteResult;

export function resetKey(key: StorageKey): WriteResult;
export function isWriteBlocked(key: StorageKey): boolean;
export function subscribeToStorage(listener: (key: StorageKey) => void): () => void;
```

### 5.2 Algoritmo de lectura

```
readEntity<T>(key, fallback, topShapeGuard, normalize):
  if (typeof window === "undefined" || !isStorageAvailable())  → { data: fallback, status: "empty" }
  raw = window.localStorage.getItem(STORAGE_KEYS[key])         // dentro de try/catch
  if (raw === null)                                            → { data: fallback, status: "empty" }
  parsed = JSON.parse(raw)                                     // try/catch
     catch                                                   → block(key); { fallback, "corrupt" }
  if (!topShapeGuard(parsed))                                  → block(key); { fallback, "corrupt" }
  return { data: normalize(parsed), status: "ok" }
```

| Entidad | `topShapeGuard` | `fallback` | `normalize` |
|---|---|---|---|
| `CATEGORIES` | `Array.isArray` | `[]` | `normalizeCategories` |
| `HABITS` | `Array.isArray` | `[]` | `normalizeHabits` |
| `COMPLETION_LOGS` | `Array.isArray` | `[]` | `normalizeCompletionLogs` |
| `STUDY_SESSIONS` | `Array.isArray` | `[]` | `normalizeStudySessions` |
| `SLEEP_LOGS` | `Array.isArray` | `[]` | `normalizeSleepLogs` |
| `WEEKLY_GOALS` | `isRecord` | `defaultWeeklyGoals` | `normalizeWeeklyGoals` |
| `SEED_STATE` | `isRecord` && `version === 1` | `null` | identidad |
| `STARTUP_SHOWN` | `isRecord` | `{ hasSeenStartup: false }` | identidad |

**Regla de granularidad (necesaria para CL-07/CL-42):** un fallo de **forma de nivel superior** (no es array / no es objeto) o un JSON inválido marcan la clave como **ilegible** (escritura bloqueada). Un elemento inválido **dentro** de un array se descarta individualmente y la clave queda `"ok"` — la colección es recuperable y el usuario puede seguir escribiendo sin perder el resto.

### 5.3 Algoritmo de escritura

```
writeEntity(key, value):                       // value ya normalizado por el llamador
  if (isWriteBlocked(key))                     → { ok: false, reason: "blocked" }     // CL-28
  try { localStorage.setItem(STORAGE_KEYS[key], JSON.stringify(value)); return { ok: true } }
  catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") → "quota"
    else                                                             → "unavailable"   // CL-20
  }
```

- El prefijo se aplica **una sola vez** vía `STORAGE_KEYS` (corrige el doble prefijo de `getStartupState`, RF-11/CL-37). Ningún otro módulo concatena `"disciplined:"`.
- `setStartupState` se escribe al cerrar la bienvenida y **nunca** bloquea la app si falla: la bienvenida no reaparece en la sesión actual (estado en memoria) aunque la escritura falle.

### 5.4 Bloqueo, evento `storage` y reinicio

- El bloqueo vive en un `Set<StorageKey>` a nivel de módulo: `block(key)` / `unblock(key)` / `isWriteBlocked(key)`. Es un módulo único, por lo que cualquier consumidor ve el mismo estado.
- `subscribeToStorage(listener)`: `window.addEventListener("storage", handler)`, filtra `event.key` contra `Object.values(STORAGE_KEYS)`, ignora `event.key === null` (proviene de `clear()`) y devuelve la función de limpieza.
- `resetKey(key)`: `removeItem` (try/catch) → `unblock(key)` → devuelve `WriteResult`. El hook limpia el estado en memoria y vuelve a sembrar si corresponde.

### 5.5 Siembra idempotente (RF-14, D8)

```ts
// src/lib/seeds.ts  (puro)
export interface SeedPlanInput {
  hasSeedState: boolean;
  categoriesStatus: StorageReadStatus;
  habitsStatus: StorageReadStatus;
}
export interface SeedPlan { writeCategories: boolean; writeHabits: boolean; writeSeedState: boolean }
export function resolveSeedPlan(input: SeedPlanInput): SeedPlan;
```

| Situación | `writeCategories` | `writeHabits` | `writeSeedState` |
|---|---|---|---|
| `hasSeedState` | ✗ | ✗ | ✗ |
| alguna clave `corrupt` | ✗ | ✗ | ✗ (se reevalúa tras restablecer la clave) |
| sin `SEED_STATE` y sin corrupción | `categoriesStatus === "empty"` | `habitsStatus === "empty"` | ✓ (aunque ambas colecciones tengan datos) |

La siembra es **por colección independiente** (RF-14): cada colección se siembra si está ausente o vacía, con independencia de la otra; `SEED_STATE` se escribe siempre que no exista y no haya corrupción, para que borrar los ejemplos no los resucite (CL-30).

Secuencia en `useDashboardData` (efecto de montaje, una sola vez por sesión con guarda `useRef`):

```
seed = getSeedState(); cat = getCategories(); hab = getHabits()
plan = resolveSeedPlan({ hasSeedState: seed.status === "ok", categoriesStatus: cat.status, habitsStatus: hab.status })
if (plan.writeCategories) setCategories(seedCategories)        // solo si CATEGORIES está empty
if (plan.writeHabits)     setHabits(createSeedHabits(today))   // solo si HABITS está empty
if (plan.writeSeedState)  setSeedState(buildSeedState(today))  // siempre, si no hay SEED_STATE
loadAll()                                                      // relee lo que quedó en disco
```

`SEED_STATE` se escribe **después** de las colecciones: si el proceso se interrumpe entre escrituras, la siguiente carga vuelve a sembrar (idempotente porque los ids semilla son fijos y `upsert` no duplica).

---

## 6. Decisiones de UI

### 6.1 Jerarquía y orden de las 5 secciones (RF-02)

```
<main class="min-h-screen bg-zinc-950 text-zinc-50">
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:gap-6 md:px-6 md:py-8">
    <WeeklyHeader weekLabel />                          // 1. marca + semana + navegación
    <DailyPhraseCard phrase />                          // 2. frase del día
    <NextActionCard action now onToggle />              // 3. próxima acción
    <WeeklyMetrics … >                                  // 4. métricas (grid 1 → 3 columnas) + metas
    <QuickChecklist items … />                          // 5. checklist de hoy
  </div>
  {showStartup && <Startscreen onDismiss />}
</main>
```

- Móvil (375 px): una columna, `gap-4`, `px-4`; la cabecera usa `flex-col` + `gap-2` y la navegación `flex-wrap`.
- Escritorio (`md:`): métricas en `grid gap-4 md:grid-cols-3`.
- La bienvenida se renderiza **encima** (overlay `fixed inset-0 z-50 bg-zinc-950`), no altera el layout.

### 6.2 Esqueleto SSR (RF-12, CL-06)

`DashboardSkeleton` reproduce la jerarquía (5 bloques) con bloques estáticos `bg-zinc-800/60`, **sin** `animate-pulse` (RF-15 prohíbe ese punto decorativo; se evita cualquier animación en el esqueleto). Se muestra mientras `useToday()` es `null` o `loading` es `true` — es decir, en el render previo al montaje y durante la recarga por cambio de día (RF-12) —, de modo que el HTML del servidor y el primer render de cliente coinciden byte a byte (sin lecturas de reloj ni de `localStorage`).

### 6.3 Estados vacíos (CL-01…CL-05)

| Sección | Condición | Texto |
|---|---|---|
| Próxima acción | `action === null` | "Sin acciones programadas pendientes para hoy." |
| Cumplimiento | `todayPercent === null` | "Sin hábitos para hoy." |
| Sueño | `averageHours === null` | "Sin registros de sueño esta semana." (+ "N registros descartados" si `excludedCount > 0`) |
| Checklist | `items.length === 0` | "No hay hábitos programados para hoy." |
| Metas | metas por defecto | Se muestran los valores por defecto con la nota "Meta por defecto". |

**Estudio no tiene estado vacío** (RF-05): sin sesiones, `StudyMetric` muestra siempre `0,0 h` de total, la meta vigente y `0 %` (barra a 0), nunca un `EmptyState`. Por eso `StudyMetricView` conserva `hasSessions` solo como dato informativo, no como interruptor de render.

### 6.4 Accesibilidad mínima (RF-13)

- Un `<h1>` único en `WeeklyHeader`; cada sección con `<h2>`.
- Checkbox nativo `<input type="checkbox">` con `<label htmlFor>`; el título del hábito es el label.
- `ProgressBar` con `role="progressbar"`, `aria-valuenow`, `aria-valuemin={0}`, `aria-valuemax={100}` y `aria-label` descriptivo.
- Avisos con `role="status"` (informativo) y `role="alert"` (error).
- Foco visible en todos los interactivos: `focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400`. El verde **nunca** se usa para el foco (está reservado a progreso y checks, RF-13).
- Navegación con `Link` de `next/link` y `aria-label` ("Ir a entrenamiento", etc.).

### 6.5 Escala de verde y clases concretas

`emerald-500` se usa **solo** para progreso y checks; el resto es zinc.

| Elemento | Clases |
|---|---|
| Tarjeta | `rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 md:p-5` |
| Etiqueta de sección | `text-xs font-mono uppercase tracking-wider text-zinc-400` |
| Valor neutro | `font-mono tabular-nums text-2xl font-semibold text-zinc-100` |
| Valor de progreso | `font-mono tabular-nums text-2xl font-semibold text-emerald-500` |
| Pista de progreso | `h-1.5 w-full overflow-hidden rounded-full bg-zinc-800` |
| Relleno de progreso | `h-full rounded-full bg-emerald-500` |
| Checkbox | `h-4 w-4 shrink-0 accent-emerald-500` |
| Enlace de navegación | `rounded-md border border-zinc-800 px-2.5 py-1 text-xs font-mono uppercase tracking-wider text-zinc-300 hover:border-zinc-700 hover:text-zinc-100` |
| Estado vacío | `text-sm text-zinc-400` |
| Aviso informativo | `rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-300` |
| Aviso de error | `rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100` |
| Esqueleto | `rounded bg-zinc-800/60` (altura fija por bloque) |
| Chip "semilla" | `rounded border border-zinc-700 px-1.5 py-0.5 text-xs font-mono uppercase tracking-wider text-zinc-400` |
| Input numérico | `w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 font-mono tabular-nums text-zinc-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400` |
| Texto de error de campo | `text-xs text-zinc-300` + `aria-describedby` |

Prohibiciones verificables: sin `dark:` (tema forzado), sin `emerald-400`, sin `outline-emerald` (el foco usa `outline-zinc-400`), sin valores arbitrarios nuevos (`text-[10px]` → `text-xs`), sin `animate-pulse`, sin colores fuera de la paleta zinc/emerald.

---

## 7. Manejo de errores y casos límite: mapa CL-01…CL-44

| CL | Punto del código que lo cubre |
|---|---|
| CL-01 | `lib/dashboard.ts` (vistas con `has*: false`) + `EmptyState` en próxima acción, cumplimiento, sueño y checklist; estudio muestra `0,0 h` y `0 %` (RF-05); sin errores por colecciones vacías. |
| CL-02 | `habits.getDailyCompletionRate` → `null`; `getChecklistHabits` → `[]`; `getNextAction` → `null`; `getWeeklyCompletionAverage` excluye el día. |
| CL-03 | `getNextAction` filtra completados → `null`; `QuickChecklist` con `completedCount === totalCount`; `todayPercent === 100`. |
| CL-04 | `sleep.getWeeklySleepAverage().average === null` → `SleepMetric` con `EmptyState`; el formulario de registro se renderiza siempre. |
| CL-05 | `sleep.dedupeSleepLogsByDate` (gana `createdAt` mayor; empate ⇒ último del array); el promedio usa fechas únicas como denominador. |
| CL-06 | `hooks/useToday` (tick 60 s) → cambia `today` → `getDailyPhrase`, `getHabitsForDate` y `getNextAction` se recalculan en el render. |
| CL-07 | `persistence.readEntity` (`status: "corrupt"` + `block(key)`) → `issues.corruptKeys` → `Notice` con "Restablecer" → `resetKey`. |
| CL-08 | `seeds.resolveSeedPlan` (siembra por colección: cada una `empty` se siembra) + `setSeedState`; `getStartupState` vacío ⇒ `Startscreen` una vez. |
| CL-09 | `habits.getNextAction` rama `overdue` (la hora más reciente ya pasada). |
| CL-10 | `getNextAction` exige `startTime !== undefined`; `getChecklistHabits` y las métricas no filtran por hora. |
| CL-11 | `normalize.normalizeHabits` (`priority` ausente ⇒ `false`) + fallback de `getChecklistHabits`. |
| CL-12 | `getChecklistHabits`: si no hay prioritarios aplicables hoy, devuelve todos los aplicables. |
| CL-13 | `normalizeHabits` (`targetDays` inválido ⇒ `[]`) + `getHabitsForDate` exige `targetDays.includes(dow)`. |
| CL-14 | `date.getWeekRange` (dow = 7 ⇒ lunes cinco días antes) + `formatWeekLabel`; ventanas de métricas derivadas de `getWeekDates`. |
| CL-15 | `study.getGoalProgress.percent` sin tope (se muestra > 100 %) + `cappedPercent` para `ProgressBar`; `min-w-0` en la tarjeta. |
| CL-16 | `goals.normalizeWeeklyGoals` → `defaultWeeklyGoals`; `getGoalProgress` con `goal <= 0` ⇒ `percent 0` (sin división). |
| CL-17 | `sleep.isValidSleepHours` en `SleepMetric` (rechazo en UI) + `normalizeSleepLogs` (descarte) + `excludedCount` en `getWeeklySleepAverage`. |
| CL-18 | `study.isValidStudyMinutes` + `normalizeStudySessions`; `getWeeklyStudyMinutes` solo suma válidos (no resta). |
| CL-19 | Todas las métricas son una pasada con `Map`/`Set` (sin bucles anidados); verificación V-12. |
| CL-20 | `persistence.writeEntity` captura cuota/indisponibilidad → `WriteResult`; `toggleHabit` revierte + `Notice` informativo. |
| CL-21 | `persistence.subscribeToStorage` → `useDashboardData` relee la clave afectada (upsert idempotente evita duplicados). |
| CL-22 | `date.ts` usa aritmética civil (`daysFromCivil`), sin `new Date(iso)`; `toLocalISODate` lee componentes locales. |
| CL-23 | `getHabitsForDate` filtra `active`; los `CompletionLog` históricos nunca se borran. |
| CL-24 | `habits.upsertCompletion` reemplaza el registro existente de `(habitId, date)` (idempotente). |
| CL-25 | `getNextAction` → `null` si ningún aplicable tiene `startTime` válido. |
| CL-26 | `time.isValidTimeOfDay` + `normalizeHabits` (`startTime` inválido ⇒ `undefined`). |
| CL-27 | `getWeeklySleepAverage` excluye fuera de rango y devuelve `excludedCount`; `SleepMetric` muestra "N registros descartados". |
| CL-28 | `writeEntity` → `{ ok:false, reason:"blocked" }`; `toggleHabit` revierte y `Notice` ofrece `resetKey`. |
| CL-29 | `seeds.seedCategories` + `createSeedHabits` con `categoryId` = `id` de la categoría semilla. |
| CL-30 | `getSeedState().status === "ok"` ⇒ `resolveSeedPlan` no escribe nada. |
| CL-31 | `date.formatWeekLabel` incluye año en ambos extremos cuando `start.year !== end.year`. |
| CL-32 | `useToday` recalcula en ≤ 60 s o al recuperar foco; ningún registro se reescribe con la nueva zona. |
| CL-33 | Filtro `date <= today` en `getDailyCompletionRate`, `getWeeklyCompletionAverage`, `getWeeklyStudyMinutes`, `getWeeklySleepAverage` y `getNextAction`. |
| CL-34 | `getWeeklyStudyMinutes` suma todas las sesiones válidas de la ventana (sin dedupe por franja). |
| CL-35 | `getNextAction` ordena por `toMinutes`, luego `title` (code points) y luego `id`. |
| CL-36 | `numbers.roundHalfUp` (`Math.round((v + EPSILON) * 10^d) / 10^d`); porcentajes con `d = 0`. |
| CL-37 | `persistence.getStartupState` lee `STORAGE_KEYS.STARTUP_SHOWN` (clave simple, sin doble prefijo). |
| CL-38 | `toggleHabit`: `setState(prev)` antes del aviso; `localStorage` queda intacto porque la escritura falló. |
| CL-39 | Listeners `visibilitychange`/`focus` en `useToday` (fecha) y en `useDashboardData` (relectura). |
| CL-40 | `getNextAction` rama `overdue` cuando hay pendientes con hora ya pasada (nunca `null`). |
| CL-41 | `dashboard.ts`: `meetsGoal = averageHours !== null && averageHours >= goalHours` → color `emerald-500` en `SleepMetric`. |
| CL-42 | `date.isValidISODate` en todos los `normalize*`; el registro se descarta y no se reescribe (no hay escritura en lectura). |
| CL-43 | Escritura síncrona (D-P6): no existe ventana pendiente; la relectura de foco ocurre después de escribir. |
| CL-44 | `page.tsx`: `min-h-screen bg-zinc-950 text-zinc-50` sin variantes `dark:`; `Startscreen` sin cambios. |

---

## 8. Estrategia de verificación manual (Chrome DevTools MCP)

Precondición: `npm run dev` en `http://localhost:3000`. Sin tests automatizados (RNF-10). Cada flujo se ejecuta también con viewport de **375 px**.

| ID | Flujo | Pasos | Qué se verifica |
|---|---|---|---|
| **V-01** | Primera visita | DevTools → Application → Local Storage → borrar todo; recargar | Semilla (5 categorías + 4 hábitos), 5 secciones en orden, bienvenida una vez, consola sin errores. |
| **V-02** | Idempotencia de semilla | Recargar 2 veces | No reaparece la bienvenida; `SEED_STATE` existe; hábitos siguen siendo 4. |
| **V-03** | Próxima acción | Completar desde la tarjeta; desmarcar | La tarjeta pasa a la siguiente acción; checklist y % cambian en la misma interacción. |
| **V-04** | Checklist | Marcar 2 hábitos | Contador `2 / N`, barra y % de hoy coherentes; tras recargar persiste. |
| **V-05** | Sueño | Registrar `7,5`; luego `26`, `0`, `7,25` | `7,5` se guarda y actualiza el promedio; los inválidos se rechazan en la UI con mensaje. |
| **V-06** | Metas | Cambiar estudio a `420` min y sueño a `7,5` | Persisten tras recargar; metas inválidas (`0`, `5000`, `7,25`) se rechazan. |
| **V-07** | Clave ilegible | Consola: `localStorage.setItem('disciplined:habits','{no-json')` → recargar | Estado vacío + aviso + checkbox no escribe; "Restablecer" recupera la vista y vuelve a sembrar. |
| **V-08** | Fallo de escritura | Consola: `Storage.prototype.setItem = function(){ throw new DOMException('full','QuotaExceededError') }` → marcar hábito | El check vuelve a su estado previo, aparece aviso no bloqueante, `localStorage` sin cambios. |
| **V-09** | Cuota/indisponibilidad total | Consola: sobrescribir `localStorage.getItem` para lanzar → recargar | Dashboard operable con valores por defecto + aviso; consola sin excepciones no capturadas. |
| **V-10** | Dos pestañas | Abrir `/` en dos pestañas; marcar en una | La otra se realinea por el evento `storage`, sin duplicar registros. |
| **V-11** | Cambio de día | DevTools → cambiar la fecha del sistema (o `Emulation` de zona) y esperar ≤ 60 s; también probar `focus` | Frase, rango, checklist y métricas cambian; no se pierde nada. |
| **V-12** | Volumen | Consola: sembrar ~1 500 `CompletionLog`/`StudySession`/`SleepLog`; recargar con Performance grabando | Sin long tasks > 50 ms; primera interacción sin spinner. |
| **V-13** | Tema claro | DevTools → Rendering → `prefers-color-scheme: light` | El dashboard sigue en `zinc-950`; `emerald-500` solo en progreso/checks. |
| **V-14** | Responsive | 375 px y 320 px | Una columna, sin scroll horizontal, 4 enlaces visibles y accionables, textos sin truncar. |
| **V-15** | Accesibilidad básica | Tab por toda la página | Foco visible en enlaces, checkboxes e inputs; `aria-valuenow` correcto en barras; avisos anunciados (`role`). |

**Qué revisar siempre en consola:** cero errores, cero warnings de hidratación (`Hydration failed…`), cero avisos de `key` duplicada.

Snippets de apoyo (consola del navegador, no forman parte del código):

```js
// V-07
localStorage.setItem('disciplined:habits', '{no-json'); location.reload();
// V-08
const orig = Storage.prototype.setItem;
Storage.prototype.setItem = function () { throw new DOMException('full', 'QuotaExceededError'); };
// restaurar
Storage.prototype.setItem = orig;
// V-12
const logs = Array.from({ length: 1500 }, (_, i) => ({
  habitId: 'seed-study', date: `2026-${String(1 + (i % 12)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`,
  completed: i % 2 === 0,
}));
localStorage.setItem('disciplined:completionLogs', JSON.stringify(logs));
```

---

## 9. Riesgos y mitigaciones

| ID | Riesgo | Impacto | Mitigación | Estado |
|---|---|---|---|---|
| **R-01** | **El alias `@/` no resuelve con el `tsconfig.json` actual.** Con `baseUrl: "./src"` y `"@/*": ["./src/*"]`, TS resuelve `@/types` a `src/src/types` (inexistente). Hoy compila solo porque el código existente usa imports "bare" (`components/ui/Startscreen`) y relativos. RNF-09 exige `@/` en todo archivo nuevo. | **Bloqueante**: sin corrección, ningún archivo nuevo compila. | **Opción A — adoptada:** mantener `"baseUrl": "./src"` y cambiar `"@/*": ["./src/*"]` por `"@/*": ["./*"]` (una línea, sin reescribir los imports existentes). **Opción B — descartada:** `baseUrl: "."` + `"@/*": ["./src/*"]` (canónico, pero obliga a reescribir los imports bare en el mismo commit, fuera del alcance de T1). | **Resuelto en T1** (se confirma con la aprobación de este plan) |
| R-02 | `src/components/ui/StartscreenChecker.tsx` no es TypeScript válido ⇒ `npx tsc --noEmit` falla ya en el estado inicial. | Bloquea el criterio de calidad de todas las tareas. | Se elimina en **T1** (antes de cualquier otra cosa). Sin importadores: riesgo nulo. | Mitigado por orden de tareas |
| R-03 | Desajuste de hidratación por leer `Date`/`localStorage` en el primer render. | Error de consola, UI inestable. | `useToday` devuelve `null` hasta montar; `useDashboardData(null)` no lee; `DashboardSkeleton` estático idéntico en servidor y cliente. | Mitigado por diseño |
| R-04 | Reescritura de `persistence.ts` mientras `MotivationalBanner` aún importa sus helpers. | Repo roto entre tareas. | La retirada del legado (banner + frases) ocurre en **T1**, antes de reescribir `persistence.ts` (T5). | Mitigado por orden |
| R-05 | `localeCompare`/`Intl` dependientes del locale. | Orden y formato no deterministas (CL-35, RF-13). | Comparación por code points y tabla propia de meses (D-P8); grep de `localeCompare|toLocaleString|Intl` en la revisión final. | Mitigado por diseño |
| R-06 | Cálculo retroactivo al editar metas (`StudySession`/`SleepLog` antiguos). | El usuario ve cambiar cifras históricas. | Aceptado explícitamente por la spec (§8); se documenta en `MEMORY.md` como comportamiento esperado. | Aceptado |
| R-07 | Dos pestañas sembrando a la vez en la primera visita. | Semilla duplicada. | Ids semilla fijos + `upsert`/`resolveSeedPlan` + `SEED_STATE`; ventana real de milisegundos en un uso monousuario. | Aceptado |
| R-08 | `cacheComponents: true` + página cliente: cualquier acceso a `localStorage` en render rompería el prerender. | Fallo de build. | Todo acceso a almacenamiento ocurre en efectos (`useEffect`), nunca en render ni en el cuerpo del componente. | Mitigado por diseño |
| R-09 | `npm run lint` falla por `<a href>` en la navegación. | Bloquea el criterio de calidad. | `next/link` en `WeeklyHeader` (D-P9). | Mitigado por diseño |
| R-10 | `tsconfig_new.json` (raíz) es un artefacto muerto no referenciado. | Confusión futura. | Recomendación de borrado **fuera del alcance** de esta spec; no se incluye en ninguna tarea. | Recomendación |
| R-11 | `src/app/layout.tsx` declara `lang="en"` con UI en español. | Metadato de accesibilidad incorrecto. | Recomendación de cambiar a `lang="es"`; fuera del alcance de la spec (no hay RF que lo exija). | Recomendación |
| R-12 | `crypto.randomUUID()` no disponible en contextos no seguros. | No se pueden crear ids nuevos de `SleepLog`. | Solo se genera id al **crear** el registro (el upsert conserva el existente); fallback documentado `${date}-${Date.now()}` dentro del hook, nunca en `lib/`. | Mitigado por diseño |

---

## 10. Trazabilidad RF → archivos y tareas

| RF | Archivos responsables | Tareas |
|---|---|---|
| RF-01 Frase diaria | `lib/phrases.ts`, `lib/date.ts` (`getDayOfYear`), `components/dashboard/DailyPhraseCard.tsx` | T3, T4, T8 |
| RF-02 Cabecera y navegación | `lib/date.ts` (`getWeekRange`, `formatWeekLabel`), `components/dashboard/WeeklyHeader.tsx` | T3, T8 |
| RF-03 Próxima acción | `lib/time.ts`, `lib/habits.ts` (`getNextAction`), `components/dashboard/NextActionCard.tsx` | T3, T4, T9 |
| RF-04 Cumplimiento | `lib/habits.ts`, `components/dashboard/metrics/CompletionMetric.tsx`, `ui/ProgressBar.tsx` | T3, T8, T9 |
| RF-05 Estudio | `lib/study.ts`, `lib/numbers.ts`, `components/dashboard/metrics/StudyMetric.tsx` | T3, T4, T8 |
| RF-06 Sueño | `lib/sleep.ts`, `components/dashboard/metrics/SleepMetric.tsx`, `ui/NumberInput.tsx` | T3, T4, T7, T8 |
| RF-07 Checklist | `lib/habits.ts` (`getChecklistHabits`, `upsertCompletion`), `components/dashboard/QuickChecklist.tsx` | T4, T9 |
| RF-08 Metas | `lib/goals.ts`, `components/dashboard/GoalsEditor.tsx`, `ui/NumberInput.tsx` | T4, T7, T9 |
| RF-09 Persistencia y fallos | `lib/persistence.ts`, `lib/normalize.ts`, `ui/Notice.tsx`, `hooks/useDashboardData.ts` | T5, T7, T10 |
| RF-10 Cálculos puros | `lib/date.ts`, `numbers.ts`, `time.ts`, `habits.ts`, `study.ts`, `sleep.ts`, `goals.ts`, `seeds.ts`, `dashboard.ts` | T3, T4, T6 |
| RF-11 Primera visita y vacíos | `lib/seeds.ts`, `lib/persistence.ts` (`getStartupState`), `app/page.tsx`, `ui/EmptyState.tsx` | T1, T4, T7, T9 |
| RF-12 Cambio de día, relectura y render previo al montaje | `hooks/useToday.ts`, `hooks/useDashboardData.ts`, `components/dashboard/DashboardSkeleton.tsx`, `app/page.tsx` | T6, T9 |
| RF-13 Diseño y localización | `components/**`, `lib/numbers.ts`, `app/page.tsx` | T3, T7, T8, T9 |
| RF-14 Semilla | `lib/seeds.ts`, `hooks/useDashboardData.ts` | T4, T6 |
| RF-15 Retirada de UI no conforme y legado | borrados de T1, `app/page.tsx` | T1, T9, T10 |

---

## 11. Validación de calidad esperada

Tras **cada** tarea, en este orden:

```bash
npm run lint
npx tsc --noEmit
```

- `npm run build` **no** se ejecuta en tareas intermedias; solo al cerrar el hito (después de T10), respetando `lint → typecheck → build`.
- Comprobaciones de conformidad al cierre (grep sobre `src/`): `any`, `dark:`, `emerald-400`, `outline-emerald` (el foco debe ser neutro), `animate-pulse`, `toISOString(`, `localeCompare`, `Intl`, `toLocaleString`, imports relativos (`from "../`, `from "./`), `from "components/`, `from "lib/`.
- Criterio de cierre del hito: las 15 verificaciones V-01…V-15 en verde y `MEMORY.md` actualizado (≤ 50 líneas) con el estado de la fase, el contrato de datos y los riesgos aceptados (R-06).

# 001 — Dashboard Principal (`/`)

**Estado:** borrador (revisión 2 — pendiente de aprobación del usuario)
**Fase SDD:** 2b — Corrección de la especificación tras auditoría QA
**Depende de:** decisiones D1–D11 aprobadas por el usuario (vinculantes)
**Resuelve:** hallazgos H-01…H-36 del reviewer (tabla completa en §10)

**Alcance de este documento:** define el **QUÉ** funcional y el **POR QUÉ** de cada regla. Además, y de forma explícita por mandato de `AGENTS.md` (*"Definir con precisión la jerarquía de componentes y las firmas de los hooks en la especificación"*), este documento fija el **contrato de datos** (tipos de dominio y claves de almacenamiento) y las **responsabilidades** de componentes y hooks. Los nombres definitivos de archivos, la organización interna de módulos y cualquier detalle de implementación se confirman en `plan.md`; si el plan renombra un archivo, el contrato de datos y las responsabilidades de §7 no cambian.

---

## 1. Contexto y objetivo

`Disciplined` es una aplicación personal de disciplina diaria y seguimiento semanal. Hoy la ruta `/` muestra únicamente una pantalla de bienvenida (`Startscreen`) y un placeholder de "Resumen Semanal" con progreso fijo en `0%`; la frase motivacional existente (`MotivationalBanner`) se oculta tras mostrarse una vez al día y calcula la fecha con `toISOString()` (UTC), lo que produce desfases de día en zonas horarias distintas de UTC.

Además, el estado de bienvenida **nunca llega a leerse**: `src/lib/persistence.ts:6` concatena `STORAGE_PREFIX` a una clave que ya lo incluye (`disciplined:disciplined:startupShown`), mientras que la escritura usa la clave simple (`disciplined:startupShown`). El resultado es que la bienvenida se muestra en cada recarga.

**Objetivo:** convertir `/` en el **centro de control diario** del usuario: un único vistazo que responda, en menos de cinco segundos, a cuatro preguntas:

1. ¿Cuál es mi frase de enfoque de hoy?
2. ¿Qué es lo siguiente que tengo que hacer?
3. ¿Cómo va mi semana en hábitos, estudio y sueño?
4. ¿Qué marco ahora mismo sin cambiar de pantalla?

La vista debe ser sobria, monocromática y de lectura rápida, y debe funcionar íntegramente con datos locales (LocalStorage), sin backend.

**Actores:**

- **Usuario único (dueño de los datos):** consulta su estado del día, registra cumplimiento de hábitos, horas de estudio y sueño de la noche anterior, y ajusta sus metas semanales.
- **Sistema (dashboard):** deriva todas las métricas a partir de datos persistidos y de la fecha local actual, sin intervención del usuario.

**Principio rector:** la fecha "hoy" se determina **siempre** en hora local (`YYYY-MM-DD`) y se inyecta como parámetro en todos los cálculos; ningún cálculo interno lee el reloj del sistema por su cuenta.

### 1.1 Decisiones de negocio vinculantes

| ID | Decisión |
|---|---|
| D1 | Persistencia exclusiva en LocalStorage con claves controladas y validación de datos externos. |
| D2 | Ciclo semanal fijo de lunes a domingo. |
| D3 | `Habit.startTime` opcional para ordenar la Próxima Acción. |
| D4 | `Habit.priority` define el Checklist Rápido, con fallback a todos los hábitos del día. |
| D5 | Frase diaria determinista por fecha, sin estado persistido. |
| D6 | Metas de estudio y sueño editables desde el dashboard. |
| D7 | Registro rápido de sueño de la noche anterior desde el dashboard. |
| **D8** | Primera visita: si las claves no existen, se siembran las 5 categorías base y 4 hábitos de ejemplo con `priority` y `startTime`, marcados como datos semilla y borrables. Nunca se sobrescriben datos existentes. Hace verificables RF-03/04/07 sin `HabitForm`. |
| **D9** | "Próxima Acción Inmediata" ignora los hábitos ya completados hoy. Si todas las horas de hoy ya pasaron, muestra la más reciente etiquetada "Atrasado" (nunca estado vacío en ese supuesto). |
| **D10** | `Startscreen` se muestra **una sola vez por dispositivo**, persistido en `STARTUP_SHOWN`; se corrige el doble prefijo. Cambio observable: usuarios existentes que ya la cerraron dejarán de verla (ver §3.2). |
| **D11** | La ventana semanal de sueño es por **fecha de registro** (lunes–domingo), la misma ventana que el resto de métricas, con el desfase documentado en RF-06. |

---

## 2. Alcance

### 2.1 Dentro de alcance

- Vista `/` con cinco secciones: Frase Diaria de Enfoque, Próxima Acción Inmediata, Métricas de Rendimiento Semanal (cumplimiento, estudio, sueño), Checklist Rápido del Día y Cabecera de semana + navegación.
- Modelo de datos de dominio: `Habit`, `Category`, `CompletionLog`, `StudySession`, `SleepLog` y metas semanales (`WeeklyGoals`).
- Nuevas claves de `STORAGE_KEYS` y helpers tipados de persistencia con validación de datos externos y compatibilidad hacia atrás.
- **Datos semilla** de primera visita (categorías base + hábitos de ejemplo marcados como tales).
- Funciones puras de cálculo (fechas, porcentajes, promedios, próxima acción) que reciben "hoy" como parámetro.
- Registro rápido de sueño de la noche anterior desde el propio dashboard.
- Edición de metas (estudio semanal y sueño por noche) desde el propio dashboard, sin ruta `/settings`.
- Reemplazo del banner motivacional actual por la Frase Diaria de Enfoque determinista, con retirada del código legado.
- Corrección del estado de bienvenida (`Startscreen` una vez por dispositivo).
- Retirada de los elementos de la UI actual que incumplen la identidad visual (RF-15).

### 2.2 Fuera de alcance (explícito)

- Rutas `/gym`, `/study`, `/tasks`, `/calendar`: **solo se enlazan**; sus páginas y contenidos se definen en otras specs. No se crean placeholders ni páginas vacías.
- Alta, edición, desactivación o borrado de hábitos (`HabitForm`) y gestión de categorías. El dashboard **consume** hábitos existentes y, en primera visita, siembra ejemplos (RF-14). El borrado de los datos semilla se hará con el mismo mecanismo que cualquier hábito, que pertenece a otra spec; esta spec solo garantiza que la semilla no reaparezca.
- Rachas avanzadas (streaks con historial, récords, "mejor racha"), gráficas, informes históricos y comparativas entre semanas.
- Notificaciones, recordatorios push, correo o cualquier canal externo.
- Supabase/PostgreSQL o cualquier backend. La persistencia de esta spec es exclusivamente LocalStorage.
- Autenticación, multiusuario, sincronización entre dispositivos.
- Exportación/importación de datos (más allá del restablecimiento explícito de una clave ilegible descrito en RF-09).
- Registro de estudio detallado por materia o temporizador/pomodoro (solo se consumen sesiones ya existentes).
- Accesibilidad avanzada más allá de lo indicado en RF-13 (sin auditoría WCAG formal).
- Tests automatizados (ver RNF-10 y §8).

---

## 3. Contrato de datos

> Convenciones transversales:
> - `ISODateString` = `string` en formato `YYYY-MM-DD`, **siempre fecha local**.
> - `TimeOfDay` = `string` en formato `HH:mm` (24 h, dos dígitos), validado con `^([01]\d|2[0-3]):[0-5]\d$`.
> - Identificadores en inglés; textos de interfaz en español.
> - Toda lectura de LocalStorage se valida con `unknown` + Type Guards; ningún `any`.
> - Comparaciones de hora **siempre** en minutos desde medianoche (`h * 60 + m`), nunca lexicográficas ni por `Date`.
> - Formato numérico en pantalla: coma decimal, sin `Intl`, sin `toLocaleString` (ver RF-13).

### 3.1 Entidades

```ts
// Fecha local en formato "YYYY-MM-DD"
export type ISODateString = string
// Hora local en formato "HH:mm" (24 h); válida solo si cumple ^([01]\d|2[0-3]):[0-5]\d$
export type TimeOfDay = string
// Día de la semana: 1 = lunes ... 7 = domingo
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7
// Categorías base cerradas
export type CategorySlug = "training" | "study" | "work" | "personal" | "rest"
// Paleta permitida: nunca verde (reservado a progreso) ni valores libres
export type CategoryColor = "zinc" | "sky" | "amber" | "violet" | "rose"

export interface Category {
  id: string
  name: string              // "Entrenamiento", "Estudio", "Trabajo", "Personal", "Descanso"
  slug: CategorySlug
  color: CategoryColor      // identificador visual secundario; el verde está excluido
  icon?: string
  isSeed?: boolean          // true si procede de la semilla de primera visita (D8)
}

export interface Habit {
  id: string
  title: string
  description?: string
  categoryId: string
  targetDays: DayOfWeek[]   // días de la semana en que aplica
  createdAt: ISODateString
  active: boolean
  startTime?: TimeOfDay     // D3 — hora planificada; si es inválida se ignora (ver RF-03)
  priority: boolean         // D4 — entra en el Checklist Rápido
  isSeed?: boolean          // true si procede de la semilla de primera visita (D8)
}

export interface CompletionLog {
  habitId: string
  date: ISODateString       // día del cumplimiento
  completed: boolean
}
// Clave lógica: (habitId, date) — como máximo UN registro por hábito y día.
// Sin timestamps: no hay ordenación ni resolución de conflictos que los requiera (H-22).

export interface StudySession {
  id: string
  date: ISODateString       // día en que se estudió
  minutes: number           // entero > 0; los demás valores se excluyen (H-29)
  subject?: string          // etiqueta libre opcional
  createdAt: ISODateString
}

export interface SleepLog {
  id: string
  date: ISODateString       // fecha de la MAÑANA en que se despierta
  hours: number             // rango único canónico: 0.5–24, múltiplo de 0.5 (H-04)
  createdAt: ISODateString
}
// Clave lógica: (date) — como máximo UN registro de sueño por noche.
// Convención: el sueño "de la noche anterior" que el usuario registra hoy
// se guarda con date = hoy (la noche 27→28 se registra el 28 con date "2026-10-28").

export interface WeeklyGoals {
  studyMinutesPerWeek: number   // por defecto 600 (= 10 h); entero 60–4200
  sleepHoursPerNight: number    // por defecto 8; 0.5–24, múltiplo de 0.5 (mismo rango que SleepLog.hours)
}
```

**Rango único de sueño (normativo).** `0.5 ≤ hours ≤ 24`, múltiplo de `0.5`. Este rango lo usan el modelo, la validación de lectura, la validación del formulario y la meta `WeeklyGoals.sleepHoursPerNight`. Queda **eliminada** cualquier mención al rango 4–12 de la revisión anterior.

### 3.2 `STORAGE_KEYS`

Claves existentes (se conservan; no se renombran para no romper datos):

| Constante | Valor | Estado |
|---|---|---|
| `STARTUP_SHOWN` | `"disciplined:startupShown"` | se conserva y **se conecta** (D10) |
| `MOTIVATIONAL_PHRASE_STATE` | `"disciplined:motivationalPhraseState"` | **legado**: constante reservada, deja de leerse y escribirse (RF-01, RF-15) |

Claves nuevas:

| Constante | Valor | Contenido |
|---|---|---|
| `HABITS` | `"disciplined:habits"` | `Habit[]` |
| `COMPLETION_LOGS` | `"disciplined:completionLogs"` | `CompletionLog[]` |
| `STUDY_SESSIONS` | `"disciplined:studySessions"` | `StudySession[]` |
| `SLEEP_LOGS` | `"disciplined:sleepLogs"` | `SleepLog[]` |
| `WEEKLY_GOALS` | `"disciplined:weeklyGoals"` | `WeeklyGoals` (objeto, no array) |
| `CATEGORIES` | `"disciplined:categories"` | `Category[]` (solo lectura en esta spec, salvo semilla RF-14) |
| `SEED_STATE` | `"disciplined:seedState"` | `{ seededAt: ISODateString; version: 1 }` — marcador de siembra única |

Reglas de persistencia:

- Las claves ya incluyen el prefijo `disciplined:`; **no debe añadirse un prefijo adicional** al leer ni al escribir. Hoy `src/lib/persistence.ts:6` lee `disciplined:disciplined:startupShown` mientras escribe `disciplined:startupShown`; se corrige la lectura a la clave simple.
- **Cambio observable documentado (H-31, D10):** como la lectura con doble prefijo nunca encontró datos, hasta hoy la bienvenida se mostraba en cada recarga. Al corregirla, un usuario que ya pulsó "Empezar" (y por tanto tiene `disciplined:startupShown = {"hasSeenStartup":true}` escrito por `setStartupState`) **dejará de ver la bienvenida**. No se migran datos: la escritura siempre usó la clave simple y es la que ahora se lee.
- Contenido **ausente** o `null` ⇒ se devuelve el valor por defecto tipado (`[]`, metas por defecto) sin borrar nada y **sin bloquear escrituras**: la primera escritura normal crea la clave.
- JSON inválido o forma no recuperable ⇒ clave **ilegible**: se lee con el valor por defecto, se **bloquean todas las escrituras** sobre esa clave y se ofrece un restablecimiento explícito por acción del usuario (RF-09). Nunca se sobrescribe en silencio.
- El valor por defecto usado al leer nunca se escribe en disco de forma automática en ninguno de los dos casos anteriores.
- Escritura de `CompletionLog` y `SleepLog` es **upsert** por clave lógica (nunca duplica).
- Si LocalStorage no está disponible o lanza error de cuota, la interfaz sigue siendo legible con datos por defecto y muestra un aviso discreto no bloqueante (RF-09).
- `SEED_STATE` no es una marca de versión de esquema: solo registra que la siembra ya ocurrió, para que borrar los ejemplos no los resucite (RF-14). No se introduce una marca de versión de esquema general (justificación en §3.5).

### 3.3 Metas por defecto

| Meta | Valor por defecto | Rango válido |
|---|---|---|
| Estudio semanal | 600 min (10 h) | 60–4200 min (1–70 h), entero |
| Sueño por noche | 8 h | 0.5–24 h, múltiplo de 0.5 |

Se persisten en `WEEKLY_GOALS`. Si no existen, se usan los valores por defecto sin escribir en disco hasta que el usuario los modifique.

### 3.4 Datos semilla (D8)

Se escriben una sola vez: solo cuando `SEED_STATE` no existe y la colección correspondiente está ausente o vacía (ver RF-14). Todos llevan `isSeed: true`.

**Categorías (5).** Las categorías semilla usan **`id = slug`** (`id: "training"`, `id: "study"`, …) para que los hábitos semilla puedan referenciarlas con un `id` estable y no queden sin etiqueta por la política de §3.5.

| `id` | `slug` | `name` | `color` |
|---|---|---|---|
| `training` | `training` | Entrenamiento | `sky` |
| `study` | `study` | Estudio | `amber` |
| `work` | `work` | Trabajo | `violet` |
| `personal` | `personal` | Personal | `zinc` |
| `rest` | `rest` | Descanso | `rose` |

**Hábitos de ejemplo (4).** La columna `categoryId` referencia el `id` de la categoría semilla correspondiente.

| `title` | `categoryId` | `targetDays` | `startTime` | `priority` |
|---|---|---|---|---|
| Entrenamiento de fuerza | `training` | 1, 3, 5 | `07:30` | `true` |
| Sesión de estudio | `study` | 1–5 | `18:00` | `true` |
| Lectura de 20 minutos | `personal` | 1–7 | `21:30` | `false` |
| Revisión semanal | `work` | 7 | `19:00` | `true` |

Los títulos son contenido de ejemplo, no texto contractual; la estructura sí lo es: 4 hábitos, 3 con `priority: true`, 4 con `startTime` válido, `categoryId` resoluble contra las categorías semilla, cobertura de los 7 días y **al menos un hábito aplicable cada día de la semana**.

### 3.5 Compatibilidad hacia atrás (política campo por campo)

Se aplica en **lectura**, sin reescribir el dato del usuario. Un elemento inválido se descarta individualmente; el resto de la colección se conserva.

**`Habit`**

| Campo | Situación | Política |
|---|---|---|
| `id` | ausente o no `string` | descartar el elemento |
| `id` | duplicado | conservar la primera aparición; descartar las siguientes |
| `title` | ausente, no `string` o vacío tras `trim()` | descartar el elemento |
| `categoryId` | ausente o no `string` | descartar el elemento |
| `categoryId` | apunta a una categoría inexistente | conservar el hábito; se muestra sin etiqueta de categoría |
| `targetDays` | ausente, vacío o con valores fuera de 1–7 | `[]` ⇒ el hábito no aplica ningún día (no aparece en la vista ni en métricas) |
| `targetDays` | con duplicados o desordenado | deduplicar y ordenar ascendente |
| `createdAt` | `ISODateString` inválido | descartar el elemento |
| `createdAt` | fecha futura | conservar tal cual; `createdAt` no interviene en ningún cálculo de esta spec |
| `active` | ausente o no booleano | `true` (un hábito antiguo se considera activo) |
| `priority` | ausente o no booleano | `false` |
| `startTime` | ausente | `undefined` (sin hora planificada) |
| `startTime` | no cumple `^([01]\d|2[0-3]):[0-5]\d$` | `undefined` (se ignora la hora: el hábito sale de RF-03, permanece en checklist y métricas) |
| `description` | ausente o no `string` | `undefined` |
| `isSeed` | ausente o no booleano | `false` |

**Fechas (`ISODateString`)**

| Situación | Política |
|---|---|
| `"2026-02-30"`, `"2026-13-01"`, `"28/10/2026"`, `"2026-2-3"` | inválido: el registro se descarta de los cálculos y no se muestra; no se reescribe en disco |
| Formato válido pero `date > hoy` | el registro se conserva en disco pero **se ignora en todas las métricas** (H-25) |
| `CompletionLog.completed` no booleano | descartar el registro |
| `CompletionLog.habitId` sin hábito asociado | conservar; no cuenta en ningún cálculo |
| `StudySession.minutes` ≤ 0, no entero o no numérico | excluir la sesión de la suma (H-29) |
| `SleepLog.hours` fuera de 0.5–24 o no múltiplo de 0.5 | excluir del promedio y señalar el conteo (RF-06) |

**Marca de versión de esquema: omitida.** Justificación: la aplicación es local, de un solo usuario y sin escritores externos; los defaults de lectura más el restablecimiento explícito de claves ilegibles cubren la evolución del modelo, y una marca de versión obligaría a mantener rutas de migración sin consumidores. `SEED_STATE` cumple una función distinta (siembra única) y no se interpreta como versión.

---

## 4. Requisitos funcionales (EARS)

Patrones usados: **Ubicuo** ("El sistema deberá…"), **Evento** ("CUANDO…, el sistema deberá…"), **Estado no deseado** ("SI…, ENTONCES el sistema deberá…"), **Estado** ("MIENTRAS…, el sistema deberá…").

### RF-01 — Frase Diaria de Enfoque

**Requisito.** El sistema deberá mostrar en `/` una frase breve de enfoque sobre disciplina y constancia, en español, seleccionada de forma determinista a partir de la fecha local.

- El sistema deberá mostrar exactamente una frase, calculada como `indice = diaDelAnio(hoy) % totalFrases`.
- El sistema deberá obtener la fecha local de "hoy" en formato `YYYY-MM-DD` sin `toISOString()` ni conversiones UTC.
- El sistema **no** deberá persistir estado de la frase en LocalStorage: la selección es una función pura de la fecha, idempotente e imposible de desincronizar. `MOTIVATIONAL_PHRASE_STATE` queda como legado reservado y no se escribe.
- MIENTRAS el dashboard esté visible, el sistema deberá mantener la frase como sección fija (no efímera, no descartable).
- El sistema deberá usar una lista nueva, sobria y homogénea en español, de al menos 12 frases, cada una con **longitud máxima exacta de 120 caracteres** (incluidos espacios y signos), tono neutro y sin signos de exclamación múltiples.
- CUANDO cambie el día calendario (medianoche detectada o retorno a la pestaña), el sistema deberá recalcular la frase.
- El sistema deberá retirar `MotivationalBanner` y `defaultMotivationalPhrases` (frases 3 y 4 en inglés, no reutilizables) al implementar esta spec: la lista nueva los sustituye y no queda la antigua como fallback.

**Criterios de aceptación**

- [ ] Con la misma fecha local y la misma lista, la frase es idéntica en recargas, pestañas y dispositivos.
- [ ] Dos días consecutivos muestran frases distintas cuando el total de frases > 1.
- [ ] El 1 de enero y el 31 de diciembre no producen errores ni índices fuera de rango.
- [ ] En una zona horaria UTC−5, a las 21:00 del día 28, la frase corresponde al día 28.
- [ ] La frase permanece visible después de recargar el mismo día.
- [ ] Ninguna frase de la lista supera los 120 caracteres (comprobación de longitud sobre la lista completa).
- [ ] El código de la vista no contiene `toISOString()` para calcular la fecha del día.
- [ ] No quedan referencias a `MotivationalBanner` ni a `defaultMotivationalPhrases`.

### RF-02 — Cabecera: rango de la semana y navegación

**Requisito.** El sistema deberá mostrar una cabecera con el rango de fechas de la semana en curso y los accesos a las secciones principales.

- El sistema deberá mostrar el rango lunes–domingo con el formato `d mmm – d mmm` en español (p. ej. `26 oct – 1 nov`), sin número de semana y sin la etiqueta "Semana en curso".
- El sistema deberá considerar la semana siempre de **lunes a domingo**; el domingo pertenece a la semana que empezó el lunes anterior.
- SI el rango cruza el cambio de año, ENTONCES el sistema deberá incluir el año en ambos extremos (`29 dic 2025 – 4 ene 2026`).
- El sistema deberá incluir exactamente cuatro enlaces: `/gym`, `/study`, `/tasks` y `/calendar`, visibles en escritorio y en móvil.
- El sistema **no** deberá crear ni renderizar contenido de esas rutas.
- CUANDO el usuario seleccione un enlace, el sistema deberá navegar a esa ruta.

**Criterios de aceptación**

- [ ] Un miércoles (p. ej. el 28 oct 2026), la cabecera muestra el lunes anterior y el domingo siguiente (`26 oct – 1 nov`).
- [ ] Un domingo (p. ej. el 1 nov 2026), la cabecera muestra el lunes cinco días antes (`26 oct – 1 nov`), no el lunes siguiente.
- [ ] La semana del 29 dic 2025 se muestra como `29 dic 2025 – 4 ene 2026`.
- [ ] No aparece ningún número de semana ni el texto "Semana en curso" en la cabecera.
- [ ] Existen exactamente cuatro enlaces de navegación con destino correcto.
- [ ] En viewport de 375 px los enlaces son visibles y accionables sin scroll horizontal.
- [ ] No existen páginas nuevas bajo `/gym`, `/study`, `/tasks` ni `/calendar` como parte de esta spec.

### RF-03 — Próxima Acción Inmediata

**Requisito.** El sistema deberá destacar en una tarjeta la siguiente acción concreta del día y permitir completarla desde la propia tarjeta.

- El sistema deberá considerar únicamente hábitos con `active: true`, cuyo `targetDays` incluya el día de hoy y cuyo `startTime` sea válido según `^([01]\d|2[0-3]):[0-5]\d$`.
- El sistema deberá comparar horas en minutos desde medianoche (`h * 60 + m`), nunca de forma lexicográfica.
- El sistema deberá excluir los hábitos ya completados hoy (D9).
- CUANDO exista al menos una acción pendiente con hora mayor o igual a la hora actual, el sistema deberá mostrar la de menor hora futura, con hora, título y categoría.
- SI todas las acciones pendientes de hoy tienen hora anterior a la hora actual, ENTONCES el sistema deberá mostrar la más reciente de ellas (la de hora más cercana al momento actual) con la etiqueta "Atrasado"; en este supuesto **no** deberá mostrar estado vacío (D9).
- SI no hay ninguna acción pendiente con `startTime` válido para hoy, ENTONCES el sistema deberá mostrar el estado vacío "Sin acciones programadas pendientes para hoy" sin errores.
- SI dos acciones empatan en `startTime`, ENTONCES el sistema deberá ordenarlas alfabéticamente por `title` y, si el empate persiste, por `id` (H-28).
- El sistema deberá ofrecer en la propia tarjeta un control directo para completar y desmarcar la acción mostrada, que ejecute el mismo upsert de `(habitId, hoy)` definido en RF-07 y se refleje de inmediato en el checklist y en las métricas (H-05).
- CUANDO el usuario complete la acción mostrada, el sistema deberá recalcular la tarjeta y pasar a la siguiente acción pendiente del día.
- SI un hábito tiene `startTime` inválido, ENTONCES el sistema deberá excluirlo de esta tarjeta, mostrarlo sin hora en el checklist y contarlo en las métricas (H-03).
- El sistema no deberá mostrar acciones de días futuros ni de días pasados.

**Criterios de aceptación**

- [ ] Con hábitos a las 09:00, 14:00 y 19:00 y hora actual 13:30, se muestra el de 14:00.
- [ ] Con hora actual 20:00 y los mismos hábitos sin completar, se muestra el de 19:00 con etiqueta "Atrasado".
- [ ] Un hábito completado hoy no se muestra como próxima acción.
- [ ] Un hábito inactivo, o que no aplica hoy, nunca aparece.
- [ ] Un hábito sin `startTime` nunca aparece en esta tarjeta.
- [ ] Un hábito con `startTime = "25:00"` o `"9:5"` no aparece en la tarjeta, sí en el checklist (sin hora) y cuenta en RF-04.
- [ ] Con dos hábitos a las 14:00 ("Alfa" y "Beta") y hora actual 13:00, se muestra "Alfa"; con títulos idénticos, gana el `id` alfabéticamente menor.
- [ ] El control de la tarjeta completa y desmarca el hábito: el checklist y el porcentaje de RF-04 cambian en la misma interacción.
- [ ] Completar la acción mostrada desde la tarjeta cambia el contenido de la tarjeta sin recargar.

### RF-04 — Métrica: cumplimiento de hábitos (hoy vs. promedio semanal)

**Requisito.** El sistema deberá mostrar el porcentaje de cumplimiento de hoy y el promedio semanal de cumplimiento.

- El sistema deberá calcular el porcentaje de hoy como `completados hoy / hábitos activos que aplican hoy × 100`, con **redondeo entero y mitad hacia arriba**.
- El sistema deberá calcular el promedio semanal como la **media aritmética de los porcentajes diarios de los días transcurridos** desde el lunes hasta hoy inclusive; los días futuros no cuentan ni se rellenan con cero.
- SI un día transcurrido no tiene hábitos aplicables, ENTONCES el sistema deberá excluirlo del promedio (no cuenta como 0 % ni como 100 %).
- El sistema deberá ignorar en todos los cálculos los `CompletionLog` con `date > hoy` (H-25).
- El sistema deberá recalcular retroactivamente los porcentajes de días pasados usando el `targetDays` y el `active` **actuales** del hábito (sin snapshot histórico); esta es una limitación aceptada y documentada (§8) (H-09).
- MIENTRAS la semana esté en curso, el sistema deberá calcular el promedio solo sobre los días ya transcurridos.
- SI no existen hábitos aplicables hoy, ENTONCES el sistema deberá mostrar `—` en lugar de `0 %`, junto a un texto de estado vacío.
- SI no hay ningún día computable en la semana, ENTONCES el sistema deberá mostrar `—` como promedio.
- El sistema deberá mostrar ambos valores de forma diferenciada y con `tabular-nums`, reservando `emerald-500` para el valor de progreso.

**Criterios de aceptación**

- [ ] 3 hábitos hoy con 2 completados ⇒ hoy = 67 %.
- [ ] Lunes 100 %, martes 50 %, miércoles (hoy) 0 % ⇒ promedio = 50 %.
- [ ] Un jueves con 0 hábitos aplicables no altera el promedio del ejemplo anterior.
- [ ] El viernes de esa misma semana no se incluye hasta que llegue.
- [ ] Un 66,5 % de cumplimiento se muestra como 67 % (mitad hacia arriba).
- [ ] Sin hábitos se muestra `—`, nunca `NaN`, `Infinity` ni `0`.
- [ ] Un `CompletionLog` con `date` futura no altera ningún valor.
- [ ] Quitar un día del `targetDays` de un hábito recalcula también los días pasados de la semana.
- [ ] Los valores se actualizan inmediatamente al marcar o desmarcar un hábito.

### RF-05 — Métrica: horas de estudio de la semana

**Requisito.** El sistema deberá mostrar el total de horas de estudio acumuladas en la semana en curso frente a la meta semanal.

- El sistema deberá sumar `minutes` de las `StudySession` con `date` entre el lunes y el domingo de la semana en curso y con `date ≤ hoy`.
- El sistema deberá excluir de la suma las sesiones con `minutes` ≤ 0, no entero o no numérico (H-29).
- El sistema deberá sumar las sesiones solapadas en el tiempo (no hay deduplicación por franja): dos sesiones el mismo día con 60 y 30 minutos aportan 90 minutos; esta decisión queda documentada (H-29).
- El sistema deberá mostrar el total en horas con **un decimal, mitad hacia arriba y coma decimal** (p. ej. `6,5 h`) y la meta (p. ej. `10 h`), ambos en `tabular-nums`.
- El sistema deberá mostrar el porcentaje entero de la meta alcanzado (redondeo mitad hacia arriba) con barra de progreso en `emerald-500`; si el total supera la meta, el porcentaje se muestra tal cual (p. ej. `120 %`) y la barra se satura visualmente al 100 %.
- SI no hay sesiones en la ventana, ENTONCES el sistema deberá mostrar `0,0 h` y 0 % (no es estado vacío: la meta existe y el avance es cero).
- SI la meta es 0, negativa o inválida, ENTONCES el sistema deberá usar la meta por defecto y no dividir por cero.

**Criterios de aceptación**

- [ ] Sesiones de 90 + 120 min en la semana ⇒ `3,5 h` y 35 % con meta 600 min.
- [ ] Una sesión del domingo anterior no se suma a la semana actual.
- [ ] Una sesión del lunes siguiente no se suma a la semana actual.
- [ ] Una sesión con `date` posterior a hoy, dentro de la semana, no se suma.
- [ ] Total 720 min con meta 600 ⇒ `12,0 h`, `120 %`, barra llena.
- [ ] Sin sesiones ⇒ `0,0 h`, 0 %, sin errores de render.
- [ ] Sesiones con `minutes: 0`, `minutes: 12.5` o `minutes: -30` no alteran el total.
- [ ] Dos sesiones solapadas de 60 y 30 min el mismo día ⇒ `1,5 h`.

### RF-06 — Métrica: sueño (promedio semanal + registro rápido)

**Requisito.** El sistema deberá mostrar el promedio de horas de sueño de la semana y permitir registrar el sueño de la noche anterior sin salir del dashboard.

**Ventana (D11, normativa).** La ventana es por **fecha de registro**, de lunes a domingo de la semana en curso, y se limita a `date ≤ hoy`. Consecuencia documentada: la ventana incluye la noche del domingo anterior (registrada el lunes) y excluye la noche del domingo actual (que se registrará el lunes siguiente). El promedio de la semana queda completo el domingo (con el registro de la mañana del domingo, a más tardar el domingo por la noche); la noche del domingo actual se contabiliza en la semana siguiente.

- El sistema deberá calcular el promedio sobre las `SleepLog` de la ventana, **deduplicadas por `date` antes de calcular** (H-14).
- SI existen varios registros con la misma `date`, ENTONCES el sistema deberá conservar el de `createdAt` más reciente y, si empatan, el último del array; el denominador es el número de **fechas únicas** (H-14).
- El sistema deberá excluir del promedio los registros cuyo `hours` esté fuera de 0.5–24 o no sea múltiplo de 0.5, y señalarlo con un aviso discreto que indique cuántos registros quedaron fuera (H-04).
- El sistema deberá mostrar el promedio con **un decimal, mitad hacia arriba y coma decimal** y la meta por noche, con `tabular-nums`.
- SI el promedio es igual o superior a la meta, ENTONCES el sistema deberá mostrar el indicador en `emerald-500`; SI es inferior, ENTONCES el indicador deberá ser neutro (zinc), sin verde (H-26).
- SI no existen registros válidos en la ventana, ENTONCES el sistema deberá mostrar `—` y un texto que invite a registrar la primera noche.
- El sistema deberá ofrecer un campo numérico (paso 0.5, rango 0.5–24) y una acción "Guardar" para registrar el sueño de la noche anterior, asociado a `date = hoy`.
- SI ya existe un registro de sueño con `date = hoy`, ENTONCES el campo deberá mostrarse precargado y la acción deberá **actualizarlo** (upsert), sin crear duplicados.
- CUANDO el usuario guarde un valor válido, el sistema deberá persistirlo, confirmar visualmente el guardado y recalcular el promedio de inmediato.
- SI el valor es inválido (vacío, no numérico, fuera de 0.5–24 o no múltiplo de 0.5), ENTONCES el sistema deberá impedir el guardado y mostrar un mensaje de error en español asociado al campo, conservando el dato previo.

**Criterios de aceptación**

- [ ] Registros 7 h, 8 h y 6,5 h en la ventana ⇒ promedio `7,2 h` (21,5 / 3 = 7,166… ⇒ 7,2).
- [ ] Sin registros ⇒ `—` y mensaje de invitación.
- [ ] Guardar `7,5` hoy crea un registro con `date = hoy`; guardar `8` deja **un solo** registro con `8`.
- [ ] Los valores `26`, `0` y `7,25` son rechazados con mensaje visible y el dato previo no se pierde.
- [ ] Los valores `13` y `0,5` se aceptan, se guardan y actualizan el promedio (rango canónico 0.5–24).
- [ ] Con `hours: 26` ya persistido, el registro no entra en el promedio y aparece el aviso de registros fuera de rango.
- [ ] Con dos registros de la misma `date` (7 h con `createdAt` 27 oct y 9 h con `createdAt` 28 oct), el promedio cuenta una sola fecha y usa 9 h.
- [ ] El promedio se actualiza sin recargar la página tras guardar.
- [ ] Un registro de la semana anterior no afecta el promedio actual.
- [ ] Con promedio 8 h y meta 8 h el indicador es `emerald-500`; con 7,5 h y meta 8 h es neutro.

### RF-07 — Checklist Rápido del Día

**Requisito.** El sistema deberá mostrar una lista resumida de los hábitos del día con marcado directo.

- El sistema deberá listar los hábitos con `active: true`, cuyo `targetDays` incluya hoy y con `priority: true`.
- SI ningún hábito de hoy es prioritario, ENTONCES el sistema deberá listar **todos** los hábitos activos de hoy (fallback de D4).
- El sistema deberá mostrar en cada elemento título, hora (`startTime` solo si es válido), estado de completado y un control tipo checkbox accesible (etiqueta asociada, foco visible, operable por teclado).
- CUANDO el usuario marque un hábito, el sistema deberá crear o actualizar el `CompletionLog` de `(habitId, hoy)` con `completed: true`, sin navegar ni abrir modales.
- CUANDO el usuario desmarque un hábito, el sistema deberá actualizar ese mismo registro a `completed: false` sin eliminar el registro.
- El sistema deberá aplicar el cambio de forma optimista e inmediata.
- SI la persistencia falla, ENTONCES el sistema deberá **revertir el cambio optimista** al estado visual previo y mostrar un aviso no bloqueante en español (regla única de H-01; esta spec no contempla "mantener el cambio en memoria").
- SI no hay hábitos aplicables hoy, ENTONCES el sistema deberá mostrar el estado vacío "No tienes hábitos para hoy" sin lista vacía ni errores.
- El sistema deberá usar `emerald-500` únicamente en el estado completado (check/indicador), nunca en el estado pendiente.
- El sistema deberá mostrar el conteo `completados / total` del checklist, coherente con RF-04 cuando el checklist coincide con el conjunto de hábitos de hoy.
- El sistema deberá marcar con la etiqueta discreta "ejemplo" los elementos con `isSeed: true`.

**Criterios de aceptación**

- [ ] Con 2 hábitos prioritarios y 3 no prioritarios, se listan exactamente 2.
- [ ] Sin prioritarios y con 4 hábitos activos hoy, se listan los 4.
- [ ] Marcar uno actualiza el check, el conteo, RF-04 y (si aplica) RF-03 en la misma interacción.
- [ ] Desmarcar deja `completed: false` en LocalStorage y no duplica el registro.
- [ ] Recargar la página conserva los estados marcados.
- [ ] Los hábitos inactivos o de otros días nunca aparecen.
- [ ] El checkbox es alcanzable con `Tab` y operable con `Espacio`.
- [ ] Simulando un fallo de `localStorage.setItem`, el checkbox **vuelve al estado previo** (desmarcado), aparece un aviso no bloqueante y el almacenamiento no cambia.
- [ ] Un hábito con `startTime` inválido aparece sin hora.

### RF-08 — Metas editables desde el dashboard

**Requisito.** El sistema deberá permitir ajustar la meta semanal de estudio y la meta de sueño por noche desde `/`, sin ruta `/settings`.

- El sistema deberá mostrar las metas actuales junto a sus métricas (RF-05, RF-06) y un control de edición accesible desde la propia sección de métricas.
- CUANDO el usuario confirme un valor válido, el sistema deberá persistirlo en `WEEKLY_GOALS` y recalcular porcentajes y promedios de inmediato.
- SI el valor está fuera del rango permitido o no es numérico, ENTONCES el sistema deberá rechazarlo con un mensaje en español y mantener la meta anterior.
- El sistema deberá validar la meta de estudio como entero entre 60 y 4200 minutos, y la meta de sueño entre 0.5 y 24 horas en múltiplos de 0.5 (mismo rango que `SleepLog.hours`).
- SI no existe `WEEKLY_GOALS` en LocalStorage, ENTONCES el sistema deberá operar con 600 min y 8 h sin escribir en disco hasta la primera edición.
- El sistema no deberá exponer más metas que las dos descritas.

**Criterios de aceptación**

- [ ] Cambiar la meta de estudio a 8 h actualiza el porcentaje de RF-05 al instante.
- [ ] Recargar la página conserva la meta modificada.
- [ ] Introducir `0`, `-3` o `abc` muestra error y no altera la meta guardada.
- [ ] Sin datos previos, la interfaz muestra 10 h y 8 h.
- [ ] Meta de sueño `12,5` y `13` se aceptan; `24,5`, `0` y `7,25` se rechazan con mensaje.

### RF-09 — Persistencia, validación y tolerancia a fallos

**Requisito.** El sistema deberá leer y escribir todos los datos exclusivamente en LocalStorage mediante helpers tipados y claves de `STORAGE_KEYS`.

- El sistema deberá validar todo dato leído con `unknown` + Type Guards, sin `any`, y descartar elementos con forma inválida sin romper el render.
- SI una clave es ilegible (JSON inválido o forma no recuperable), ENTONCES el sistema deberá: usar el valor por defecto para leer, **bloquear todas las escrituras sobre esa clave** y ofrecer una acción explícita de restablecimiento ("Restablecer datos de …") que solo se ejecuta por acción del usuario; nunca deberá sobrescribirla en silencio (H-06).
- CUANDO el usuario ejecute el restablecimiento, el sistema deberá sobrescribir esa clave con el valor por defecto y desbloquear las escrituras.
- SI la escritura falla (cuota excedida, almacenamiento no disponible), ENTONCES el sistema deberá mostrar un aviso no bloqueante en español y revertir el cambio optimista (RF-07).
- El sistema deberá interpretar los datos antiguos según la política campo por campo de §3.5, sin migración destructiva ni reescritura.
- El sistema no deberá escribir en claves ajenas a `STORAGE_KEYS` ni modificar datos de otras funcionalidades.
- El sistema deberá leer y escribir con la clave exacta de `STORAGE_KEYS`, sin prefijo adicional (corrige `src/lib/persistence.ts:6`).

**Criterios de aceptación**

- [ ] Con `disciplined:habits` = `"{no-json"` la vista carga con estado vacío, la clave **no** se sobrescribe y la escritura sobre ella está bloqueada con la acción de restablecimiento visible.
- [ ] Ejecutar el restablecimiento (clic del usuario) deja la clave en `[]` y permite volver a escribir.
- [ ] Un array con un elemento inválido conserva los válidos y descarta solo el inválido.
- [ ] Un hábito sin `priority` no aparece en el checklist prioritario pero sí en el fallback.
- [ ] Simulando fallo de `localStorage.setItem`, aparece un aviso, el checkbox vuelve a su estado previo y la UI sigue operable.
- [ ] No se añade el prefijo `disciplined:` dos veces en ninguna lectura ni escritura.
- [ ] Ninguna escritura toca claves fuera de `STORAGE_KEYS`.

### RF-10 — Cálculos puros con "hoy" inyectado

**Requisito.** El sistema deberá concentrar todos los cálculos en funciones puras que reciban la fecha local de "hoy" como parámetro.

- El sistema deberá hacer que cada función de cálculo reciba `today: ISODateString` (y, cuando aplique, `now: TimeOfDay`) y devuelva un resultado derivado sin leer reloj, sin acceder a LocalStorage y sin depender de React.
- El sistema deberá garantizar que, con las mismas entradas, las funciones devuelvan siempre el mismo resultado (deterministas y verificables sin mocks).
- El sistema deberá obtener "hoy" desde el reloj en un único punto de la capa de UI/hooks y pasarlo hacia abajo.
- El sistema deberá tolerar entradas vacías o inconsistentes devolviendo valores neutros (`0`, `null`, `[]`, `—`) en lugar de lanzar excepciones.

**Criterios de aceptación**

- [ ] Ningún archivo de cálculo de `src/lib/` importa React ni accede a `localStorage`.
- [ ] Ninguna función de cálculo llama a `new Date()` sin argumentos para derivar el día.
- [ ] Invocar dos veces la misma función con los mismos argumentos devuelve resultados idénticos.
- [ ] Pasar `today` de una semana distinta cambia los agregados de forma coherente.

### RF-11 — Primera visita, bienvenida y estados vacíos

**Requisito.** El sistema deberá presentar una vista comprensible y sin errores cuando no existan datos, y mostrar la bienvenida una sola vez por dispositivo.

- SI es la primera visita (sin `SEED_STATE` ni datos previos), ENTONCES el sistema deberá sembrar los datos de RF-14 y mostrar la vista completa: frase del día, cabecera con la semana actual, métricas calculadas sobre la semilla, checklist con los hábitos semilla de hoy y próxima acción calculada.
- El sistema deberá mostrar `Startscreen` únicamente si `STARTUP_SHOWN` no contiene `hasSeenStartup: true` (D10).
- CUANDO el usuario cierre `Startscreen`, el sistema deberá persistir `{ hasSeenStartup: true }` en `STARTUP_SHOWN` y no volver a mostrarla en visitas posteriores del mismo dispositivo.
- El sistema deberá mantener el contenido y la apariencia actual de `Startscreen` (no forma parte de la identidad visual del dashboard, RF-13).
- El sistema no deberá mostrar `NaN`, `undefined`, `Infinity`, `null` ni cadenas técnicas en ningún estado.
- El sistema deberá invitar a la acción siguiente en cada estado vacío con una frase breve en español, sin botones que abran flujos fuera de alcance.

**Criterios de aceptación**

- [ ] Con LocalStorage limpio, `/` renderiza las cinco secciones sin errores de consola y con los 4 hábitos semilla.
- [ ] La bienvenida aparece en la primera visita y, tras pulsar "Empezar", no vuelve a aparecer al recargar.
- [ ] Con `disciplined:startupShown = {"hasSeenStartup":true}` preexistente, la bienvenida no aparece (cambio observable documentado de D10).
- [ ] No aparece ningún valor `NaN`/`undefined` en pantalla.
- [ ] Al cerrarse la bienvenida, el dashboard queda usable.

### RF-12 — Cambio de día, relectura y recálculo temporal

**Requisito.** El sistema deberá mantener la vista alineada con la fecha local y con el disco cuando el día o el contexto cambian.

- MIENTRAS la pestaña esté visible, el sistema deberá comprobar la fecha local cada **60 segundos** (H-12).
- CUANDO la pestaña reciba `focus` o `visibilitychange` hacia visible, el sistema deberá recalcular "hoy" y **releer los datos desde disco** (H-34).
- El sistema deberá reflejar el nuevo día sin exigir recarga manual, con una tolerancia verificable **≤ 60 s**.
- SI existe una escritura optimista pendiente al recuperar el foco, ENTONCES el sistema deberá conservar el estado pendiente hasta que la escritura resuelva; si falla, deberá revertirlo y avisar (H-34).
- CUANDO otra pestaña escriba una clave de `STORAGE_KEYS`, el sistema deberá realinear esa clave mediante el evento `storage` (H-34).
- El sistema no deberá incluir la fecha dependiente del reloj ni datos de LocalStorage en el HTML inicial: hasta el montaje deberá renderizar un **esqueleto neutro** (sin fechas, sin valores, sin `0 %`), y el contenido real se renderizará tras el montaje, evitando el desajuste de hidratación (H-13).
- El sistema deberá respetar el día real en cambios de horario estacional sin desplazar el día mostrado.
- El sistema deberá documentar que un cambio de zona horaria por viaje se refleja en la siguiente comprobación (≤ 60 s) o al recuperar el foco, y que los registros ya guardados conservan su `date` original (H-30).

**Criterios de aceptación**

- [ ] Con la pestaña visible y la fecha del sistema avanzada tras medianoche, la frase y las métricas se actualizan en **≤ 60 s** sin recargar.
- [ ] No aparecen advertencias de hidratación en consola al cargar `/`.
- [ ] El HTML inicial no contiene fechas, porcentajes ni horas de sueño.
- [ ] Tras medianoche, un hábito marcado "ayer" no figura como completado hoy.
- [ ] Con dos pestañas abiertas, marcar en una realinea la otra mediante el evento `storage`.
- [ ] Al recuperar el foco se relee el disco: un cambio hecho por otra vía aparece sin recargar.
- [ ] Una escritura optimista pendiente no se pierde por una relectura de foco.

### RF-13 — Diseño, legibilidad y respuesta

**Requisito.** El sistema deberá respetar la identidad visual minimalista definida en la constitución.

- El sistema deberá usar **tema oscuro forzado** en el dashboard: fondo `zinc-950`, texto `zinc-50`/blanco y grises `zinc-800/400`, independientemente de la preferencia del sistema, sin variantes `dark:` en el dashboard (H-24).
- El sistema deberá reservar el verde exclusivamente para progreso, completados y estados de éxito. Escala permitida: `emerald-500` sólido para texto, checks y barras de progreso, y `emerald-500/10`–`emerald-500/20` para fondos sutiles. **`emerald-400` y cualquier otro tono de verde quedan prohibidos** (H-16).
- El sistema no deberá usar verde en déficit, errores, decoración ni elementos sin significado de progreso.
- El sistema deberá usar `tabular-nums` en todos los números y métricas.
- El sistema deberá ordenar las secciones en este orden de lectura visual: (1) cabecera de semana, (2) frase diaria, (3) próxima acción, (4) métricas semanales, (5) checklist rápido.
- El sistema deberá ser legible y operable en viewport móvil (375 px) y escritorio, con las cinco secciones apiladas en móvil y en rejilla en escritorio.
- El sistema deberá usar textos en español en la interfaz e identificadores en inglés en el código.
- El sistema deberá formatear los números con **coma decimal y sin `Intl`**: prohibidos `Intl.NumberFormat`, `toLocaleString` y cualquier formateo dependiente de locale; porcentajes enteros (`67 %`), horas con un decimal (`7,3 h`), conteos enteros (`2 / 5`) (H-36, H-18).
- El sistema no deberá introducir dependencias nuevas.

**Criterios de aceptación**

- [ ] En 375 px no hay scroll horizontal y todas las secciones son accesibles.
- [ ] Los porcentajes y horas alinean dígitos de forma estable entre valores (1 vs 10 vs 100).
- [ ] El verde no aparece en textos de error ni en elementos sin significado de progreso.
- [ ] No aparece `emerald-400` en ningún archivo tocado por esta spec.
- [ ] No aparece `Intl` ni `toLocaleString` en ningún archivo tocado por esta spec.
- [ ] El fondo del dashboard es `zinc-950` con el sistema operativo en tema claro.
- [ ] El orden del DOM coincide con el orden de lectura declarado.
- [ ] `package.json` no incorpora dependencias nuevas por esta spec.

### RF-14 — Datos semilla de primera visita (D8)

**Requisito.** El sistema deberá sembrar datos de ejemplo una única vez para que las métricas y el checklist sean verificables sin `HabitForm`.

- SI `SEED_STATE` no existe y `CATEGORIES` está ausente o vacía, ENTONCES el sistema deberá escribir las 5 categorías base de §3.4 con `isSeed: true` e `id = slug`.
- SI `SEED_STATE` no existe y `HABITS` está ausente o vacía, ENTONCES el sistema deberá escribir los 4 hábitos de §3.4 con `isSeed: true`, `active: true`, `priority` y `startTime` válido, con `categoryId` igual al `id` de la categoría semilla correspondiente.
- El sistema no deberá sembrar sobre una colección que ya contenga datos: si `HABITS` o `CATEGORIES` tienen elementos, esa colección se conserva intacta.
- SI `HABITS` o `CATEGORIES` ya contienen elementos, `SEED_STATE` no existe y **ninguna de las dos claves es ilegible**, ENTONCES el sistema deberá escribir `SEED_STATE` **sin sembrar**, para que la siembra no se reevalúe en cada carga.
- SI una de esas claves es ilegible, ENTONCES el sistema **no** deberá sembrar sobre ella **ni escribir `SEED_STATE`**: la siembra queda pendiente y se reevalúa cuando el usuario restablezca la clave (RF-09).
- CUANDO complete la siembra, el sistema deberá escribir `SEED_STATE = { seededAt: hoy, version: 1 }`.
- SI el usuario borra los datos semilla, ENTONCES el sistema no deberá volver a sembrarlos (el marcador `SEED_STATE` persiste).
- El sistema deberá tratar los datos semilla como datos normales (editables y borrables por los flujos de otras specs), sin lógica especial más allá de la etiqueta y del marcador.

**Criterios de aceptación**

- [ ] Con LocalStorage limpio, quedan 5 categorías (`id = slug`), 4 hábitos y `SEED_STATE` escritos una sola vez.
- [ ] Los 4 hábitos semilla muestran su categoría (Entrenamiento, Estudio, Personal, Trabajo): su `categoryId` resuelve contra el `id` de la categoría semilla.
- [ ] Recargar la página no duplica ni vuelve a sembrar.
- [ ] Con `HABITS` conteniendo 1 hábito propio y sin `SEED_STATE`, no se añaden hábitos semilla, el hábito propio se conserva y `SEED_STATE` queda escrito (la siembra no se reevalúa).
- [ ] Con `HABITS` = `"{no-json"` no se siembra, la clave queda bloqueada para escritura y `SEED_STATE` **no** se escribe; tras restablecer la clave, la siembra se evalúa de nuevo.
- [ ] Tras borrar los hábitos semilla (dejando `HABITS = []` con `SEED_STATE` presente), recargar no los resucita.
- [ ] Cualquier día de la semana tras la siembra, RF-07 lista al menos 1 hábito de hoy y RF-03 muestra 1 acción (los 4 hábitos tienen `startTime` válido y sus `targetDays` cubren los 7 días: 1–5 "Sesión de estudio", 1/3/5 "Entrenamiento de fuerza", 1–7 "Lectura de 20 minutos", 7 "Revisión semanal").

### RF-15 — Retirada de la UI no conforme y del legado

**Requisito.** El sistema deberá eliminar de `/` los elementos actuales que incumplen esta spec y el código que queda muerto.

- El sistema deberá eliminar el botón "+ Nuevo hábito" (abre un flujo fuera de alcance) y cualquier acción que conduzca a `HabitForm`.
- El sistema deberá eliminar el punto `animate-pulse` decorativo de la cabecera y el bloque de "Progreso" con el `0%` fijo.
- El sistema deberá eliminar `selection:bg-emerald-500/20` y `selection:text-emerald-400` del contenedor de la vista (el resaltado de selección no comunica progreso).
- El sistema deberá sustituir `text-emerald-400` y `hover:bg-emerald-400` por la escala permitida en RF-13.
- El sistema deberá retirar `MotivationalBanner`, `defaultMotivationalPhrases`, `getMotivationalPhraseState`, `setMotivationalPhraseState` y el tipo `MotivationalPhraseState`; la constante `MOTIVATIONAL_PHRASE_STATE` se conserva marcada como legado reservado.
- El sistema deberá conservar `MotivationalPhrase` (tipo del dominio de frases) como tipo de la nueva lista de RF-01.
- El sistema deberá eliminar `src/components/ui/StartscreenChecker.tsx`, archivo corrupto (su contenido son códigos de carácter, no TypeScript) y sin importadores, para que `npx tsc --noEmit` pase.
- El sistema no deberá dejar código muerto ni comentarios de "placeholder" en la vista.

**Criterios de aceptación**

- [ ] `/` no contiene el botón "+ Nuevo hábito", el punto `animate-pulse` ni un porcentaje fijo en el marcado.
- [ ] No aparece `selection:bg-emerald-500/20`, `selection:text-emerald-400` ni `emerald-400` en los archivos tocados.
- [ ] `MotivationalBanner.tsx`, `motivationalPhrases.ts` y `StartscreenChecker.tsx` ya no existen y nada los importa.
- [ ] `npx tsc --noEmit` termina sin errores.

---

## 5. Requisitos no funcionales

- **RNF-01 Simplicidad (KISS/YAGNI):** sin librerías de fechas, estado global ni gráficas; solo React, Next.js y Tailwind existentes.
- **RNF-02 Tipado estricto:** cero `any`; datos externos con `unknown` + Type Guards; `npx tsc --noEmit` sin errores.
- **RNF-03 Calidad:** `npm run lint && npx tsc --noEmit` en verde antes de cerrar el hito (orden `lint → typecheck → build`).
- **RNF-04 Rendimiento verificable (sustituye al "< 100 ms"):** los cálculos de métricas se resuelven con un número constante de pasadas lineales sobre las colecciones almacenadas (sin bucles anidados sobre registros) y el primer render local no bloquea: con los volúmenes de RNF-05, la carga de `/` no registra long tasks > 50 ms en el panel Performance de Chrome DevTools y la vista responde a la primera interacción sin spinners artificiales.
- **RNF-05 Volumen de datos:** la solución debe seguir siendo fluida con un año de `CompletionLog`, `StudySession` y `SleepLog` (≈ 1 500 registros) y hasta 100 hábitos.
- **RNF-06 Privacidad:** ningún dato sale del navegador; sin telemetría ni llamadas de red para métricas.
- **RNF-07 Localización:** fechas mostradas en español (día/mes abreviados), semana lunes–domingo, sin dependencia de locale del navegador; números con coma decimal y sin `Intl` (H-36).
- **RNF-08 Consistencia de fecha:** `YYYY-MM-DD` local en todo el modelo; prohibido `toISOString()` para derivar el día; comparaciones de hora en minutos desde medianoche.
- **RNF-09 Alias de importación:** **cero importaciones sin alias `@/`** en todos los archivos que toque esta spec, incluidos los existentes que hoy importan con rutas relativas (`persistence.ts`, `motivationalPhrases.ts`, `MotivationalBanner.tsx`, `page.tsx`), que se normalizan al modificarlos (H-32).
- **RNF-10 Verificación manual (sin tests automatizados):** este hito **no incluye tests automatizados** porque el repositorio no tiene runner configurado; la verificación es manual con Chrome DevTools MCP en `localhost:3000` (consola limpia, vista móvil 375 px, casos de RF-07/09/12). Esto no contradice RF-10: las funciones puras siguen siendo deterministas y verificables sin mocks si en el futuro se añade un runner (H-35).
- **RNF-11 Accesibilidad mínima:** controles operables por teclado, foco visible, etiquetas asociadas en los checkboxes y en los campos numéricos.
- **RNF-12 Cierre del hito:** `MEMORY.md` actualizado (≤ 50 líneas) con el estado del dashboard, las decisiones D8–D11 y los aprendizajes nuevos, como parte de los criterios de cierre.

---

## 6. Casos límite

| # | Caso | Comportamiento esperado |
|---|---|---|
| CL-01 | Semana vacía (sin hábitos, sesiones ni sueño) | Frase visible; métricas `0,0 h` / `—`; checklist y próxima acción en estado vacío; sin errores |
| CL-02 | Sin hábitos activos que apliquen hoy | Cumplimiento hoy `—`, checklist vacío, próxima acción vacía; el promedio semanal excluye el día |
| CL-03 | Todos los hábitos de hoy ya completados | Próxima acción en estado vacío; checklist con todos marcados; cumplimiento 100 % |
| CL-04 | Sin registros de sueño en la ventana | Promedio `—` + invitación a registrar; el formulario sigue operativo |
| CL-05 | Registros de sueño duplicados en la misma `date` | Deduplicar por fecha; gana el `createdAt` más reciente (empate ⇒ último del array); el denominador son fechas únicas |
| CL-06 | Cambio de día a medianoche con la pestaña visible | Se detecta en ≤ 60 s o al recuperar foco: nueva frase, nuevo día, checklists reiniciados |
| CL-07 | Datos corruptos en LocalStorage (JSON inválido, tipo incorrecto, `null`) | Fallback al valor por defecto; dato original intacto; escritura bloqueada + restablecimiento explícito |
| CL-08 | Primera visita / LocalStorage limpio | Semilla de 5 categorías + 4 hábitos; dashboard completo; bienvenida una sola vez |
| CL-09 | Hábito con `startTime` ya pasado | Se muestra como "Atrasado" si no hay futuros pendientes y es el más reciente |
| CL-10 | Hábito sin `startTime` | Excluido de Próxima Acción; incluido en checklist y en métricas |
| CL-11 | Hábito sin `priority` (dato antiguo) | `priority: false`; aparece solo en el fallback del checklist |
| CL-12 | Ningún hábito prioritario hoy | Checklist usa todos los hábitos activos de hoy |
| CL-13 | Hábito con `targetDays` vacío o inválido | `[]`; no aplica ningún día; no aparece en la vista ni en métricas |
| CL-14 | Domingo (último día de la semana) | Rango de cabecera correcto (dom 1 nov 2026 ⇒ `26 oct – 1 nov`); promedio de sueño y cumplimiento incluyen lunes–domingo; lunes siguiente no suma |
| CL-15 | Total de estudio supera la meta | Porcentaje > 100 % mostrado; barra saturada al 100 %; sin desbordes visuales |
| CL-16 | Meta de estudio o sueño inválida/corrupta en disco | Se usa la meta por defecto; sin división por cero |
| CL-17 | `SleepLog.hours` fuera de 0.5–24 o no múltiplo de 0.5 | Rechazado en la UI; si ya estaba en disco, se excluye del promedio y se señala |
| CL-18 | `StudySession.minutes` negativo, cero o no entero en datos existentes | Se excluye de la suma (no resta, no rompe) |
| CL-19 | Muchos registros (un año de uso) | Métricas calculadas en pasadas lineales; sin long tasks > 50 ms |
| CL-20 | LocalStorage deshabilitado o cuota excedida | Vista operable con valores por defecto + aviso discreto; cambio optimista revertido |
| CL-21 | Dos pestañas abiertas con cambios simultáneos | El evento `storage` realinea la pestaña inactiva; sin duplicar registros |
| CL-22 | Cambio de horario estacional (DST) | El día mostrado corresponde al día local real; sin saltos de un día |
| CL-23 | Hábito completado y luego desactivado | El log histórico se conserva; el hábito no aparece en la vista |
| CL-24 | Doble clic rápido en un checkbox | Un solo registro por `(habitId, hoy)`; estado final consistente con el último clic |
| CL-25 | Todos los hábitos de hoy sin `startTime` | Próxima acción en estado vacío, sin seleccionar arbitrariamente uno |
| CL-26 | Hábito con `startTime` inválido (`"25:00"`, `"9:5"`, `"7:60"`) | Excluido de Próxima Acción; en checklist sin hora; cuenta en métricas |
| CL-27 | Registro de sueño fuera de rango ya persistido (`26`, `0`, `7,25`) | Excluido del promedio; aviso discreto con el número de registros descartados |
| CL-28 | Clave ilegible con un upsert pendiente | La escritura se bloquea (no se sobrescribe); la UI mantiene el dato por defecto y ofrece restablecer |
| CL-29 | Primera visita con semilla y `HABITS` vacío | Se siembran 4 hábitos con categoría resuelta (`categoryId` = `id` de la categoría semilla); cualquier día de la semana RF-03 muestra una acción y RF-07 lista al menos 1 elemento |
| CL-30 | Usuario borra los datos semilla | `SEED_STATE` persiste; los ejemplos no reaparecen al recargar |
| CL-31 | Semana a caballo entre años (29 dic – 4 ene) | Cabecera `29 dic 2025 – 4 ene 2026`; métricas usan esa misma ventana |
| CL-32 | Viaje con cambio de zona horaria | La fecha se recalcula en ≤ 60 s o al recuperar foco; los registros previos conservan su `date` |
| CL-33 | Registro con `date` futura (log, sesión o sueño) | Se ignora en todas las métricas; permanece en disco |
| CL-34 | Sesiones de estudio solapadas el mismo día | Se suman (60 + 30 = 90 min); sin deduplicación por franja |
| CL-35 | Dos hábitos con la misma `startTime` | Orden alfabético por `title`; empate ⇒ `id` alfabéticamente menor |
| CL-36 | Cumplimiento con decimal exacto (66,5 %) | Se muestra 67 % (mitad hacia arriba) |
| CL-37 | Usuario existente con `hasSeenStartup: true` | No vuelve a ver la bienvenida (cambio observable de D10) |
| CL-38 | Fallo de escritura tras marca optimista | El checkbox vuelve al estado previo; aviso no bloqueante; almacenamiento sin cambios |
| CL-39 | Pestaña en segundo plano al cruzar medianoche | Al volver a visible (`visibilitychange`/`focus`) se recalcula y relee el disco |
| CL-40 | Todas las horas de hoy ya pasaron y hay pendientes | Se muestra la más reciente con "Atrasado"; nunca estado vacío (D9) |
| CL-41 | Promedio de sueño exactamente igual a la meta | Indicador en `emerald-500` (igual o superior ⇒ verde) |
| CL-42 | Fecha inválida tipo `2026-02-30` o `28/10/2026` | El registro se descarta de cálculos y de la vista; no se reescribe en disco |
| CL-43 | Escritura optimista pendiente + recuperación de foco | El estado pendiente se conserva hasta que la escritura resuelva; si falla, se revierte con aviso |
| CL-44 | Navegador en tema claro | El dashboard sigue en `zinc-950` (tema oscuro forzado); `Startscreen` mantiene su comportamiento |

---

## 7. Separación de responsabilidades

> Los nombres de archivo son **propuesta de contrato**; `plan.md` confirma los definitivos. Lo normativo son las responsabilidades, las firmas y el hecho de que ningún cálculo viva en componentes.

### 7.1 Funciones puras — `src/lib/` (reciben "hoy")

Sin React, sin LocalStorage, sin reloj interno, sin `any`.

| Módulo | Función (propuesta) | Firma conceptual | Cubre |
|---|---|---|---|
| `date.ts` | `toLocalISODate(date)` | `(d: Date) → ISODateString` | RF-01, RF-02, RF-12 |
| `date.ts` | `isValidISODate(value)` | `(unknown) → value is ISODateString` (regex + fecha real) | RF-09, §3.5 |
| `date.ts` | `getWeekRange(today)` | `(today) → { start, end }` (lunes/domingo) | RF-02, RF-05, RF-06 |
| `date.ts` | `getDayOfWeek(today)` | `(today) → DayOfWeek` | RF-02, RF-03, RF-04 |
| `date.ts` | `getDayOfYear(today)` | `(today) → number` | RF-01 |
| `date.ts` | `getWeekDates(today)` | `(today) → ISODateString[]` (7 días) | RF-04, RF-05 |
| `date.ts` | `formatWeekLabel(range)` | `(range) → string` (`26 oct – 1 nov` / con año si cruza) | RF-02 |
| `numbers.ts` | `roundHalfUp(value, decimals)` | `(number, number) → number` | RF-04, RF-05, RF-06 |
| `numbers.ts` | `formatDecimal(value, decimals)` | `(number, number) → string` (coma, sin `Intl`) | RF-05, RF-06, RF-13 |
| `time.ts` | `isValidTimeOfDay(value)` | `(unknown) → value is TimeOfDay` (regex estricta) | RF-03, §3.5 |
| `time.ts` | `toMinutes(time)` | `(TimeOfDay) → number` (minutos desde medianoche) | RF-03 |
| `phrases.ts` | `getDailyPhrase(today)` + `dailyPhrases` | `(today) → MotivationalPhrase` | RF-01 |
| `habits.ts` | `getHabitsForDate(habits, today)` | `→ Habit[]` activos aplicables | RF-03, RF-04, RF-07 |
| `habits.ts` | `getDailyCompletionRate(habits, logs, today)` | `→ number \| null` | RF-04 |
| `habits.ts` | `getWeeklyCompletionAverage(habits, logs, today)` | `→ number \| null` | RF-04 |
| `habits.ts` | `getNextAction(habits, logs, today, now)` | `→ { habit, status: "upcoming" \| "overdue" } \| null` | RF-03 |
| `habits.ts` | `getChecklistHabits(habits, today)` | `→ Habit[]` (prioritarios o fallback) | RF-07 |
| `habits.ts` | `upsertCompletion(logs, habitId, today, completed)` | `→ CompletionLog[]` | RF-07, RF-03 |
| `study.ts` | `getWeeklyStudyMinutes(sessions, today)` | `→ number` | RF-05 |
| `study.ts` | `getGoalProgress(value, goal)` | `→ { percent, cappedPercent }` | RF-05, RF-06 |
| `sleep.ts` | `dedupeSleepLogsByDate(logs)` | `→ SleepLog[]` (gana `createdAt` reciente) | RF-06 |
| `sleep.ts` | `getWeeklySleepAverage(logs, today)` | `→ { average: number \| null; excludedCount: number }` | RF-06 |
| `sleep.ts` | `getSleepLogForDate(logs, today)` | `→ SleepLog \| null` | RF-06 |
| `goals.ts` | `defaultWeeklyGoals`, `normalizeWeeklyGoals(unknown)` | `→ WeeklyGoals` | RF-08, RF-09 |
| `seeds.ts` | `seedCategories`, `seedHabits`, `buildSeedState(today)` | constantes + `(today) → SeedState` | RF-14 |

### 7.2 Persistencia — `src/lib/persistence.ts` y `src/types/`

| Elemento | Responsabilidad | Cubre |
|---|---|---|
| `src/types/habit.ts`, `category.ts`, `completion.ts`, `study.ts`, `sleep.ts`, `goals.ts` | Interfaces de dominio + Type Guards; exportadas por el barril `src/types/index.ts` | D1, RF-09 |
| `src/types/storage.ts` | Ampliar `STORAGE_KEYS` (incluida `SEED_STATE`); marcar `MOTIVATIONAL_PHRASE_STATE` como legado | D1, RF-14 |
| `persistence.ts` | Helpers tipados `get/set` por entidad (`getHabits/setHabits`, `getCompletionLogs/setCompletionLogs`, `getStudySessions/...`, `getSleepLogs/...`, `getWeeklyGoals/...`, `getSeedState/...`), validación con Type Guards, sin doble prefijo, bloqueo de escritura por clave ilegible, `storage` event | RF-09, RF-14 |
| `persistence.ts` | `getStartupState` corregido (lectura con clave simple) y `setStartupState` | RF-11, D10 |

### 7.3 Hooks — `src/hooks/`

| Hook | Responsabilidad | Cubre |
|---|---|---|
| `useToday()` | Único punto que lee el reloj; expone `today` y `now`; comprueba cada 60 s con la pestaña visible y en `focus`/`visibilitychange` | RF-10, RF-12 |
| `useDashboardData(today)` | Carga/guarda hábitos, logs, sesiones, sueño y metas; aplica upserts optimistas con reversión; relee en foco y escucha `storage` | RF-07, RF-08, RF-09, RF-12, RF-14 |
| `useMounted()` | Indica si el componente ya se montó en cliente, para renderizar el esqueleto neutro | RF-12 |

### 7.4 Componentes — `src/components/`

| Componente | Responsabilidad | Cubre |
|---|---|---|
| `dashboard/WeeklyHeader.tsx` | Rango de semana + 4 enlaces de navegación | RF-02 |
| `dashboard/DailyPhraseCard.tsx` | Frase determinista del día (reemplaza `MotivationalBanner`) | RF-01 |
| `dashboard/NextActionCard.tsx` | Próxima acción / "Atrasado" / estado vacío + control directo de completado | RF-03 |
| `dashboard/WeeklyMetrics.tsx` | Contenedor de las tres métricas | RF-04, RF-05, RF-06 |
| `dashboard/metrics/CompletionMetric.tsx` | Hoy vs. promedio semanal | RF-04 |
| `dashboard/metrics/StudyMetric.tsx` | Total vs. meta + barra | RF-05 |
| `dashboard/metrics/SleepMetric.tsx` | Promedio + registro rápido de anoche + aviso de registros fuera de rango | RF-06 |
| `dashboard/QuickChecklist.tsx` | Lista con checkbox directo, conteo y etiqueta "ejemplo" | RF-07 |
| `dashboard/GoalsEditor.tsx` | Edición de metas de estudio y sueño | RF-08 |
| `dashboard/DashboardSkeleton.tsx` | Esqueleto neutro previo al montaje (sin fechas ni valores) | RF-12 |
| `ui/MetricCard.tsx`, `ui/ProgressBar.tsx`, `ui/EmptyState.tsx`, `ui/NumberInput.tsx`, `ui/Notice.tsx` | Primitivas reutilizables (`tabular-nums`, verde solo en progreso, aviso no bloqueante) | RF-13 |
| `app/page.tsx` | Composición de la vista `/` (client), `Startscreen` gobernada por `STARTUP_SHOWN`, orden de las 5 secciones | RF-11, RF-13, RF-15 |
| `ui/Startscreen.tsx` | Sin cambios de contenido ni apariencia; su visibilidad la decide `page.tsx` | RF-11 |

> `MotivationalBanner.tsx`, `motivationalPhrases.ts` y `StartscreenChecker.tsx` se retiran (RF-15). `MotivationalPhrase` (`src/types/motivational.ts`) se conserva como tipo de la nueva lista de frases (H-33).

---

## 8. Supuestos y limitaciones aceptadas

**Preguntas abiertas: ninguna.** D1–D11 cubren las decisiones de negocio necesarias y las restantes se resuelven de forma normativa en este documento.

- **Supuesto A (sueño):** `SleepLog.date` es la fecha de la **mañana** en que se despierta el usuario; el registro rápido de "la noche anterior" se guarda con `date = hoy`. Justificación: un único criterio temporal, sin cruzar medianoche, y un solo registro por noche.
- **Supuesto B (próxima acción):** se excluyen los hábitos ya completados (la tarjeta indica "qué hacer ahora", no "qué había planeado") y el fallback "Atrasado" usa la hora pasada más cercana (D9).
- **Supuesto C (promedio de sueño):** se divide entre las fechas únicas con registro, no entre los días transcurridos, para no penalizar noches sin registrar.
- **Supuesto D (alta de hábitos):** el alta/edición de hábitos queda fuera de alcance; el dashboard consume datos existentes y siembra ejemplos en la primera visita (RF-14).
- **Limitación 1 — recálculo retroactivo (H-09):** `CompletionLog` no guarda el `targetDays` ni el `active` vigentes en la fecha del registro, por lo que los porcentajes de días pasados se recalculan con el estado actual del hábito. Se acepta: añadir un snapshot por día duplicaría los datos sin consumidor en este hito.
- **Limitación 2 — ventana de sueño (D11):** la métrica usa la fecha de registro; la noche del domingo actual cuenta en la semana siguiente y la del domingo anterior en la actual. El promedio queda completo el domingo (a más tardar el domingo por la noche).
- **Limitación 3 — zona horaria (H-30):** un viaje que cambie de zona horaria se refleja en la siguiente comprobación (≤ 60 s) o al recuperar el foco; los registros guardados conservan su `date` original.
- **Limitación 4 — sin tests automatizados (H-35):** el repositorio no tiene runner; la verificación es manual (RNF-10) y las funciones puras quedan preparadas para ser testeadas sin mocks.

---

## 9. Trazabilidad resumida

| Sección de la vista | RF | Módulos `src/lib/` | Componentes |
|---|---|---|---|
| Cabecera y navegación (1.º) | RF-02 | `date.ts` | `WeeklyHeader` |
| Frase Diaria de Enfoque (2.º) | RF-01 | `date.ts`, `phrases.ts`, tipo `MotivationalPhrase` | `DailyPhraseCard` |
| Próxima Acción Inmediata (3.º) | RF-03 | `date.ts`, `time.ts`, `habits.ts` | `NextActionCard` |
| Cumplimiento de hábitos (4.º) | RF-04 | `habits.ts`, `date.ts`, `numbers.ts` | `CompletionMetric` |
| Horas de estudio (4.º) | RF-05 | `study.ts`, `date.ts`, `numbers.ts` | `StudyMetric` |
| Horas de sueño + registro (4.º) | RF-06 | `sleep.ts`, `date.ts`, `numbers.ts` | `SleepMetric` |
| Checklist Rápido (5.º) | RF-07 | `habits.ts` | `QuickChecklist` |
| Metas editables | RF-08 | `goals.ts` | `GoalsEditor` |
| Persistencia y robustez | RF-09 | `persistence.ts`, `types/` | `Notice` |
| Pureza de cálculos | RF-10 | todos | `useToday` |
| Primer uso / vacíos / bienvenida | RF-11 | `persistence.ts` | `EmptyState`, `Startscreen`, `page.tsx` |
| Cambio de día y relectura | RF-12 | `date.ts` | `useToday`, `useDashboardData`, `DashboardSkeleton` |
| Diseño y accesibilidad | RF-13 | `numbers.ts` | `ui/*` |
| Datos semilla | RF-14 | `seeds.ts`, `persistence.ts` | `page.tsx` |
| Retirada de UI y legado | RF-15 | — | `page.tsx` |
| RNF-09 Alias `@/` | RNF-09 | todos | todos |

---

## 10. Resolución de hallazgos QA

| ID | Decisión tomada | Sección / RF |
|---|---|---|
| H-01 | Regla única: el cambio optimista **se revierte** al estado visual previo ante fallo de persistencia + aviso no bloqueante. Se elimina la opción "mantener en memoria". Un solo criterio fija el estado del checkbox. | RF-07, RF-09 |
| H-02 | `Startscreen` se muestra una vez por dispositivo vía `STARTUP_SHOWN`; doble prefijo corregido; cambio observable documentado. | D10, §3.2, RF-11 |
| H-03 | `startTime` válido solo con `^([01]\d|2[0-3]):[0-5]\d$`; comparación en minutos desde medianoche; hora inválida ⇒ fuera de RF-03, dentro de checklist y métricas. | §3.1, §3.5, RF-03, CL-26 |
| H-04 | Rango canónico único de sueño 0.5–24 con paso 0.5 para modelo, lectura, formulario y meta; se elimina 4–12; registros fuera de rango excluidos y señalados. Los criterios de RF-06/RF-08 usan valores realmente inválidos (`26`, `0`, `7,25`) y confirman que `13` es válido. | §3.1, §3.3, RF-06, RF-08, CL-17 |
| H-05 | La tarjeta de Próxima Acción incorpora control directo de completar/desmarcar con el mismo upsert; el cambio se refleja en checklist y métricas. | RF-03, RF-07 |
| H-06 | Clave ilegible ⇒ escrituras bloqueadas + restablecimiento explícito por acción del usuario; nunca sobrescritura silenciosa. | RF-09, RF-14, CL-28 |
| H-07 | Próxima Acción ignora completados; si todas las horas pasaron, muestra la más reciente con "Atrasado" (nunca vacío). | D9, RF-03, CL-40 |
| H-08 | Ventana de sueño por fecha de registro lun–dom, con desfase documentado (incluye domingo anterior, excluye domingo actual). | D11, RF-06, §8 |
| H-09 | Recálculo retroactivo declarado normativo con `targetDays`/`active` actuales; limitación aceptada, sin snapshot. | RF-04, §8 |
| H-10 | Semilla de primera visita con 4 hábitos de ejemplo con `priority` y `startTime`, borrables, y 5 categorías con `id = slug` para que los hábitos resuelvan su categoría; hace verificables RF-03/04/07 sin `HabitForm`. | D8, §3.4, RF-14 |
| H-11 | Política campo por campo (descartar / default) para `Habit` y fechas, con justificación de omitir marca de versión de esquema. | §3.5, RF-09, CL-42 |
| H-12 | Comprobación cada 60 s con pestaña visible + `focus`/`visibilitychange`; tolerancia ≤ 60 s verificable. | RF-12, CL-06, CL-39 |
| H-13 | Esqueleto neutro hasta el montaje: sin fechas ni datos de LocalStorage en el HTML inicial; contenido tras montaje. | RF-12, §7.3, §7.4 |
| H-14 | Deduplicación de sueño por fecha antes de calcular; gana `createdAt` más reciente (empate: último del array); denominador = fechas únicas. | RF-06, CL-05 |
| H-15 | Se mantiene el contrato de datos y la jerarquía/firmas (exigido por `AGENTS.md`), pero se corrige la declaración de alcance: los nombres definitivos de archivos los confirma el plan. | Encabezado, §7 |
| H-16 | Orden de retirada de "+ Nuevo hábito", `animate-pulse`, `selection:bg-emerald-500/20` y "Progreso 0%" fijo; escala verde permitida y `emerald-400` prohibido. | RF-13, RF-15 |
| H-17 | Igual que H-10: semilla verificable y borrable. | D8, RF-14 |
| H-18 | Redondeo único mitad hacia arriba; porcentajes enteros; horas con un decimal y coma. | RF-04, RF-05, RF-06, RF-13, CL-36 |
| H-19 | Todos los RF normalizados a EARS (Ubicuo / Cuando / Si–entonces / Mientras) con sujeto "El sistema deberá…". | §4 |
| H-20 | Cabecera con etiqueta única verificable `26 oct – 1 nov` (miércoles 28 oct 2026), sin número de semana ni "Semana en curso"; añadida a trazabilidad. | RF-02, §9 |
| H-21 | Formato con año cuando el rango cruza el año: `29 dic 2025 – 4 ene 2026`. | RF-02, CL-31 |
| H-22 | `CompletionLog.updatedAt` eliminado (no tenía uso). | §3.1 |
| H-23 | `Category.slug` tipado como unión literal y `Category.color` restringido a paleta sin verde. | §3.1 |
| H-24 | Tema oscuro forzado (`zinc-950`) en el dashboard, sin `dark:`; `Startscreen` conserva su comportamiento. | RF-13, CL-44 |
| H-25 | Regla única: se ignoran todos los registros con `date > hoy` en todas las métricas. | RF-04, RF-05, RF-06, §3.5, CL-33 |
| H-26 | Sueño ≥ meta ⇒ indicador `emerald-500`; por debajo ⇒ neutro. | RF-06, CL-41 |
| H-27 | Límite exacto de 120 caracteres por frase, verificable. | RF-01 |
| H-28 | Desempate de `startTime` por título alfabético y, si persiste, por `id`. | RF-03, CL-35 |
| H-29 | `minutes` entero > 0; inválidas excluidas; sesiones solapadas se suman (documentado). | §3.1, §3.5, RF-05, CL-34 |
| H-30 | Limitación de zona horaria por viaje documentada, con recálculo en ≤ 60 s o en `focus`/`visibilitychange`. | RF-12, §8, CL-32 |
| H-31 | Corregida la afirmación sobre el fallback: lecturas con doble prefijo y escrituras con prefijo simple; se documenta el cambio observable de `hasSeenStartup`. | §1, §3.2, RF-11, CL-37 |
| H-32 | Criterio explícito de cero importaciones sin alias `@/` en todos los archivos tocados, incluidos los existentes con rutas relativas. | RNF-09, RF-15 |
| H-33 | La trazabilidad usa `MotivationalPhrase` (tipo existente); se conserva ese tipo para la nueva lista. | §7, §9, RF-15 |
| H-34 | Relectura desde disco al recuperar foco, escucha de `storage` entre pestañas y conservación del estado optimista pendiente hasta que la escritura resuelva. | RF-12, CL-21, CL-43 |
| H-35 | Declarado explícitamente que el hito no incluye tests automatizados; verificación manual con Chrome DevTools, sin contradecir la testabilidad de las funciones puras. | RNF-10, §8 |
| H-36 | Formato numérico explícito: coma decimal, sin `Intl` ni `toLocaleString`. | RF-13, RNF-07 |
| Menor | Corregida la concordancia "próximas acción" ⇒ "próxima acción" en el estado vacío; hallazgo del doble prefijo enlazado a `src/lib/persistence.ts:6`. | §1, §3.2, RF-11 |
| Menor | Retirada decidida ya (no diferida al plan) de `MotivationalBanner` y `defaultMotivationalPhrases`; nueva lista sobria en español sin código muerto. | RF-01, RF-15 |
| Menor | Orden de lectura visual fijado: cabecera, frase, próxima acción, métricas, checklist. | RF-13, §9 |
| Menor | RNF-04 sustituido por criterio verificable (pasadas lineales + sin long tasks > 50 ms). | RNF-04 |
| Menor | Actualización de `MEMORY.md` (≤ 50 líneas) añadida como criterio de cierre. | RNF-12 |
| Menor | `StartscreenChecker.tsx` corrupto (contenido numérico, sin importadores) incluido en la retirada para que `tsc --noEmit` pase. | RF-15 |

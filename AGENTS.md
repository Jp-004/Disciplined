# Disciplined — Quickstart para Agentes OpenCode

> **Prerrequisito:** Este repositorio usa Node.js 20+, npm/pnpm y TypeScript en modo estricto. Lee la configuración completa antes de hacer cambios.

> **Memoria obligatoria:** En cada consulta relacionada al proyecto, leer MEMORY.md antes de tomar cualquier decisión o realizar cualquier cambio.

> **Confirmación requerida:** Antes de modificar archivos existentes o crear nuevos, debe explícitar exactamente qué cambios se realizarán y solicitar autorización para proceder. No aplicar cambios automáticamente sin confirmación explícita.

---

## 🛠 Comandos Principales

| Acción | Comando |
|---|---|
| Instalar dependencias | `npm install` |
| Servidor de desarrollo | `npm run dev` |
| Compilar | `npm run build` |
| Iniciar producción | `npm run start` |
| Lint | `npm run lint` |
| Type check | `npx tsc --noEmit` (modo estricto enforceado via `tsconfig.json`) |

> ⚠️ **No ejecutes `npm run build` antes que `npm run lint`**; el equipo impone el orden `lint -> typecheck -> build`.

---

## 📁 Estructura de Directorios (Crítica)

```
src/
├── app/          # Next.js 16 App Router — páginas, layouts, controladores de ruta
├── types/        # **Entidades de dominio tipadas** — Habit, Category, WeeklySchedule, CompletionLog
├── components/   # Componentes UI (Atomic Design simplificado)
│   ├── ui/       # primitivas reutilizables (botones, inputs, cards)
│   └── habits/   # componentes específicos de hábitos
├── hooks/        # ganchos personalizados React (obtención de datos, form, localStorage)
└── lib/          # funciones utilitarias, constantes, helpers de formato
```

> **Alias:** `@/` → `./src/*` (definido en `tsconfig.json`). Siempre importa como `import { X } from "@types/habit"` etc.

---

## 🔐 Restricciones de Tipado (Estricto)

- `noImplicitAny: true` en `tsconfig.json`
- **Nunca uses `any`** en código nuevo. Usa `unknown` + Type Guards, o tipos específicos.
- Todas las interfaces de dominio viven en `src/types/` y se exportan mediante un solo archivo de barril `src/types/index.ts`.
- Los campos de fecha usan `ISODateString` o `Date` — sé consistente en todo `CompletionLog`, `Habit`, etc.

---

## 🎨 Estilos

- **Tailwind CSS v4** — configurado en `next.config.ts` con `@tailwindcss/turbopack`.
- Estilos globales en `src/app/globals.css`.
- Sigue los patrones existentes de `className` (p. ej., `flex`, `bg-white`, `dark:bg-black`).
- No agregues valores arbitrarios nuevos sin antes verificar si existe `tailwind.config.ts` (si existe) o el `globals.css` actual.
- Estética minimalista Blanco/Negro (zinc-950/white) con acento exclusivo en verde (emerald-500). Al crear o editar componentes visuales, sigue las reglas de la skill frontend-design.

---

## 🗄 Persistencia (Fase MVP)

- **Primera fase:** LocalStorage con ganchos tipados (`useLocalStorage` u otro similar).
- **Fase posterior:** Supabase/PostgreSQL — no mezcles ambos en el mismo commit.
- Almacena las claves como constantes (p. ej., `STORAGE_KEYS.HABITS`, `STORAGE_KEYS.WEEKLY_SCHEDULE`).

---

## 🧭 User Flow (MVP)

1. **Usuario abre la app** → `/` muestra el Dashboard Semanal (Lunes → Domingo).
2. **Usuario agrega un hábito recurrente** → Se abre un Modal → el formulario se valida → el hábito se guarda en la persistencia.
3. **Usuario marca la finalización diaria** → Clic/toggling en el día → se crea/actualiza `CompletionLog` → la UI muestra el checkmark.
4. **Usuario ve el cumplimiento** → Estadísticas resumidas (porcentaje, rachas) se renderizan desde agregados de `CompletionLog`.

> **Todo:** Definir con precisión la jerarquía de componentes y las firmas de los hooks en la especificación.

---

## 📦 Qué Evitar (Gotchas)

| Anti-pattern | Por qué |
|---|---|
| `import ... from "..."` sin alias `@/` | Rompe la resolución de tipos; siempre usa `@/...`. |
| Usar `any` por comodidad | Violenta `strict: true`; usa `unknown` + Type Guards en su lugar. |
| Codificar fechas como strings sin formato | Timestamps inconsistentes en `CompletionLog`; usa `ISODateString`. |
| Agregar código de Supabase junto a LocalStorage | Provocará conflictos de fusión; elige una capa de persistencia por PR. |
| `npm run dev` + `npm run build` race conditions | Siempre `lint` primero, luego `typecheck`, luego `build`. |

---

## 🧩 Reglas de Dominio y Modelo de Datos (MVP)

- **Ciclo Semanal (Lunes a Domingo):** La semana inicia siempre en Lunes (`dayOfWeek`: `1` = Lunes ... `7` = Domingo, o unión literal `'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'`).
- **`Category`:** Categorías base predefinidas para clasificar tareas semanales (ej. `training` / Entrenamiento, `study` / Estudio, `work` / Trabajo, `personal` / Hábitos diarios, `rest` / Descanso) con soporte de color/ícono identificador.
- **`Habit` (Tarea/Hábito semanal):** Representa una actividad recurrente. Debe incluir `id`, `title`, `description` (opcional), `categoryId`, `targetDays` (días de la semana en que aplica), `createdAt` (`ISODateString`) y `active` (`boolean`).
- **`CompletionLog`:** Registro de cumplimiento atómico por hábito y fecha exacta (`ISODateString` en formato `YYYY-MM-DD`). Un hábito está completado en un día si existe un registro con `completed: true` para ese `habitId` + `date`.
- **`WeeklySchedule` / Vista Semanal:** Estado derivado o estructura que cruza los `Habit` activos con los 7 días de la semana en curso y sus respectivos `CompletionLog`, calculando el porcentaje de progreso semanal.

---

## 📚 Fuentes de Verdad (Prefiere Estas sobre la Memoria)

- `package.json` — scripts, dependencias, nombre.
- `tsconfig.json` — opciones del compilador, modo estricto, alias `@/`.
- `next.config.ts` — Turbopack, reglas de Tailwind.
- `src/app/globals.css` — directivas globales de Tailwind y sobrescrituras de colores.
- `.gitignore` — nunca cometas `.next/`, `node_modules`, `/.env*`.

---

##Verificacion
 No hay tests automáticos. Después de cada cambio, verifica con el MCP de Chrome 
DevTools: abre `localhost:3000`, prueba la funcionalidad, revisa la consola y comprueba la 
vista móvil. 

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

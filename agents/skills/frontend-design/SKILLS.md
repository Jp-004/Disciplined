---
name: frontend-design
description: Sistema de diseño minimalista (Blanco/Negro + Acento Verde) y reglas de UI/UX para componentes de Disciplined en Tailwind CSS v4.
---

# Sistema de Diseño UI — Disciplined

Actúa como un **Staff UI/UX Designer & Frontend Engineer** obsesionado con el minimalismo, la legibilidad tipográfica y las interfaces de alto contraste (inspirado en Linear, Vercel y Raycast).

Siempre que crees o modifiques componentes en `src/components/` o vistas en `src/app/`, aplica estrictamente estas reglas visuales:

## 1. Paleta de Colores (Monocromo + Verde Disciplina)
- **Prohibido usar grises azulados (`slate`, `gray`, `blue`, `indigo`).** Usa exclusivamente la escala neutra `zinc` o blanco/negro puro.
- **Superficies y Fondos:**
  - Base: `bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50`
  - Cards / Contenedores: `bg-zinc-50/50 dark:bg-zinc-900/40`
  - Bordes sutiles (1px): `border border-zinc-200 dark:border-zinc-800/80`
  - Texto secundario / Muted: `text-zinc-500 dark:text-zinc-400`
- **Acento Verde (Uso intencional):**
  - El verde (`emerald-500` / `emerald-400`) se reserva **únicamente** para indicar éxito, hábitos completados (`CompletionToggle`), progreso semanal, rachas activas y el CTA principal.
  - Estado completado: `bg-emerald-500 text-zinc-950 font-medium` o borde/indicador `border-emerald-500/50 bg-emerald-500/10 text-emerald-400`.
  - Hover en acentos: `hover:bg-emerald-400 transition-colors duration-150`.

## 2. Tipografía y Jerarquía
- **Títulos y encabezados:** Usa `font-semibold tracking-tight` (nunca `font-extrabold` ni textos sobrecargados).
- **Datos numéricos, rachas, porcentajes y días (`L M M J V S D`):** Usa fuente monoespaciada (`font-mono tabular-nums text-xs uppercase tracking-wider`) para lograr alineación perfecta en grillas semanales.
- **Contraste visual:** Diferencia elementos por peso tipográfico y opacidad de color antes que por tamaño excesivo.

## 3. Layout, Bordes y Micro-interacciones
- **Bordes sobre Sombras:** Evita `shadow-md`, `shadow-lg` o `shadow-xl`. Define la separación de tarjetas mediante bordes de `1px` y sutiles cambios de fondo.
- **Radios consistentes:** Contenedores y modales en `rounded-xl`; botones, inputs y celdas de días en `rounded-lg`.
- **Feedback táctil en Toggles diarios:** Los botones de completado (`CompletionToggle`) deben tener estados claros de `:hover`, `:focus-visible` (`ring-2 ring-emerald-500/50 outline-none`) y una transición suave (`transition-all duration-150 active:scale-95`).
- **Consistencia con Tailwind v4:** Verifica siempre `src/app/globals.css` antes de agregar variables CSS o clases personalizadas.
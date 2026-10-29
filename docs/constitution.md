# Constitución — Disciplined

Principios innegociables. Toda spec, plan y tarea debe cumplirlos sin excepción[cite: 8].

1. **Simplicidad ante todo**: Next.js 16, React 19, Tailwind v4 y TypeScript estricto (`noImplicitAny`, cero `any`). Sin librerías superfluas ni sobre-ingeniería; importaciones siempre con alias `@/`.
2. **El plan manda**: Ningún archivo se toca sin un plan previo aprobado en modo `plan`. Si falta una decisión de negocio o diseño, se frena y se pregunta.
3. **Lógica separada de la interfaz**: Cálculos de volumen, rachas, cumplimiento y sueño en funciones puras dentro de `src/lib/`, sin depender de React ni del almacenamiento, recibiendo "hoy" como parámetro.
4. **Calidad como puerta de enlace**: Prohibido cerrar un hito o avanzar si fallan `npm run lint` o `npx tsc --noEmit`. Datos externos siempre validados con `unknown` y Type Guards.
5. **Datos y hora local sagrados**: LocalStorage tipado bajo claves controladas (`STORAGE_KEYS`) con compatibilidad hacia atrás. Ciclo semanal de lunes a domingo y fechas siempre en formato local `YYYY-MM-DD`.
6. **Diseño minimalista intencional**: Escala monocromática (`zinc-950` / blanco) y verde (`emerald-500`) reservado exclusivamente para éxito, progreso y checks. Métricas y números siempre en `tabular-nums` monoespaciado.
7. **Idioma estricto**: Código, interfaces, tipos, commits y nombres de archivos en inglés; interfaz gráfica y documentación en español.
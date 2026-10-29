---
description: Verifica lint y tipos, corrige errores y actualiza MEMORY.md al cerrar una tarea
agent: build
---
Acabamos de implementar los cambios acordados. Realiza el proceso obligatorio de cierre siguiendo las reglas de @AGENTS.md y @MEMORY.md:

1. **Verificación técnica en orden estricto:**
   - Ejecuta `npm run lint`.
   - Ejecuta `npx tsc --noEmit`.
   - Si alguno arroja errores, corrígelos respetando el tipado estricto (sin usar `any` y usando únicamente el alias `@/`) y vuelve a ejecutar ambos comandos hasta obtener cero errores.
   - NO ejecutes `npm run build` a menos que yo lo pida explícitamente: $ARGUMENTS

2. **Actualización de memoria (@MEMORY.md):**
   - Marca como `✅ Completado` el hito correspondiente en la sección "Próximos pasos".
   - Actualiza "Estado actual del proyecto" mencionando de forma concisa los archivos creados o modificados.
   - Resume o elimina información obsoleta para cumplir la regla estricta de máximo 50 líneas en @MEMORY.md.

3. **Reporte final:**
   - Muestra un resumen de 3 a 5 líneas con el resultado de `lint`, `tsc` y los cambios guardados en @MEMORY.md.
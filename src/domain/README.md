# 🧠 Principios del Dominio

Esta carpeta contiene el cerebro del sistema. Es la lógica de negocio pura, aislada de cualquier framework, UI o dependencia externa. Los principios que gobiernan este directorio no son negociables.

1.  **Pureza Absoluta.**
    *   Los módulos aquí son funciones puras. Para la misma entrada, siempre producen la misma salida.
    *   No deben tener efectos secundarios (side effects).
    *   No importan nada de React, Next.js, ni hooks (`useState`, `useEffect`, etc.).
    *   No acceden a APIs del navegador (`localStorage`, `fetch`, `window`).

2.  **Contratos Explícitos.**
    *   Toda la lógica opera sobre tipos definidos en `src/lib/types.ts`.
    *   Las funciones reciben `Context` y `Input` como argumentos explícitos. No infieren estado global.
    *   Si un tipo es ambiguo, se refina. La claridad del contrato es más importante que la conveniencia de la implementación.

3.  **Determinismo.**
    *   La lógica sigue una jerarquía estricta de reglas (ej: la "Tabla de Decisiones" de `attendanceEngine`).
    *   No hay comportamiento emergente o impredecible. El flujo es lineal y auditable.
    *   Cualquier simplificación (ej: regla provisional de turnos en `ShiftChange`) se documenta explícitamente como tal.

4.  **Blindado por Tests.**
    *   **Si una regla de negocio no tiene un test, no existe.**
    *   Cada test valida una única regla o `error code` de forma aislada.
    *   Los tests se escriben contra el contrato (`types.ts`), no contra la implementación.
    *   Una cobertura de tests alta no es una vanidad, es la garantía de que el sistema puede evolucionar sin romperse.

El propósito de este aislamiento es simple: crear un núcleo de sistema que sea **verificable, robusto y resiliente al cambio**. La UI puede fallar, los frameworks pueden cambiar, pero el dominio permanece.

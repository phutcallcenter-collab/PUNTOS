# PLANIFICACIÓN SEMANAL – LÓGICA Y COMPORTAMIENTO

Versión: 1.0
Estado: Completo y en uso

---

## ÍNDICE

1.  **Objetivo Principal**
2.  **Arquitectura Lógica (Cómo funciona)**
    *   2.1. El Principio de "Capas": Horario Base vs. Overrides
    *   2.2. El Horario Base (La Verdad Fundamental)
    *   2.3. Los Overrides Semanales (La Excepción Temporal)
    *   2.4. Jerarquía de Prioridad de Reglas
3.  **Componentes de la Interfaz (Qué ves y qué hace)**
    *   3.1. La Celda del Día (El Botón Interactivo)
    *   3.2. La Leyenda Visual
    *   3.3. El Botón "Revertir Cambios de Esta Semana"
4.  **Impacto en el Resto del Sistema**
    *   4.1. Contadores de Turno Dinámicos
    *   4.2. Validación de Incidencias

---

### 1. OBJETIVO PRINCIPAL

La tabla de Planificación Semanal es la interfaz visual para **gestionar y anular temporalmente** el horario de trabajo de los representantes para la semana en curso.

Su propósito NO es definir el horario fundamental de un representante (eso se hace al crearlo/editarlo), sino permitir a los supervisores y gerentes hacer **ajustes rápidos y temporales** para una semana específica sin alterar la plantilla base.

---

### 2. ARQUITECTURA LÓGICA (CÓMO FUNCIONA)

#### 2.1. El Principio de "Capas"

La disponibilidad de un representante en un día determinado se calcula aplicando una serie de "capas" en un orden estricto de prioridad. La capa superior siempre gana.

1.  **(Máxima Prioridad) Licencias y Vacaciones:** Si un representante tiene un bloque de licencia o vacaciones activo, anula cualquier otra regla. El día es **NO LABORAL**.
2.  **Cambios de Turno (Swaps/Covers):** Si hay un cambio de turno registrado para ese día, este define quién trabaja y quién no.
3.  **Overrides Semanales:** Si se hizo un clic en la tabla para cambiar el estado de un día, esa decisión manual tiene la siguiente prioridad.
4.  **(Mínima Prioridad) Horario Base:** Si ninguna de las capas anteriores aplica, el sistema recurre al horario fundamental del representante.

#### 2.2. El Horario Base (La Verdad Fundamental)

Este es el horario "por defecto" de un representante y se define por cuatro propiedades guardadas en su perfil:

*   `turnoBase`: "Día" o "Noche". Es su turno principal.
*   `esMixto`: `true` o `false`. Indica si aplica la regla de doble turno.
*   `tipoMixto`: "semana" (L-J) o "finDeSemana" (V-D). Define *cuándo* aplica el doble turno.
*   `diaLibre`: El día de la semana que tiene libre por defecto.

**Ejemplo de Horario Base:**
*   **Rep:** JOSÉ
*   **Turno Base:** Noche
*   **Es Mixto:** Sí
*   **Tipo Mixto:** finDeSemana
*   **Día Libre:** miércoles

**Lógica Aplicada:**
*   **Lunes y Martes:** Como no son días de su turno mixto y no es su día libre, José trabaja **solo de Noche**.
*   **Miércoles:** Es su día libre, por lo tanto **NO trabaja**.
*   **Viernes, Sábado, Domingo:** Son sus días de turno mixto, por lo tanto trabaja **Doble Turno (Día y Noche)**.

#### 2.3. Los Overrides Semanales (La Excepción Temporal)

Cuando un usuario hace clic en una celda de la tabla de planificación, **no está cambiando el Horario Base**. En su lugar, está creando un "override" (una anulación) que se guarda en `localStorage` y se aplica **únicamente a la semana en curso**.

*   **Lógica del Clic (Toggle):**
    1.  **Primer Clic:** El sistema mira el estado base del día. Si es "Laboral", lo cambia a "Libre" y guarda este override. Si era "Libre", lo cambia a "Laboral". Se crea un `override`.
    2.  **Segundo Clic (en una celda modificada):** El sistema detecta que ya existe un `override` para ese día y **lo elimina**, haciendo que el día vuelva a su estado de Horario Base.

*   **Persistencia:** Estos overrides se almacenan asociados a un `weekId` (ej: "2024-05-20"), por lo que no afectan a semanas pasadas ni futuras.

#### 2.4. Jerarquía de Prioridad de Reglas (Completa)

La función `getRepDailyAssignment` es el cerebro que calcula el estado final de un día para un representante, siguiendo esta secuencia:

1.  **¿Está de Licencia o Vacaciones?** -> **SÍ:** Se considera `isFree = true`. Fin.
2.  **¿Tiene un Cambio de Turno (Swap/Cover/Double) activo?** -> **SÍ:** Su estado lo define el `ShiftChange`. Fin.
3.  **¿Existe un Override Semanal para este día?** -> **SÍ:** El override (`true` o `false`) define si trabaja o no. Fin.
4.  **¿Ninguna de las anteriores?** -> **NO:** Se aplica la lógica del **Horario Base** (turno, día libre, y si es día mixto).

---

### 3. COMPONENTES DE LA INTERFAZ (QUÉ VES Y QUÉ HACE)

#### 3.1. La Celda del Día (El Botón Interactivo)

Cada celda en la tabla representa el estado de un representante para un turno y día específicos.

*   **Contenido y Color:**
    *   `✓` (Verde): El representante está **laboral** en ese turno. El botón está habilitado.
    *   `✗` (Gris): El representante está **libre** en ese turno. El botón está habilitado.
    *   `-` (Gris claro, deshabilitado): El representante **no aplica** para ese turno en ese día (ej: un agente del turno noche en la tabla del turno día en un día no mixto).

*   **Indicador de Override (Borde y Punto Azul):**
    *   Cuando una celda ha sido modificada manualmente (tiene un `override`), se le añade un **borde azul y un punto azul brillante**. Esto te permite ver de un vistazo qué días de la semana no siguen el horario base.

*   **Comportamiento del Clic:**
    *   Al hacer clic, se ejecuta la lógica de `toggleWorkDay` para crear o eliminar un override.

#### 3.2. La Leyenda Visual

Ubicada antes de las tablas, la leyenda explica el significado de cada estado visual para que cualquier usuario, nuevo o antiguo, pueda entender la interfaz sin necesidad de preguntar.

#### 3.3. El Botón "Revertir Cambios de Esta Semana"

*   **Función:** Este botón es un "reseteo" de seguridad. Al hacer clic, **elimina todos los overrides de la semana actual**, devolviendo a todos los representantes a su Horario Base para esa semana.
*   **Utilidad:** Permite corregir rápidamente errores de planificación masivos sin tener que hacer clic en cada celda individualmente.

---

### 4. IMPACTO EN EL RESTO DEL SISTEMA

Los cambios en la tabla de planificación no son meramente visuales; afectan a otras partes críticas de la aplicación.

#### 4.1. Contadores de Turno Dinámicos

*   Los contadores "Turno Diurno (X)" y "Turno Nocturno (X)" en la barra lateral **son dinámicos**.
*   Utilizan la misma función `getRepDailyAssignment` para calcular, en tiempo real, cuántos representantes están **efectivamente trabajando** en cada turno para el día que está seleccionado en el "Registro Diario".
*   Si modificas la planificación de hoy, esos números se actualizarán instantáneamente.

#### 4.2. Validación de Incidencias

*   Cuando registras una incidencia (ej: "Ausencia"), el sistema usa `getRepDailyAssignment` para verificar si el representante **debía estar trabajando** en esa fecha y turno.
*   Si la planificación semanal indica que el representante estaba libre (ya sea por su día libre base o por un override), el sistema **rechazará la incidencia punitiva** (como tardanza o ausencia), evitando registros incorrectos.
*   Esto asegura que la lógica de negocio y la planificación visual estén siempre sincronizadas.
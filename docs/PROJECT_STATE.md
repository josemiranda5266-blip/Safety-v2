# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Motor de criterios regulatorios de Iluminación

### Objetivo

Separar la referencia normativa del criterio técnico utilizado para evaluar una medición. El motor debe recibir el valor medido y el valor requerido aplicable, evaluar también la uniformidad cuando exista información suficiente, y devolver el resultado junto con la referencia y versión normativa utilizadas.

### Auditoría normativa

La SRT establece que el protocolo de Iluminación de la Res. 84/2012 es obligatorio y que los valores de medición consignados en el protocolo tienen una validez de 12 meses. El formulario oficial incluye, por punto de muestreo, valor medido en lux, valor requerido legalmente según Anexo IV del Decreto 351/79 y el criterio de uniformidad. El Anexo IV establece una relación no menor de 0,5 entre los valores mínimo y medio para una uniformidad razonable. Fuentes oficiales consultadas: SRT y normativa nacional.

### Implementación

- Creado `src/config/srtLightingCriteria.ts`.
- El criterio tiene identificador propio `srt_84_2012_lighting` y referencia `srt-84-2012`.
- El motor distingue `compliant`, `non_compliant` e `insufficient_data`.
- Evalúa `measuredLux >= requiredLux`.
- Cuando existen mínimo y promedio, calcula `minimumLux / averageLux` y exige una relación mínima de 0,5.
- Conserva en el resultado la referencia normativa, versión y fuente oficial.
- El valor requerido no se hardcodea en el motor: debe provenir del criterio aplicable al puesto/tarea/local. Esto evita fabricar un único límite de lux para todas las actividades.
- Se corrigió el acceso al catálogo para utilizar `getSrtReference()` en lugar de indexar incorrectamente una colección.

### Commits

- `6b23413e74e04cfd89f7febe7aea53fbafacf8fb` — feat(hygiene): add versioned lighting regulatory criterion engine
- `15197c7b3a0fb0cf72a726d48dbc4796a5735694` — fix(hygiene): resolve lighting regulation through catalog API

### Estado arquitectónico

```text
CATÁLOGO DE NORMAS
       ↓
CRITERIO VERSIONADO
       ↓
VALOR REQUERIDO APLICABLE
       ↓
MEDICIÓN
       ↓
EVALUACIÓN
       ↓
SNAPSHOT HISTÓRICO
       ↓
DOCUMENTO
```

### Próxima acción

Conectar el criterio con la clasificación real del punto de medición para obtener el valor requerido aplicable desde una tabla normativa estructurada, conservando en el snapshot el criterio y valor utilizados. Después llevar ese resultado al documento y al PDF.

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

### Objetivo

Consolidar las referencias normativas utilizadas por los protocolos en un catálogo central, identificable y versionable, evitando que cada módulo invente o hardcodee referencias legales de forma aislada.

### Implementación

- Creado `src/config/srtRegulatoryCatalog.ts`.
- Referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor.
- La plantilla `lighting_protocol` está vinculada a `srt-84-2012`.
- La representación conserva identidad de la referencia normativa y evaluación congelada del snapshot.

### Estado arquitectónico

```text
CATÁLOGO SRT
    ↓
PLANTILLA VERSIONADA
    ↓
MEDICIÓN / EVALUACIÓN
    ↓
SNAPSHOT HISTÓRICO
    ↓
DOCUMENTO
    ↓
REPRESENTACIÓN
    ├── WEB
    └── PDF
```

---

## 2026-08-29 — Exportación PDF de Iluminación

### Resultado arquitectónico

```text
SNAPSHOT HISTÓRICO
       ↓
DOCUMENTO VERSIONADO
       ↓
REPRESENTACIÓN DOCUMENTAL
       ├───────────────┐
       ↓               ↓
    VISOR WEB       EXPORTADOR PDF
```

La representación es la fuente común; Web y PDF no poseen cálculos propios.

### Próximas fases prioritarias

1. Tabla normativa aplicable para clasificar tareas/locales de Iluminación.
2. Persistencia del criterio y valor requerido utilizado en cada medición.
3. Protocolo de Ruido.
4. Protocolo de Puesta a Tierra.
5. Integración medición → hallazgo → acción correctiva.
6. Alertas de calibración y vencimientos.
7. Matriz integral de mediciones por empresa.
8. Gestión comercial de alquiler después de consolidar inventario técnico.

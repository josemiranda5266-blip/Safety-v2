# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Tabla normativa estructurada de Iluminación

### Objetivo

Eliminar la dependencia de un `requiredLux` introducido manualmente y comenzar a resolver el valor requerido desde una tabla normativa versionada. El sistema debe mantener una diferencia estricta entre referencia legal, clasificación normativa y resultado de medición.

### Fuente auditada

El Anexo IV del Decreto 351/79 establece que la intensidad mínima depende de la dificultad de la tarea visual (Tabla 1) o del destino del local (Tabla 2), y que la Tabla 1 se utiliza para tareas no incluidas en Tabla 2. La guía oficial de SRT 84/2012 describe el mismo procedimiento. citeturn0search0turn0search13

El formulario oficial de SRT 84/2012 requiere punto de muestreo, hora, sector, sección/puesto, tipo de iluminación, fuente, general/localizada/mixta, uniformidad, valor medido y valor requerido legalmente según Anexo IV del Decreto 351/79. citeturn0search12

### Implementación

- Creado `src/config/srtLightingRequirements.ts`.
- Se agregó un catálogo estructurado de requisitos de primera cobertura, con fuente `table_2` o `table_1_visual_task`.
- Cada requisito conserva ID, categoría, tarea/local, lux requerido, fuente normativa, versión y URL oficial.
- Se incorporaron rangos de Tabla 1 sin convertirlos artificialmente en una falsa precisión: el registro conserva `maximumLux` y una nota que obliga a mantener la clasificación profesional.
- Se agregó `resolveLightingRequirement()` para resolver por ID profesional o por coincidencia controlada de categoría/tarea/local.
- Las coincidencias ambiguas o inexistentes devuelven `undefined`; el sistema no inventa un valor.
- La tabla se declara como primera cobertura curada, no como catálogo exhaustivo. Esto evita presentar como completa una transcripción parcial de la normativa.

### Commit

- `69e62e7a1e47e7c20f2b516e01d4fa74bddb012c` — feat(hygiene): add structured lighting regulatory requirements

### Próxima acción

Conectar `resolveLightingRequirement()` con el flujo real de creación/edición de mediciones y persistir en el snapshot: `requirementId`, categoría, tarea/local, `requiredLux`, rango cuando corresponda, fuente y versión normativa. Luego mostrar esos datos en evaluación, documento web y PDF.

---

## 2026-08-29 — Endurecimiento del criterio regulatorio de Iluminación

### Hallazgo

El primer motor de criterios permitía evaluar como conforme un registro aunque faltaran mínimo y promedio, porque trataba la uniformidad como opcional. Eso es demasiado permisivo para una evaluación documental del protocolo: el Anexo IV exige una relación no menor de 0,5 entre iluminancia mínima y media para una uniformidad razonable. Además, la Resolución SRT 84/2012 establece una validez de 12 meses para los valores de medición consignados en el protocolo.

### Corrección

`src/config/srtLightingCriteria.ts` ahora:

- exige `measuredLux`, `requiredLux`, `minimumLux` y `averageLux` para emitir una evaluación de conformidad;
- calcula uniformidad exclusivamente como `minimumLux / averageLux`;
- mantiene el umbral normativo de `0.5`;
- incorpora `validityMonths = 12`;
- calcula `validityExpiresAt` a partir de la fecha de medición;
- informa `isExpired` en función de la fecha de evaluación;
- conserva referencia, versión y fuente oficial;
- mantiene `insufficient_data` cuando no existe información suficiente, en lugar de convertir ausencia de datos en cumplimiento.

### Fuente normativa auditada

La SRT identifica la Resolución 84/2012 como protocolo obligatorio de medición de iluminación y el Decreto 351/79, Anexo IV, establece que la intensidad mínima depende de la dificultad de la tarea visual o del destino del local y fija una relación mínima de 0,5 entre iluminancia mínima y media. citeturn0search0turn0search3

### Commit

- `f770380198ce9ca3d406263f9da8ba0a5ba6db5f` — fix(hygiene): harden lighting regulatory evaluation and validity

---

## 2026-08-29 — Motor de criterios regulatorios de Iluminación

### Objetivo

Separar la referencia normativa del criterio técnico utilizado para evaluar una medición.

### Implementación

- Creado `src/config/srtLightingCriteria.ts`.
- Criterio `srt_84_2012_lighting` y referencia `srt-84-2012`.
- Estados `compliant`, `non_compliant` e `insufficient_data`.
- Evaluación de iluminancia y uniformidad.
- El valor requerido no se hardcodea en el motor.

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

### Implementación

- Creado `src/config/srtRegulatoryCatalog.ts`.
- Referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor.
- La plantilla `lighting_protocol` está vinculada a `srt-84-2012`.
- La representación conserva identidad normativa y evaluación congelada del snapshot.

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

1. Integrar resolución normativa con captura real y persistencia del criterio utilizado.
2. Llevar evaluación y vencimiento al documento/PDF.
3. Completar cobertura normativa de Iluminación sin introducir coincidencias ambiguas.
4. Protocolo de Ruido.
5. Protocolo de Puesta a Tierra.
6. Integración medición → hallazgo → acción correctiva.
7. Alertas de calibración y vencimientos.
8. Matriz integral de mediciones por empresa.
9. Gestión comercial de alquiler después de consolidar inventario técnico.

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Documento de Iluminación desacoplado del catálogo normativo vivo

### Objetivo
Garantizar que un documento histórico utilice exclusivamente la normativa congelada en `normativeEvaluationSnapshot` y nunca reconstruya referencia, criterio o valores requeridos desde el catálogo vivo.

### Hallazgo
`server/services/hygieneDocumentService.ts` utilizaba `getSrtReference()` desde `src/config/srtRegulatoryCatalog.ts` al construir la representación documental. Esto introducía una segunda fuente normativa para documentos ya congelados.

### Corrección aplicada
- Eliminada la dependencia de `getSrtReference()` en la representación de Iluminación.
- `buildLightingDocumentRepresentation()` ahora exige `measurementSnapshot.normativeEvaluationSnapshot`.
- La referencia normativa se obtiene de `normativeEvaluationSnapshot.reference`.
- Se valida que exista la referencia congelada.
- Se valida que la referencia congelada sea compatible con la plantilla documental.
- El catálogo vivo queda reservado para selección/validación previa al snapshot.

### Commit
- `baad5e76715c5c9202b40f53960fc75e1c1e1edc` — fix(hygiene): use frozen normative snapshot in document representation

### Estado
La representación documental de Iluminación ya no necesita consultar el catálogo normativo vivo para reconstruir la referencia de un documento generado.

---

## 2026-08-29 — PDF expone el criterio normativo congelado

### Objetivo
Evitar que el PDF muestre solamente una referencia genérica y hacer visible el criterio seleccionado, su valor requerido y los datos de evaluación provenientes del snapshot.

### Corrección aplicada
`src/services/hygieneDocumentPdfService.ts` ahora representa explícitamente, cuando están presentes en la representación documental:
- referencia normativa;
- versión normativa;
- criterio seleccionado;
- lux requeridos;
- estado de evaluación;
- fecha de evaluación;
- criterios congelados.

### Commit
- `b1f6262912fd20b8dde70149e3f4029dcda7d412` — fix(hygiene): expose frozen lighting criterion in PDF

### Regla
El PDF no calcula ni consulta normativa. Consume exclusivamente `HygieneDocumentRepresentation`.

---

## 2026-08-29 — Catálogo normativo activo conectado al editor de Iluminación

### Objetivo
Eliminar el último identificador normativo fijo del cliente y hacer que la selección de versión y criterio de Iluminación provenga del catálogo normativo controlado por backend.

### Correcciones aplicadas

- `src/services/hygieneService.ts` ahora consulta `/normative/protocols?protocolType=lighting&status=active`.
- `server/routes/normativeCatalogRoutes.ts` acepta filtro de estado y valida los estados permitidos.
- `server/services/normativeCatalogService.ts` filtra por estado después de la consulta para evitar introducir una dependencia innecesaria de un índice compuesto de Firestore.
- `LightingMeasurementEditor.tsx` elimina la asociación fija `srt-84-2012`.
- El editor carga las versiones activas desde backend y permite seleccionar la versión normativa.
- El editor permite seleccionar un criterio específico perteneciente a esa versión.
- El backend valida que la versión esté `active` y que el criterio seleccionado pertenezca realmente a la versión.
- `NormativeEvaluationSnapshot` incorpora `selectedCriterionId`.
- `lightingEvaluation.ts` evalúa únicamente el criterio seleccionado cuando existe y obtiene `requiredLux` desde `criterion.parameters.requiredLux`, nunca desde un campo manual de la medición.
- El editor muestra el criterio y el valor requerido congelados en el snapshot.

### Commits

- `a6bd4b4f702d7b6faa8f41a52407cce3f05f368d` — feat(hygiene): query active lighting normative versions
- `ad7c9afb61ebaff13e808a82f1ac4d922e2b6dca` — feat(normative): expose status filter for active catalog
- `d733e85a5435b5c2c260cfffb57f731fc679827a` — feat(normative): allow filtering protocol catalog by status
- `7c343e345118b366c224e1a8f37a080bd1f5f5d6` — feat(hygiene): persist selected normative criterion in snapshot type
- `0bbfa3f4a43261e2c6702c11a78776c068a33ec9` — feat(hygiene): validate selected normative criterion in snapshot
- `686657109c4be1713fa38297ec74598507bdb96d` — feat(hygiene): select active lighting criterion from server catalog
- `bed0fe8a03515dcbc8616ce51a381f25f819c3b2` — feat(hygiene): evaluate selected lighting criterion from snapshot

### Estado

La cadena normativa queda ahora:

```text
CATÁLOGO NORMATIVO BACKEND
          ↓
VERSIÓN ACTIVA
          ↓
CRITERIO ESPECÍFICO
          ↓
VALIDACIÓN SERVER-SIDE
          ↓
SNAPSHOT NORMATIVO
          ↓
EVALUACIÓN ASISTIDA
          ↓
REVISIÓN PROFESIONAL
          ↓
DOCUMENTO HISTÓRICO
          ↓
WEB / PDF / XLSX
```

### Hallazgo pendiente

El catálogo frontend `src/config/srtLightingRequirements.ts` sigue existiendo como cobertura normativa auxiliar. No debe convertirse en una segunda fuente de verdad para documentos nuevos. La fuente canónica para el flujo persistido debe ser `normativeProtocolVersions` del backend.

Además, `lightingEvaluation.ts` obtiene `requiredLux` del criterio congelado, pero la decisión final de cumplimiento continúa siendo profesional.

---

## 2026-08-29 — Integración real del snapshot normativo en el editor de Iluminación

### Objetivo

Cerrar el hueco entre el helper normativo y la aplicación real: el criterio normativo no debe existir solamente en código de soporte; debe poder asociarse explícitamente a una medición y quedar persistido antes de enviarla a revisión.

### Correcciones

- `src/services/hygieneService.ts` incorpora `saveNormativeSnapshot()`.
- `updateMeasurement()` tipa explícitamente `normativeEvaluationSnapshot`.
- `LightingMeasurementEditor.tsx` incorporó originalmente una acción explícita para asociar normativa; posteriormente fue reemplazada por selección dinámica desde backend.
- El editor muestra referencia normativa, versión, criterios congelados y fecha de evaluación.
- El requisito de `Normativa asociada` del flujo de envío a revisión quedó conectado a persistencia real.
- Se mantiene la regla: no se declara cumplimiento automáticamente y la validación final continúa siendo profesional.

### Commits históricos

- `032be13386cfb8533e30b91f08479b0bbfdc4756` — feat(hygiene): persist normative snapshot from measurement service
- `674a461af66fcd67913ec7d09ac235a574fd1b95` — feat(hygiene): connect lighting editor to normative snapshot workflow

---

## 2026-08-29 — Tabla normativa estructurada de Iluminación

### Objetivo

Eliminar la dependencia de un `requiredLux` introducido manualmente y comenzar a resolver el valor requerido desde una tabla normativa versionada.

### Implementación

- Creado `src/config/srtLightingRequirements.ts`.
- Catálogo estructurado de requisitos de primera cobertura, con fuente `table_2` o `table_1_visual_task`.
- Cada requisito conserva ID, categoría, tarea/local, lux requerido, fuente normativa, versión y URL oficial.
- Se incorporaron rangos de Tabla 1 sin convertirlos artificialmente en falsa precisión.
- `resolveLightingRequirement()` resuelve por ID profesional o coincidencia controlada.
- Las coincidencias ambiguas o inexistentes devuelven `undefined`.

### Commit

- `69e62e7a1e47e7c20f2b516e01d4fa74bddb012c`

---

## 2026-08-29 — Endurecimiento del criterio regulatorio de Iluminación

`src/config/srtLightingCriteria.ts` exige datos suficientes para evaluar iluminancia y uniformidad, mantiene el umbral 0,5 y calcula la validez de 12 meses.

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

Creado `src/config/srtRegulatoryCatalog.ts` con referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor.

---

## 2026-08-29 — Exportación PDF de Iluminación

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

### Próxima fase prioritaria de Iluminación

1. Auditar la representación Web y cualquier salida XLSX para confirmar que usan exclusivamente el snapshot.
2. Completar la evaluación asistida: comparar los valores medidos con el criterio congelado sin convertir automáticamente el resultado en una conclusión legal.
3. Revisar la cobertura normativa del catálogo backend y migrar los requisitos auxiliares del frontend cuando corresponda.
4. Revisar la regla de uniformidad y su correspondencia exacta con el protocolo antes de cerrar el motor de Iluminación.
5. Revisar el mapeo del documento hacia todos los campos requeridos por el formulario oficial.
6. Recién cuando Iluminación esté cerrada de extremo a extremo, avanzar al protocolo de Ruido.

### Fases posteriores

7. Protocolo de Ruido.
8. Protocolo de Puesta a Tierra.
9. Integración medición → hallazgo → acción correctiva.
10. Alertas de calibración y vencimientos.
11. Matriz integral de mediciones por empresa.
12. Gestión comercial de alquiler después de consolidar inventario técnico.

### Regla de continuidad

No ejecutar la batería final de tests todavía. Continuar con auditoría y correcciones funcionales/arquitectónicas. La verificación integral se realizará al finalizar este ciclo de consolidación.

### Incidente de contexto

No mezclar este proyecto con Conexa. Todas las próximas acciones de esta línea corresponden exclusivamente a Safety V2.

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

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
```

La aplicación ya no depende de un ID normativo fijo en el editor.

### Hallazgo pendiente

El catálogo frontend `src/config/srtLightingRequirements.ts` sigue existiendo como cobertura normativa auxiliar y contiene una primera tanda de requisitos de Tabla 1/Tabla 2. No debe convertirse en una segunda fuente de verdad para documentos nuevos. La fuente canónica para el flujo persistido debe ser `normativeProtocolVersions` del backend.

Además, el motor `lightingEvaluation.ts` ahora obtiene `requiredLux` del criterio congelado, pero todavía no transforma ese valor en un `CUMPLE/NO CUMPLE`: mantiene deliberadamente la revisión profesional como etapa final.

---

## 2026-08-29 — Integración real del snapshot normativo en el editor de Iluminación

### Objetivo

Cerrar el hueco entre el helper normativo y la aplicación real: el criterio normativo no debe existir solamente en código de soporte; debe poder asociarse explícitamente a una medición y quedar persistido antes de enviarla a revisión.

### Auditoría realizada

El backend ya disponía de `POST /measurements/:id/normative-snapshot`. El endpoint valida que la versión normativa exista y que corresponda al tipo de protocolo antes de congelar sus criterios en `normativeEvaluationSnapshot`. Por lo tanto, no era necesario duplicar esa persistencia desde React ni escribir criterios legales directamente desde el cliente.

### Correcciones

- `src/services/hygieneService.ts` incorpora `saveNormativeSnapshot()`.
- `updateMeasurement()` ahora tipa explícitamente `normativeEvaluationSnapshot`.
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

1. Hacer que la representación Web/PDF exponga `selectedCriterionId`, código/título del criterio y `requiredLux` desde el snapshot.
2. Auditar `hygieneDocumentService.ts` y `hygieneDocumentPdfService.ts` para eliminar cualquier cálculo o `requiredLux` alternativo.
3. Completar la evaluación asistida: comparar los valores medidos con el criterio congelado sin convertir automáticamente el resultado en una conclusión legal.
4. Revisar la cobertura normativa del catálogo backend y migrar los requisitos auxiliares del frontend cuando corresponda.
5. Revisar la regla de uniformidad y su correspondencia exacta con el protocolo antes de cerrar el motor de Iluminación.
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

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Semántica explícita de uniformidad de Iluminación

### Objetivo
Evitar que el modelo represente la uniformidad como una relación mínimo/máximo. El protocolo SRT 84/2012 utiliza la condición `E mínima ≥ E media / 2` y el Decreto 351/79 exige una relación mínima de 0,5 entre iluminancia mínima y media.

### Correcciones aplicadas
- `LightingMeasurementData` incorpora `uniformityMinimumLux` como magnitud explícita en lux.
- `uniformityThresholdLux` representa el umbral derivado `E media / 2`.
- `uniformityMinOverAverage` representa solamente la relación derivada E mínima / E media.
- `uniformityRatio` queda únicamente como compatibilidad con registros históricos y ya no se interpreta como mínimo/máximo.
- `lightingEvaluation.ts` obtiene la mínima desde `minimumLux`, `uniformityMinimumLux` o, como compatibilidad histórica, `uniformityRatio`; si no existe, la deriva de los puntos.
- Si no existe `averageLux`, lo deriva de los puntos.
- La evaluación muestra E mínima, E media/2 y la relación informativa mínima/media por separado.
- No se emite automáticamente una conclusión legal de cumplimiento; continúa requiriéndose revisión profesional.

### Commits
- `f2fd1d84a7cbf9dfa6f2e883ce69bd0176cab7ce` — fix(hygiene): model lighting uniformity as minimum illuminance
- `cc7d0716e6bb87ca502c17b205ba34b72321904c` — fix(hygiene): make lighting uniformity calculation semantically explicit

### Referencia normativa verificada
La SRT mantiene el formulario oficial y el XLSX editable del protocolo. El formulario expresa la uniformidad como `E mínima ≥ (E media)/2`; el Decreto 351/79 Anexo IV establece una relación no menor de 0,5 entre mínimo y medio. Fuentes oficiales: Resolución SRT 84/2012, formulario/Anexo y Decreto 351/79 Anexo IV.

### Próximo bloque
1. Localizar todos los escritores de `LightingMeasurementData` para determinar qué datos se persisten realmente y migrar la semántica antigua si corresponde.
2. Auditar representación Web y exportador XLSX.
3. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
4. Revisar que el documento exponga el criterio seleccionado desde el snapshot.
5. Completar cobertura normativa de Iluminación.
6. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

---

## 2026-08-29 — Corrección de metodología de uniformidad de Iluminación

Se corrigió la descripción de `uniformityRatio` para no presentarla como relación mínimo/máximo. La salida textual pasó a expresar E mínima y E media/2. La revisión posterior llevó a la separación explícita de magnitudes registrada arriba.

### Commit
- `e451e3e59e365ae7f7a06b900f2e78ea100f9fe7`

---

## 2026-08-29 — Documento de Iluminación desacoplado del catálogo normativo vivo

### Correcciones aplicadas
- `server/services/hygieneDocumentService.ts` ya no utiliza `getSrtReference()` para reconstruir la referencia normativa de un documento de Iluminación.
- `buildLightingDocumentRepresentation()` exige `normativeEvaluationSnapshot` y su `reference` congelada.
- La generación del documento rechaza mediciones sin snapshot normativo.
- `src/config/hygieneDocumentTemplates.ts` dejó de importar el catálogo regulatorio vivo y dejó de derivar `regulatoryReferenceId` desde él.
- La plantilla queda como definición estructural/documental; la referencia normativa pertenece al snapshot de la medición.
- El PDF consume la representación documental y no consulta normativa ni realiza cálculos propios.

### Commits
- `6e7bb835dbca8716fbac1b46b8e1ebfc53a613bb` — fix(hygiene): require normative snapshot for generated documents
- `944f370931141b9df5f20061df11c60cfd66e1d2` — refactor(hygiene): keep document template independent from live regulatory catalog
- `b1f6262912fd20b8dde70149e3f4029dcda7d412` — ajuste previo del renderer PDF para exponer snapshot normativo
- `baad5e76715c5c9202b40f53960fc75e1c1e1edc` — corrección previa de representación documental desde snapshot

### Decisión arquitectónica

```text
CATÁLOGO NORMATIVO VIVO
        ↓
selección + validación
        ↓
SNAPSHOT NORMATIVO CONGELADO
        ↓
DOCUMENTO HISTÓRICO
        ↓
REPRESENTACIÓN
   ┌────┼────┐
   ↓    ↓    ↓
  WEB  PDF  XLSX
```

El catálogo vivo no debe intervenir en la reconstrucción de documentos históricos.

---

## 2026-08-29 — PDF expone el criterio normativo congelado

`src/services/hygieneDocumentPdfService.ts` representa explícitamente referencia normativa, versión, criterio seleccionado, lux requeridos, estado de evaluación, fecha de evaluación y criterios congelados cuando están presentes.

### Commit
- `b1f6262912fd20b8dde70149e3f4029dcda7d412`

---

## 2026-08-29 — Catálogo normativo activo conectado al editor de Iluminación

- `src/services/hygieneService.ts` consulta `/normative/protocols?protocolType=lighting&status=active`.
- Backend filtra versiones activas y valida pertenencia del criterio.
- El editor elimina la asociación fija `srt-84-2012`.
- Se seleccionan versión y criterio específico desde backend.
- `NormativeEvaluationSnapshot` conserva `selectedCriterionId`.
- `lightingEvaluation.ts` obtiene `requiredLux` desde el criterio congelado.
- La decisión final de cumplimiento continúa siendo profesional.

---

## 2026-08-29 — Integración real del snapshot normativo en el editor de Iluminación

- Persistencia real de `normativeEvaluationSnapshot`.
- Selección normativa conectada al editor.
- Backend valida y congela la referencia.
- Revisión profesional sigue siendo obligatoria.

---

## 2026-08-29 — Tabla normativa estructurada de Iluminación

- Creado `src/config/srtLightingRequirements.ts`.
- Requisitos estructurados con fuente, versión y resolución controlada.
- Coincidencias ambiguas o inexistentes no se resuelven automáticamente.

---

## 2026-08-29 — Endurecimiento del criterio regulatorio de Iluminación

`src/config/srtLightingCriteria.ts` mantiene los requisitos para iluminancia/uniformidad y validez de 12 meses.

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

Creado `src/config/srtRegulatoryCatalog.ts` con referencias canónicas para los protocolos previstos.

---

## 2026-08-29 — Exportación PDF de Iluminación

La representación documental es la fuente común; el renderer PDF no realiza cálculos ni consulta normativa.

---

## Regla de continuidad

No ejecutar la batería final de tests todavía. Continuar con auditoría y correcciones funcionales/arquitectónicas. La verificación integral se realizará al finalizar este ciclo de consolidación.

## Regla de proyecto

Este registro corresponde exclusivamente a **Safety V2**. No mezclar con Conexa ni con otros repositorios/proyectos.

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Documento de Iluminación desacoplado del catálogo normativo vivo

### Objetivo
Garantizar que un documento histórico utilice exclusivamente la normativa congelada en `normativeEvaluationSnapshot` y nunca reconstruya referencia, criterio o valores requeridos desde el catálogo vivo.

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

### Hallazgo posterior
La plantilla documental aún no debe conocer identificadores regulatorios vivos. Se eliminó esa dependencia y la representación ahora toma la referencia exclusivamente del snapshot.

### Próximo bloque
1. Auditar la representación Web y cualquier exportador XLSX real.
2. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
3. Revisar que el documento exponga el criterio seleccionado y su valor requerido desde `normativeEvaluationSnapshot`.
4. Completar la evaluación asistida sin convertir automáticamente el resultado en conclusión legal.
5. Revisar la fórmula/metodología de uniformidad contra el protocolo oficial.
6. Completar cobertura normativa de Iluminación.
7. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

---

## 2026-08-29 — PDF expone el criterio normativo congelado

### Objetivo
Evitar que el PDF muestre solamente una referencia genérica y hacer visible el criterio seleccionado, su valor requerido y los datos de evaluación provenientes del snapshot.

### Corrección aplicada
`src/services/hygieneDocumentPdfService.ts` representa explícitamente, cuando están presentes en la representación documental, referencia normativa, versión, criterio seleccionado, lux requeridos, estado de evaluación, fecha de evaluación y criterios congelados.

### Commit
- `b1f6262912fd20b8dde70149e3f4029dcda7d412`

---

## 2026-08-29 — Catálogo normativo activo conectado al editor de Iluminación

### Objetivo
Eliminar el último identificador normativo fijo del cliente y hacer que la selección de versión y criterio de Iluminación provenga del catálogo normativo controlado por backend.

### Correcciones aplicadas
- `src/services/hygieneService.ts` consulta `/normative/protocols?protocolType=lighting&status=active`.
- `server/routes/normativeCatalogRoutes.ts` acepta filtro de estado.
- `server/services/normativeCatalogService.ts` filtra por estado.
- El editor elimina la asociación fija `srt-84-2012`.
- Se seleccionan versión y criterio específico desde backend.
- Backend valida versión activa y pertenencia del criterio.
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

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Exportación PDF de Iluminación

### Objetivo

Permitir exportar el documento profesional de Iluminación sin volver a consultar la medición ni recalcular resultados. El PDF debe ser un renderizador de la representación documental versionada.

### Correcciones realizadas

- Creado `src/services/hygieneDocumentPdfService.ts`.
- Usa las dependencias `jspdf` y `jspdf-autotable` ya presentes en el proyecto.
- Recibe exclusivamente `HygieneDocumentRepresentation`.
- Renderiza encabezado, secciones, pares campo/valor, tabla de puntos de medición, tabla de instrumentos y disclaimer.
- No consulta Firestore, no lee la medición original y no recalcula indicadores.
- El nombre del archivo incorpora el `documentId` para conservar identificación documental.
- `GeneratedDocumentsPanel` incorpora acción `PDF` para documentos de Iluminación y obtiene primero la representación versionada mediante `hygieneService.getDocumentRepresentation`.

### Commits

- `b4f66a4f1b274f584157aeddb514173fe7a16768` — feat(hygiene): add lighting document PDF renderer
- `5e3780eb7394a38afbd97c1909bd57db9297660b` — feat(hygiene): connect lighting document PDF export to document panel

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

### Nota de alcance

Este PDF es un exportador documental técnico de la representación existente. No agrega firma digital, no declara certificación legal y no sustituye la validación o firma que corresponda al profesional competente.

### Estado funcional acumulado

```text
CAPTURA
  ↓
CÁLCULO
  ↓
EVALUACIÓN NORMATIVA
  ↓
REVISIÓN / VALIDACIÓN
  ↓
SNAPSHOT
  ├── DATOS
  ├── EVALUACIÓN
  ├── REVISIÓN
  └── SNAPSHOT DE INSTRUMENTOS
  ↓
DOCUMENTO VERSIONADO
  ↓
PLANTILLA DECLARATIVA
  ↓
REPRESENTACIÓN ESTRUCTURADA
  ├── VISOR WEB
  └── PDF
```

### Próxima acción

Auditar y consolidar el catálogo normativo estructurado. Debe permitir que cada evaluación conserve norma, versión, referencia y valores utilizados de forma trazable, evitando valores legales hardcodeados dentro de los módulos de medición.

### Próximas fases prioritarias

1. Catálogo normativo estructurado y versionado.
2. Protocolo de Ruido.
3. Protocolo de Puesta a Tierra.
4. Integración medición → hallazgo → acción correctiva.
5. Alertas de calibración y vencimientos.
6. Matriz integral de mediciones por empresa.
7. Gestión comercial de alquiler después de consolidar inventario técnico.

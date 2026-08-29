# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Plantilla declarativa de documentos

### Objetivo

Hacer que la definición de un documento profesional sea independiente del visor React y del futuro exportador PDF.

### Corrección realizada

Se amplió `src/types/hygieneDocument.ts` con `HygieneDocumentField` y `HygieneDocumentTemplate`.

Se creó `src/config/hygieneDocumentTemplates.ts` con `LIGHTING_DOCUMENT_TEMPLATE` v1.0.0. La plantilla define su clave, versión, título y orden de secciones.

`buildLightingDocumentRepresentation` ahora valida la plantilla soportada y utiliza el orden declarado por la plantilla en lugar de asumir que el orden del array interno es la especificación documental.

### Resultado arquitectónico

```text
SNAPSHOT DOCUMENTAL
        ↓
TEMPLATE KEY + VERSION
        ↓
REPRESENTACIÓN
        ↓
┌──────────────────┬──────────────────┐
│ VISOR WEB        │ FUTURO PDF        │
└──────────────────┴──────────────────┘
```

### Commits

- `b8bd60400eee581ba46f24dd804308d290dc4a2c` — refactor(hygiene): define shared document template contract
- `c4a1f0c0d53f7d7b74b57debc952de54612bf9e2` — feat(hygiene): add declarative lighting document template
- `614d9f48f546924a330dac49b9d199d1c4433770` — refactor(hygiene): drive lighting representation from shared template
- `02dba70dfde9de523b9c1b983ae66bda68c50777` — fix(hygiene): type document representation service contract

### Estado

La arquitectura documental de Iluminación ya tiene contrato compartido, plantilla versionada y representación ordenada por esa plantilla. El frontend consume el contrato tipado.

### Próxima acción

Preparar el adaptador de exportación PDF sobre `HygieneDocumentRepresentation`, sin consultar nuevamente la medición ni ejecutar cálculos. Antes de eso, revisar el contrato PDF existente y reutilizar las dependencias ya presentes en el proyecto.

---

## Estado funcional acumulado

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
  ↓
VISOR WEB
```

### Principios vigentes

- Aislamiento por organización/workspace.
- Extender dominios existentes, no duplicarlos.
- Cálculo determinístico separado de IA y UI.
- IA como asistencia, no autoridad normativa.
- Snapshots históricos para documentos profesionales.
- Nuevos datos críticos con backend como fuente de verdad.
- No convertir `db.ts` en servicio universal.
- Registrar cada fase relevante en este documento.
- No introducir PDF ni firma como fuente de verdad del documento.

### Próximas fases prioritarias

1. Adaptador PDF de Iluminación basado en representación.
2. Consolidación del catálogo normativo estructurado.
3. Protocolo de Ruido.
4. Protocolo de Puesta a Tierra.
5. Integración medición → hallazgo → acción correctiva.
6. Alertas de calibración y vencimientos.
7. Matriz integral de mediciones por empresa.
8. Gestión comercial de alquiler después de consolidar inventario técnico.

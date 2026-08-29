# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Contrato reutilizable de representación documental

### Objetivo

Separar la representación documental de la implementación concreta del visor React y preparar una única estructura reutilizable por Web y futuros exportadores PDF.

### Hallazgo

El visor de Iluminación definía localmente sus interfaces `Section` y `Representation`. Eso acoplaba el contrato documental a un componente de presentación y obligaba a duplicar tipos cuando se incorporaran otros renderizadores.

### Corrección realizada

Se creó `src/types/hygieneDocument.ts` con los contratos `HygieneDocumentSection` y `HygieneDocumentRepresentation`.

`LightingDocumentViewer.tsx` ahora consume ese contrato mediante import type. El componente conserva únicamente tipos específicos de presentación, como la forma del snapshot de instrumento utilizado por su tabla.

### Resultado arquitectónico

La separación queda:

```text
SNAPSHOT DOCUMENTAL
        ↓
REPRESENTACIÓN DOCUMENTAL
        ↓
┌──────────────────┬──────────────────┐
│ VISOR WEB        │ FUTURO PDF        │
└──────────────────┴──────────────────┘
```

El contrato no depende de React ni de un motor de PDF.

### Cambios realizados

- Creado `src/types/hygieneDocument.ts`.
- Refactorizado `src/components/Console/Hygiene/LightingDocumentViewer.tsx` para consumir el contrato compartido.

### Commits

- `b2bb3c74e77d545076314d55e2a91ba10587f1ac` — refactor(hygiene): add reusable document representation contract
- `f1d956f0b0e5078166d6172c869a6c2b075f0c72` — refactor(hygiene): consume shared document representation contract

### Nota

Se intentó tipar también el método de servicio frontend `getDocumentRepresentation`, pero la actualización concurrente del archivo fue rechazada por un SHA obsoleto. No se considera necesario reintentar esa modificación sin volver a leer el archivo; el visor ya consume el contrato explícitamente y el backend mantiene su propia interfaz compatible.

### Próxima acción

Construir un esquema de plantilla específico para Iluminación que describa secciones, campos y tablas de manera declarativa. Ese esquema será la fuente de presentación para Web/PDF y permitirá incorporar posteriormente Ruido y Puesta a Tierra sin duplicar la arquitectura documental.

---

## Estado funcional acumulado

La cadena de Iluminación actualmente alcanza:

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

### Próximas fases prioritarias

1. Esquema declarativo de plantilla de Iluminación.
2. Exportación PDF basada en la misma representación, sin recalcular.
3. Consolidación del catálogo normativo estructurado.
4. Protocolo de Ruido.
5. Protocolo de Puesta a Tierra.
6. Integración medición → hallazgo → acción correctiva.
7. Alertas de calibración y vencimientos.
8. Matriz integral de mediciones por empresa.
9. Gestión comercial de alquiler después de consolidar inventario técnico.

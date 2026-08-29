# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> **Propósito de este documento:** mantener dentro del repositorio el contexto técnico, los objetivos, decisiones arquitectónicas, hallazgos y avances. Debe actualizarse después de cada fase relevante de auditoría o modificación para que el trabajo pueda retomarse sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Trazabilidad histórica de instrumental en documentos

### Objetivo

Evitar que un documento histórico dependa de que el registro actual del instrumento permanezca sin cambios o exista en el futuro.

### Hallazgo

`HygieneInstrumentRecord` ya dispone de los datos necesarios para una identificación documental: categoría, tipo, marca, modelo, número de serie, fecha de calibración, vencimiento, certificado y estado. La medición conserva `instrumentIds`, pero eso por sí solo no alcanza para una representación histórica profesional.

### Corrección realizada

`server/services/hygieneDocumentService.ts` ahora resuelve cada `instrumentId` perteneciente a la misma organización al generar el documento y guarda un `instrumentSnapshots[]` profundo dentro del snapshot documental.

El documento generado conserva así los datos del instrumento en el momento de generación, incluyendo identificación, serie, calibración, vencimiento, certificado y estado. Si posteriormente el instrumento cambia de estado, modelo o calibración, el documento histórico no cambia.

Si un instrumento indicado por la medición no existe o no pertenece a la organización, la generación se detiene con `INSTRUMENT_NOT_FOUND:<id>` en lugar de crear un documento incompleto.

La representación de Iluminación ahora expone tanto los IDs como los snapshots de instrumentos.

### Frontend

`LightingDocumentViewer.tsx` presenta los instrumentos como tabla profesional con:

- tipo;
- marca/modelo;
- número de serie;
- fecha de calibración;
- vencimiento;
- estado.

No se muestra el ID interno como sustituto de la identificación técnica.

### Commit

- `31184ae7732a88b5df614cfb315b06812a80c95a` — feat(hygiene): snapshot instrument metadata in generated documents
- `fd42ca8c9d79f437e98fa9147376dc711cfcb856` — feat(hygiene): render instrument traceability in lighting documents

### Estado alcanzado

La cadena documental de Iluminación queda:

```text
MEDICIÓN
  ↓
VALIDACIÓN PROFESIONAL
  ↓
SNAPSHOT DE MEDICIÓN
  ├── DATOS DE MEDICIÓN
  ├── EVALUACIÓN NORMATIVA
  ├── REVISIÓN
  └── SNAPSHOT DE INSTRUMENTOS
  ↓
DOCUMENTO VERSIONADO
  ↓
REPRESENTACIÓN ESTRUCTURADA
  ↓
VISOR WEB
```

### Próxima acción

Separar la definición de plantilla documental de la implementación React. Crear un contrato de representación reutilizable para Web/PDF y normalizar etiquetas, tablas y metadatos antes de construir exportación PDF.

---

## Registro de dirección técnica anterior

El objetivo global permanece: evolucionar Safety-v2 hacia una plataforma integral para profesionales, consultoras y empresas de Higiene y Seguridad, con gestión empresarial, inspecciones, mediciones, instrumental, normativa versionada, documentación, trazabilidad, seguimiento e IA asistiva bajo control profesional.

### Principios vigentes

- Mantener aislamiento por organización/workspace.
- Extender dominios existentes en lugar de duplicarlos.
- Mantener cálculos técnicos determinísticos separados de IA y UI.
- No utilizar IA como autoridad normativa.
- Mantener snapshots históricos para documentos profesionales.
- No tratar `localStorage` como fuente de verdad de nuevos datos críticos.
- No convertir `db.ts` en un servicio universal.
- Registrar cada fase relevante en este documento.

### Protocolos prioritarios

1. Iluminación.
2. Ruido.
3. Puesta a tierra.
4. Estrés térmico.
5. Ergonomía.
6. Vibraciones.
7. Contaminantes químicos y otros riesgos especializados.

### Cadena objetivo del producto

```text
EMPRESA / PROFESIONAL
        ↓
CONTEXTO
        ↓
INSPECCIÓN / NECESIDAD
        ↓
MEDICIÓN
        ↓
CÁLCULO DETERMINÍSTICO
        ↓
EVALUACIÓN NORMATIVA VERSIONADA
        ↓
REVISIÓN PROFESIONAL
        ↓
DOCUMENTO
        ↓
ACCIONES / SEGUIMIENTO / VENCIMIENTOS
```

### Estado funcional alcanzado en el trabajo actual

- captura de mediciones de Higiene;
- instrumentos;
- estados de medición;
- validación/revisión profesional;
- evaluación normativa versionada;
- snapshots documentales;
- entidad de documentos generados;
- API de documentos;
- representación versionada de Iluminación;
- visor web de Iluminación;
- trazabilidad histórica de instrumentos dentro del documento.

### Pendientes principales

- contrato de plantilla documental independiente de React;
- normalización profesional completa de todos los campos del protocolo;
- exportador PDF sobre la representación, sin recalcular datos;
- incorporación progresiva de Ruido y Puesta a Tierra;
- consolidación de catálogo normativo estructurado;
- integración medición → hallazgo/acción correctiva;
- gestión comercial de alquiler después de consolidar inventario técnico;
- alertas de calibración y vencimientos;
- matriz integral de mediciones por empresa.

### Regla de continuidad

Cada nueva fase debe agregar al final de este documento: objetivo, hallazgos, decisiones, cambios, archivos modificados, commit y próxima acción concreta. Las modificaciones destinadas a esta evolución deben realizarse en `josemiranda5266-blip/Safety-v2`.

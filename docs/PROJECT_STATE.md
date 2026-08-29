# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

### Objetivo

Consolidar las referencias normativas utilizadas por los protocolos en un catálogo central, identificable y versionable, evitando que cada módulo invente o hardcodee referencias legales de forma aislada.

### Auditoría externa de referencia

La SRT mantiene un repositorio oficial de protocolos que incluye Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor. La referencia oficial de Iluminación corresponde a Res. SRT 84/2012 y la de Ruido a Res. SRT 85/2012. La SRT también identifica Res. 861/2015 para contaminantes químicos, Res. 886/2015 para ergonomía y Res. 900/2015 para puesta a tierra. Para estrés por calor, la normativa oficial vigente consultada incluye Res. SRT 30/2023.

### Implementación

- Creado `src/config/srtRegulatoryCatalog.ts`.
- Se incorporaron referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor.
- Cada referencia posee identificador estable, autoridad, resolución, año, título, tipo de protocolo, estado y fuente oficial.
- El catálogo identifica referencias normativas; deliberadamente no almacena todavía límites legales ni umbrales técnicos, evitando convertir una primera catalogación en una base de valores regulatorios incompleta.
- La plantilla `lighting_protocol` quedó vinculada a `srt-84-2012`.
- El contrato `HygieneDocumentTemplate` / `HygieneDocumentRepresentation` ahora puede transportar `regulatoryReferenceId`.
- El backend exige que la plantilla de Iluminación tenga configurada la referencia SRT correcta antes de construir la representación.
- La sección normativa del documento ahora conserva autoridad, resolución, año, título e identificación de la fuente junto con la evaluación normativa congelada del snapshot.

### Commits

- `aa41fd1170669e8914b05ac00b5643140a629810` — feat(hygiene): add canonical SRT regulatory reference catalog
- `10e5d974f2bb1de38773cef6524d75ce151829ab` — feat(hygiene): bind lighting template to SRT regulatory catalog
- `f7c0db6c3cce9ecd01d725e48b35e4343be4bb30` — fix(hygiene): extend document contract with regulatory reference identity
- `bf084d5077565cd574fa93f10b980cd995bf64ce` — feat(hygiene): bind lighting documents to versioned SRT reference

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

### Regla de seguridad documental

La aplicación no debe presentar un valor legal como si fuera vigente únicamente porque está almacenado en código. Los futuros límites/criterios regulatorios deberán tener referencia normativa, versión/fecha de vigencia, fuente y snapshot de los valores efectivamente utilizados al evaluar una medición.

### Próxima acción

Separar el catálogo de referencias normativas del futuro catálogo de criterios/valores regulatorios. Luego implementar el primer conjunto de criterios de Iluminación con trazabilidad explícita, sin modificar todavía los protocolos de Ruido u otros módulos.

---

## 2026-08-29 — Exportación PDF de Iluminación

### Objetivo

Permitir exportar el documento profesional de Iluminación sin volver a consultar la medición ni recalcular resultados. El PDF debe ser un renderizador de la representación documental versionada.

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

1. Criterios/valores regulatorios versionados para Iluminación.
2. Protocolo de Ruido.
3. Protocolo de Puesta a Tierra.
4. Integración medición → hallazgo → acción correctiva.
5. Alertas de calibración y vencimientos.
6. Matriz integral de mediciones por empresa.
7. Gestión comercial de alquiler después de consolidar inventario técnico.

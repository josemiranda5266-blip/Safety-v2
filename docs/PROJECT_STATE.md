# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Auditoría de salida documental y corrección de semántica en PDF

### Hallazgo
La auditoría directa de `src/services/hygieneDocumentPdfService.ts` encontró que el renderer todavía etiquetaba `uniformityRatio` como `Relación mín/máx`, pese a que el motor principal ya había sido corregido para SRT 84/2012.

Además, la búsqueda del repositorio no encontró implementación de exportación XLSX (`xlsx`/`excel`) en el árbol indexado. Esto significa que el XLSX oficial todavía debe tratarse como una funcionalidad pendiente y no como una salida ya implementada.

### Corrección aplicada
- El PDF ya no presenta `uniformityRatio` como mínimo/máximo.
- Se agregaron etiquetas explícitas para `uniformityMinimumLux`, `uniformityThresholdLux`, `uniformityMinOverAverage` y `uniformityPasses`.
- `uniformityRatio` queda identificado en PDF únicamente como campo legado/histórico si aparece en datos antiguos.

### Commit
- `d32fcc6fdb6072457bfc70bf9767ced325de1dec` — `fix(hygiene): remove legacy min-max wording from lighting PDF`

### Estado XLSX
- No se encontró implementación de exportador XLSX en la búsqueda del repositorio.
- No se debe afirmar que XLSX está implementado.
- Próximo objetivo: diseñar/implementar el renderer XLSX a partir del mismo `HygieneDocumentRepresentation`/snapshot, respetando el formulario oficial SRT 84/2012.

### Referencia oficial
La SRT publica para la Resolución 84/2012 el formulario PDF y el formulario editable XLSX. El formulario contiene, entre otras, las columnas Punto de Muestreo, Hora, Sector, Sección/Puesto, tipo de iluminación, fuente, sistema, uniformidad `E mínima ≥ (E media)/2`, Valor Medido (Lux) y Valor requerido legalmente. Fuente oficial: https://www.argentina.gob.ar/srt/prevencion/publicaciones/protocolos/iluminacion

---

## 2026-08-29 — Corrección real del motor de cálculo de uniformidad de Iluminación

### Hallazgo crítico
La auditoría directa de `src/services/lightingMeasurement.ts` demostró que, pese a la refactorización previa del modelo, el escritor todavía calculaba `uniformityRatio = E mínima / E máxima`.

### Corrección aplicada
`src/services/lightingMeasurement.ts` ahora:
- convierte y filtra las lecturas inválidas antes de calcular métricas;
- calcula `averageLux` como media aritmética del conjunto válido;
- calcula `minimumLux` como el menor valor;
- conserva `maximumLux` únicamente como dato descriptivo, no para uniformidad normativa;
- calcula `uniformityMinimumLux = minimumLux`;
- calcula `uniformityThresholdLux = averageLux / 2`;
- calcula `uniformityMinOverAverage = minimumLux / averageLux` como relación informativa;
- deja de escribir `uniformityRatio` en registros nuevos;
- actualiza `calculationVersion` a `lighting-v2-srt84-uniformity`;
- descarta puntos con lux no numérico para que no contaminen el cálculo ni la persistencia de la campaña.

### Commit
- `32d54b127678292181b5bdf24b25a9110a41a136` — `fix(hygiene): calculate lighting uniformity per SRT 84/2012`

---

## 2026-08-29 — Auditoría del consumidor UI de Iluminación

### Hallazgo
La auditoría del código real encontró una inconsistencia que todavía no debe considerarse cerrada: `src/components/Console/Hygiene/LightingMeasurementEditor.tsx` continúa mostrando el indicador con la etiqueta **`Relación mín/máx`** y consume `preview.uniformityRatio`, mientras que `src/services/lightingMeasurement.ts` ya no genera ese campo en mediciones nuevas.

Esto significa que el motor y el editor todavía no están semánticamente alineados.

### Evidencia técnica
- `LightingMeasurementData` define `uniformityMinimumLux`, `uniformityThresholdLux` y `uniformityMinOverAverage`, y marca `uniformityRatio` como legado. fileciteturn592file0L2-L5
- `calculateLightingMeasurement()` calcula E mínima, E media, E media/2 y E mínima/E media, y no escribe `uniformityRatio`. fileciteturn593file0L2-L5
- `hygieneService.saveLightingData()` persiste el objeto calculado dentro de `rawData.lighting`, por lo que el editor es un consumidor directo del contrato actualizado. fileciteturn594file0L2-L5
- El árbol actual contiene tanto `LightingMeasurementEditor.tsx` como `lightingMeasurement.ts`, confirmando que ambos forman parte de la implementación vigente. fileciteturn591file0L2-L2

### Decisión
No se debe reintroducir `uniformityRatio` en el motor para satisfacer al editor. El editor debe adaptarse al modelo nuevo y mostrar, como mínimo:
- Promedio (E media)
- Mínimo (E mínima)
- Máximo (dato descriptivo)
- Umbral de uniformidad (E media / 2)
- Relación E mínima / E media

La etiqueta `Relación mín/máx` debe desaparecer de la UI de Iluminación.

### Estado
- Motor: corregido.
- Modelo: corregido.
- PDF: corregido.
- Editor UI: **pendiente de corrección**.
- XLSX: pendiente.

---

## Objetivo inmediato
Cerrar Iluminación de extremo a extremo antes de avanzar a otro protocolo.

### Cadena objetivo
```text
LECTURAS CRUDAS
      ↓
CÁLCULO FÍSICO
      ↓
E mínima / E media / uniformidad
      ↓
CRITERIO NORMATIVO CONGELADO
      ↓
REVISIÓN PROFESIONAL
      ↓
DOCUMENT SNAPSHOT
      ↓
WEB / PDF / XLSX
```

### Próximas tareas
1. Corregir `LightingMeasurementEditor.tsx` para consumir exclusivamente las métricas nuevas.
2. Auditar consumidores de `LightingMeasurementData` y cualquier escritor alternativo.
3. Revisar representación Web.
4. Implementar/revisar exportador XLSX: actualmente no se encontró implementación.
5. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
6. Verificar que el documento exponga el criterio seleccionado exclusivamente desde el snapshot.
7. Revisar migración/compatibilidad de registros antiguos que todavía tengan `uniformityRatio`.
8. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
9. Cerrar el mapeo campo-por-campo con el formulario SRT 84/2012.
10. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

---

## Estado consolidado de Iluminación

- Catálogo normativo estructurado: implementado.
- Selección de versión/criterio desde backend: implementado.
- Validación server-side y snapshot normativo: implementado.
- Documento histórico desacoplado del catálogo vivo: implementado.
- PDF con referencia/criterio congelado: implementado.
- Semántica de uniformidad: corregida en modelo y escritor principal.
- Cálculo SRT 84/2012 del escritor principal: corregido en `lightingMeasurement.ts`.
- PDF: corregido para no etiquetar uniformidad como mínimo/máximo.
- Editor UI: **pendiente; todavía contiene referencia legacy `Relación mín/máx`**.
- Auditoría de todos los consumidores/escritores: pendiente.
- Web: pendiente.
- XLSX: pendiente; no se encontró implementación actual.
- Cobertura normativa completa: pendiente.
- Tests/verificación integral: deliberadamente pendientes hasta finalizar este ciclo.

---

## Decisión arquitectónica documental

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

El catálogo vivo no debe intervenir en la reconstrucción de documentos históricos. Todos los renderers deben consumir la misma representación derivada del snapshot.

---

## Regla de continuidad

No ejecutar la batería final de tests todavía. Continuar con auditoría y correcciones funcionales/arquitectónicas. La verificación integral se realizará al finalizar este ciclo de consolidación.

## Regla de proyecto

Este registro corresponde exclusivamente a **Safety V2**. No mezclar con Conexa ni con otros repositorios/proyectos.

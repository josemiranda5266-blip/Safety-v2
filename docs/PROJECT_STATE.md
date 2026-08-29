# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Corrección del consumidor UI de uniformidad de Iluminación

### Hallazgo
La auditoría de `src/components/Console/Hygiene/LightingMeasurementEditor.tsx` confirmó que la UI todavía mostraba `Relación mín/máx` y consumía `preview.uniformityRatio`, mientras que el motor ya había migrado al criterio SRT 84/2012 `E mínima ≥ E media / 2`.

### Corrección aplicada
El editor ahora muestra únicamente las métricas compatibles con el contrato actualizado:
- Promedio (E media).
- Mínimo (E mínima).
- Máximo como dato informativo.
- Umbral de uniformidad (E media / 2).
- Relación informativa E mínima / E media.

También se incorporó explícitamente en la UI la regla `E mínima ≥ E media / 2`.

No se reintrodujo `uniformityRatio` en el motor.

### Commit
- `e78e61a226045630dd890dd2fd99248821f18414` — `fix(lighting): align editor with SRT uniformity calculation`

### Estado
- Motor: corregido.
- Modelo: corregido.
- Editor UI: corregido.
- PDF: corregido.
- XLSX: pendiente.

---

## 2026-08-29 — Auditoría de estructura documental de Iluminación

### Hallazgo
El modelo actual de `LightingMeasurementData` contiene correctamente los cálculos de iluminación y el tipo de fuente general, pero todavía no representa de forma completa todos los datos documentales requeridos por el formulario SRT 84/2012.

El `HygieneMeasurement.normativeEvaluationSnapshot` congela la versión/criterios normativos, pero no constituye por sí mismo un snapshot documental completo de la campaña.

El editor actual permite capturar tipo de iluminación, sistema, tarea y puntos con nombre, tipo, lux y ubicación, pero todavía deben revisarse/agregarse los campos documentales de campaña y de cada punto que correspondan al formulario oficial.

### Implicación
No implementar todavía el XLSX final. Primero debe completarse la cadena:

```text
captura → persistencia → snapshot documental → representación SRT → PDF/XLSX/Web
```

El XLSX debe ser un renderer pasivo del snapshot y no recalcular ni consultar el catálogo normativo vivo.

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
1. Auditar consumidores restantes de `LightingMeasurementData` y cualquier escritor alternativo.
2. Completar el modelo/captura de datos documentales de campaña y de cada punto según SRT 84/2012.
3. Verificar persistencia y reconstrucción del snapshot documental.
4. Revisar representación Web.
5. Implementar/revisar exportador XLSX: actualmente no se encontró implementación.
6. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
7. Verificar que el documento exponga el criterio seleccionado exclusivamente desde el snapshot.
8. Revisar migración/compatibilidad de registros antiguos que todavía tengan `uniformityRatio`.
9. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
10. Cerrar el mapeo campo-por-campo con el formulario SRT 84/2012.
11. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

---

## Estado consolidado de Iluminación

- Catálogo normativo estructurado: implementado.
- Selección de versión/criterio desde backend: implementado.
- Validación server-side y snapshot normativo: implementado.
- Cálculo SRT 84/2012 del escritor principal: implementado.
- Semántica de uniformidad: corregida en modelo, motor, editor y PDF.
- Documento histórico desacoplado del catálogo vivo: parcialmente implementado; falta completar snapshot documental de campaña.
- PDF: corregido.
- Editor UI: corregido respecto de uniformidad.
- Auditoría de todos los consumidores/escritores: pendiente.
- Captura documental SRT completa: pendiente.
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
SNAPSHOT DOCUMENTAL
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

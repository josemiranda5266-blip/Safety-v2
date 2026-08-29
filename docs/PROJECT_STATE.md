# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Corrección real del motor de cálculo de uniformidad de Iluminación

### Hallazgo crítico
La auditoría directa de `src/services/lightingMeasurement.ts` demostró que, pese a la refactorización previa del modelo, el escritor todavía calculaba:

```text
uniformityRatio = E mínima / E máxima
```

Eso era incompatible con la metodología del protocolo SRT 84/2012, que exige verificar `E mínima ≥ E media / 2`. La fuente oficial de la SRT y el Decreto 351/79 confirman que la iluminancia media es el promedio de las mediciones y la mínima es el menor valor; la uniformidad se verifica mediante esa relación.

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

### Referencia normativa verificada
La Resolución SRT 84/2012 establece que el protocolo es obligatorio y que los valores de medición tienen una validez de 12 meses; el instructivo y formulario expresan la uniformidad como `E mínima ≥ (E media)/2`. El Decreto 351/79 Anexo IV exige una relación no menor de 0,5 entre iluminancia mínima y media. La SRT también mantiene el formulario PDF y el XLSX editable oficiales.

### Consecuencia
El hallazgo demuestra que el siguiente bloque ya no debe ser solamente revisar tipos: hay que auditar todos los consumidores de `LightingMeasurementData` para comprobar que ninguna pantalla, persistencia, documento o exportación siga interpretando `uniformityRatio` como mínimo/máximo.

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
1. Auditar consumidores de `LightingMeasurementData` y cualquier escritor alternativo.
2. Revisar representación Web y exportador XLSX.
3. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
4. Verificar que el documento exponga el criterio seleccionado exclusivamente desde el snapshot.
5. Revisar migración/compatibilidad de registros antiguos que todavía tengan `uniformityRatio`.
6. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
7. Cerrar el mapeo campo-por-campo con el formulario SRT 84/2012.
8. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

---

## Estado consolidado de Iluminación

- Catálogo normativo estructurado: implementado.
- Selección de versión/criterio desde backend: implementado.
- Validación server-side y snapshot normativo: implementado.
- Documento histórico desacoplado del catálogo vivo: implementado.
- PDF con referencia/criterio congelado: implementado.
- Semántica de uniformidad: corregida en modelo y escritor principal.
- Cálculo SRT 84/2012 del escritor principal: corregido en `lightingMeasurement.ts`.
- Auditoría de todos los consumidores/escritores: pendiente.
- Web/XLSX: pendiente de cierre.
- Cobertura normativa completa: pendiente.
- Tests/verificación integral: deliberadamente pendientes hasta finalizar este ciclo.

---

## 2026-08-29 — Documento de Iluminación desacoplado del catálogo normativo vivo

- `server/services/hygieneDocumentService.ts` ya no utiliza `getSrtReference()` para reconstruir la referencia normativa de un documento de Iluminación.
- `buildLightingDocumentRepresentation()` exige `normativeEvaluationSnapshot` y su `reference` congelada.
- La generación del documento rechaza mediciones sin snapshot normativo.
- `src/config/hygieneDocumentTemplates.ts` dejó de importar el catálogo regulatorio vivo y dejó de derivar `regulatoryReferenceId` desde él.
- La plantilla queda como definición estructural/documental; la referencia normativa pertenece al snapshot de la medición.
- El PDF consume la representación documental y no consulta normativa ni realiza cálculos propios.

### Commits
- `6e7bb835dbca8716fbac1b46b8e1ebfc53a613bb` — fix(hygiene): require normative snapshot for generated documents
- `944f370931141b9df5f20061df11c60cfd66e1d2` — refactor(hygiene): keep document template independent from live regulatory catalog
- `b1f6262912fd20b8dde70149e3f4029dcda7d412` — ajuste del renderer PDF para exponer snapshot normativo
- `baad5e76715c5c9202b40f53960fc75e1c1e1edc` — corrección de representación documental desde snapshot

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

---

## Regla de continuidad

No ejecutar la batería final de tests todavía. Continuar con auditoría y correcciones funcionales/arquitectónicas. La verificación integral se realizará al finalizar este ciclo de consolidación.

## Regla de proyecto

Este registro corresponde exclusivamente a **Safety V2**. No mezclar con Conexa ni con otros repositorios/proyectos.

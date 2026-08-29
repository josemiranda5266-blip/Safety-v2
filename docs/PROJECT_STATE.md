# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Consolidación documental de Iluminación

### Correcciones verificadas en `main`
- El modelo de iluminación conserva campaña y metadata documental por punto.
- El editor captura y restaura dichos datos.
- `calculateLightingMeasurement()` preserva `campaign`.
- `lightingDocumentMapper.ts` transforma la medición persistida en `HygieneDocumentRepresentation` con `templateKey: lighting_protocol`.
- El mapper incorpora `uniformityPasses` derivado exclusivamente de `minimumLux >= uniformityThresholdLux`, sin recalcular normativa.
- El PDF representa los nuevos campos de puntos y campaña.
- El PDF ahora reconoce explícitamente la sección `normative_evaluation` y renderiza el snapshot normativo congelado.
- El PDF utiliza `instrument.instrumentType`, coherente con `HygieneInstrument`.

### Commits de este ciclo
- `d62a4a97275c98a0e02ba844780c19693a27ee87` — `fix(lighting): include uniformity result in document representation`
- `808d2fb2e77bb5042dc7dceabcd40019b3a0ff77` — `fix(lighting): render normative snapshot section in PDF`

### Estado
- Cálculo SRT 84/2012: implementado.
- Modelo documental: implementado.
- Captura documental: implementada.
- Mapper: implementado.
- PDF: actualizado para campaña, puntos, cálculos y snapshot normativo.
- Persistencia/reconstrucción end-to-end: todavía requiere verificación con flujo real y consumidores.
- XLSX: pendiente; no implementar hasta cerrar reconstrucción y mapeo campo-por-campo.

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
2. Verificar persistencia y reconstrucción del snapshot documental.
3. Revisar representación Web.
4. Implementar/revisar exportador XLSX: actualmente no se encontró implementación.
5. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
6. Verificar que el documento exponga el criterio seleccionado exclusivamente desde el snapshot.
7. Revisar migración/compatibilidad de registros antiguos que todavía tengan `uniformityRatio`.
8. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
9. Cerrar el mapeo campo-por-campo con el formulario SRT 84/2012.
10. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.
11. Completar tests/verificación integral al finalizar este ciclo.

---

## Estado consolidado de Iluminación

- Catálogo normativo estructurado: implementado.
- Selección de versión/criterio desde backend: implementado.
- Validación server-side y snapshot normativo: implementado.
- Cálculo SRT 84/2012 del escritor principal: implementado.
- Semántica de uniformidad: corregida en modelo, motor, editor y PDF.
- Instrumento/calibración: modelo existente; certificado disponible en instrumento y campaña.
- Captura documental de campaña: implementada.
- Captura documental por punto: implementada.
- Preservación de campaign durante cálculo: implementada.
- Mapper medición → representación documental: implementado.
- PDF: actualizado y consume la representación documental.
- Persistencia/reconstrucción documental end-to-end: pendiente.
- Documento histórico desacoplado del catálogo vivo: parcialmente implementado; snapshot normativo congelado, falta verificar reconstrucción completa.
- Auditoría de todos los consumidores/escritores: pendiente.
- Web: pendiente.
- XLSX: pendiente; no se encontró implementación actual.
- Cobertura normativa completa: pendiente.
- Tests/verificación integral: pendientes hasta finalizar este ciclo.

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

No ejecutar todavía la batería final de tests. Continuar con auditoría y correcciones funcionales/arquitectónicas. La verificación integral se realizará al finalizar este ciclo de consolidación.

## Regla de proyecto

Este registro corresponde exclusivamente a **Safety V2**. No mezclar con Conexa ni con otros repositorios/proyectos.

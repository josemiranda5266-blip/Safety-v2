# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

## 2026-08-29 — Integridad de Iluminación y evidencia histórica

### Correcciones verificadas en `main`
- El modelo de iluminación conserva campaña y metadata documental por punto.
- El editor captura y restaura dichos datos.
- `calculateLightingMeasurement()` preserva `campaign`.
- `lightingDocumentMapper.ts` transforma la medición persistida en `HygieneDocumentRepresentation` con `templateKey: lighting_protocol`.
- El mapper incorpora `uniformityPasses` derivado de `minimumLux >= uniformityThresholdLux`, sin recalcular normativa.
- Mapper y template documental están alineados a nueve secciones: `identification`, `context`, `technical`, `measurement_points`, `indicators`, `instruments`, `normative`, `professional_review`, `traceability`.
- La generación documental exige medición `validated`, snapshot normativo y snapshots de todos los instrumentos.
- El documento histórico se reconstruye desde snapshots y no desde el catálogo vivo.
- El PDF consume la representación documental y renderiza la evaluación normativa congelada.
- Existe prueba específica del mapper para template, uniformidad, normativa e instrumentación histórica.
- `npm test` conserva la suite legacy y ejecuta la suite específica de Iluminación.

### Seguridad del workflow detectada y corregida
- Se confirmó un bypass: el PATCH genérico aceptaba `status` y permitía entrar a `pending_review` sin ejecutar `validateMeasurementForSubmission()`.
- Se eliminó `status` del schema de actualización del PATCH. Las transiciones sensibles quedan en endpoints de workflow específicos.
- El servicio bloquea modificaciones de datos de mediciones `validated`/`closed`.
- Se detectó que el endpoint de snapshot normativo podía intentarse sobre mediciones ya congeladas.
- Se añadió bloqueo explícito para `validated`, `closed` y `archived`, con `NORMATIVE_SNAPSHOT_LOCKED`.
- La protección existe en ruta y también en la capa workflow/servicio para defensa en profundidad.

### Integridad del catálogo de instrumentos
- `HygieneInstrumentSnapshot` conserva marca, modelo, número de serie, fechas de calibración, certificado y momento de captura.
- `updateInstrument()` modifica el registro vivo del instrumento, pero no muta los `instrumentSnapshots` almacenados en mediciones históricas.
- No se encontró en la búsqueda de código una operación que reescriba snapshots históricos al editar el catálogo.
- Esto confirma desacoplamiento histórico a nivel de modelo; queda pendiente prueba end-to-end real.

### Trust boundary de cálculo de Iluminación
- Se confirmó el flujo real UI → `calculateLightingMeasurement()` → `saveLightingData()` → PATCH.
- Se detectó que el backend recibía `rawData` genérico y podía confiar en métricas calculadas por el cliente.
- Se añadió normalización condicional en `updateMeasurementWithAudit()` para mediciones cuyo `protocolType` existente es `lighting`.
- Cuando cambia `rawData.lighting`, el servidor valida los puntos mínimos, recalcula las métricas con `calculateLightingMeasurement()` y reemplaza los indicadores enviados por el cliente.
- Otros protocolos mantienen el comportamiento genérico actual.
- La normalización no se ejecuta si el PATCH no toca `rawData.lighting`, evitando recalcular registros históricos innecesariamente.
- La compilación real y las pruebas específicas de manipulación siguen pendientes antes de declarar esta barrera verificada.

### Reproducibilidad
- Package manager canónico: npm.
- Lockfile canónico: `package-lock.json`.
- `bun.lock` existe pero su metadata identifica `react-example`; queda marcado como heredado/no canónico.
- `vite` está declarado explícitamente en `devDependencies`.
- `npm run lint`: `tsc --noEmit`.
- `npm run build`: `vite build` + `esbuild`.
- No existe `.github/workflows/` en `main`; no hay CI automático actualmente.
- No declarar verde ningún test/lint/build sin ejecución real.

### Estado actual de Iluminación
- Cálculo SRT 84/2012: implementado.
- Modelo documental: implementado.
- Captura documental: implementada.
- Mapper: implementado y alineado con template.
- PDF: actualizado y alineado.
- Snapshot normativo: implementado y protegido contra mutación post-validación.
- Snapshot de instrumentos: implementado y exigido para generación documental.
- Integridad de mediciones validadas: protegida en schema + servicio.
- Tests específicos: presentes; ejecución real pendiente.
- Persistencia/reconstrucción end-to-end: pendiente de ejecución real.
- Web: pendiente.
- XLSX: pendiente.
- Cobertura normativa completa: pendiente.
- Auditoría completa de consumidores/escritores: pendiente.

## Cadena objetivo

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

## Próximas tareas
1. Ejecutar realmente lint/tests/build en entorno reproducible.
2. Agregar CI sólo después de confirmar ejecución local/reproducible.
3. Revisar representación Web.
4. Implementar/revisar exportador XLSX.
5. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
6. Verificar campo-por-campo contra SRT 84/2012.
7. Revisar migración/compatibilidad de registros antiguos con `uniformityRatio`.
8. Completar cobertura normativa de Iluminación.
9. Ejecutar prueba end-to-end de persistencia y reconstrucción documental.
10. Sólo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

## Regla de continuidad
Este registro corresponde exclusivamente a **Safety V2**. GitHub/código es la fuente de verdad; este archivo es memoria de trabajo. Si el registro contradice al código, el código prevalece y el registro debe corregirse.

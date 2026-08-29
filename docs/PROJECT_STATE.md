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
- El mapper y el template documental fueron alineados a las mismas nueve secciones: `identification`, `context`, `technical`, `measurement_points`, `indicators`, `instruments`, `normative`, `professional_review`, `traceability`.
- La versión de plantilla se toma de `LIGHTING_DOCUMENT_TEMPLATE`, evitando versiones hardcodeadas divergentes.
- La generación documental exige medición `validated`, snapshot normativo y snapshots de todos los instrumentos; no debe reconstruir evidencia histórica desde el catálogo vivo.
- `measurementSnapshot` conserva los datos persistidos necesarios para reconstrucción documental.
- El PDF consume las claves nuevas de representación y renderiza explícitamente la evaluación normativa congelada.
- Se creó prueba específica del mapper para contrato de template, uniformidad, normativa e instrumentación histórica.
- El runner de tests conserva la suite histórica `server/tests/tenantAuth.test.ts` y agrega la suite Vitest de Iluminación.

### Correcciones de reproducibilidad
- `package.json` ahora declara `vite` explícitamente en `devDependencies`, coherente con el script `vite build` y con el `package-lock.json` existente.
- Se alinearon en `package.json` las restricciones de `@tailwindcss/vite` y `autoprefixer` con las que constan en el lockfile.
- `package-lock.json` es el lockfile npm canónico para este proyecto; `bun.lock` existe pero su metadata identifica `react-example`, por lo que queda marcado como artefacto heredado/no canónico.
- No se fabricó ni regeneró manualmente `package-lock.json`; la ejecución real de `npm ci` sigue pendiente de verificación.
- No existe actualmente `.github/workflows/` en `main`; por lo tanto no hay CI automático que certifique tests/lint/build.

### Hallazgos de integridad del workflow
- El `PATCH /measurements/:id` fue restringido para no aceptar `status`, evitando saltarse `validateMeasurementForSubmission()` para entrar a `pending_review`.
- La máquina de estados del servicio bloquea modificaciones de mediciones `validated`/`closed`.
- Se verificó que `submit-for-review` ejecuta `validateMeasurementForSubmission()` antes de `pending_review`.
- Se identificó que el endpoint de `normative-snapshot` podía intentar modificar el snapshot después de validar.
- **Corrección aplicada:** `hygieneMeasurementWorkflowService.updateMeasurementWithAudit()` ahora rechaza `normativeEvaluationSnapshot` cuando la medición está `validated`, `closed` o `archived`, mediante `NORMATIVE_SNAPSHOT_LOCKED`.
- Esta protección está en la capa de workflow, por lo que también cubre callers internos que usen el servicio y no sólo la ruta HTTP.
- La búsqueda global de callers adicionales mediante GitHub Code Search no produjo coincidencias útiles; esto se registra como búsqueda sin coincidencias, no como prueba absoluta de ausencia.

### Commits relevantes de este ciclo
- `d62a4a97275c98a0e02ba844780c19693a27ee87` — `fix(lighting): include uniformity result in document representation`
- `808d2fb2e77bb5042dc7dceabcd40019b3a0ff77` — `fix(lighting): render normative snapshot section in PDF`
- `de329e527b39b247ff8f3188ebbb0ad0776a0dd1` — `chore: align build dependencies with lockfile`
- `b10853c36661eefad49fd198e2050ae79ecc05ed` — preservación de suite legacy + suite Vitest de Iluminación
- `69954daa0e0dc0609161aac4753e0bbc29b53e5b` — `fix(lighting): enforce normative snapshot immutability in workflow`

### Estado actual
- Cálculo SRT 84/2012: implementado.
- Modelo documental: implementado.
- Captura documental: implementada.
- Mapper: implementado y alineado con template.
- PDF: actualizado y alineado con la representación.
- Snapshot normativo: implementado y protegido contra modificación posterior a validación.
- Snapshot de instrumentos: implementado en validación y exigido para generación documental.
- Integridad de workflow: protegida contra bypass de `status` por PATCH y contra mutación de snapshot normativo después de validación.
- Tests específicos: presentes, pero ejecución real todavía no verificada.
- Persistencia/reconstrucción end-to-end: arquitectura implementada; falta ejecución real.
- CI: no configurado.
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
1. Auditar consumidores restantes de `LightingMeasurementData` y cualquier escritor alternativo.
2. Verificar persistencia y reconstrucción del snapshot documental mediante ejecución real.
3. Revisar representación Web.
4. Implementar/revisar exportador XLSX: actualmente no se encontró implementación.
5. Buscar cualquier segunda fuente de `requiredLux`, criterio, versión o clasificación.
6. Verificar que el documento exponga el criterio seleccionado exclusivamente desde el snapshot.
7. Revisar migración/compatibilidad de registros antiguos que todavía tengan `uniformityRatio`.
8. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
9. Cerrar el mapeo campo-por-campo con el formulario SRT 84/2012.
10. Crear CI solamente después de confirmar el camino reproducible npm.
11. Solo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

---

## Estado consolidado de Iluminación

- Catálogo normativo estructurado: implementado.
- Selección de versión/criterio desde backend: implementado.
- Validación server-side y snapshot normativo: implementado.
- Cálculo SRT 84/2012 del escritor principal: implementado.
- Semántica de uniformidad: corregida en modelo, motor, editor y PDF.
- Instrumento/calibración: modelo existente; snapshot histórico capturado al validar.
- Captura documental de campaña: implementada.
- Captura documental por punto: implementada.
- Preservación de campaign durante cálculo: implementada.
- Mapper medición → representación documental: implementado.
- Contrato template ↔ mapper: alineado.
- PDF renderer ↔ representación: alineado.
- Integridad de workflow: endurecida.
- Persistencia/reconstrucción documental end-to-end: pendiente de ejecución/verificación real.
- Documento histórico desacoplado del catálogo vivo: implementado en la ruta de generación que exige snapshots; falta prueba real de reconstrucción.
- Auditoría de todos los consumidores/escritores: pendiente.
- Web: pendiente.
- XLSX: pendiente; no se encontró implementación actual.
- Cobertura normativa completa: pendiente.
- Tests específicos: implementados.
- Tests/lint/build ejecutados: no verificados todavía por falta de ejecución en entorno/CI.

---

## Decisión arquitectónica documental

```text
CATÁLOGO NORMATIVO VIVO
        ↓
selección + validación
        ↓
SNAPSHOT NORMATIVO CONGELADO
        ↓
SNAPSHOT DE INSTRUMENTOS
        ↓
SNAPSHOT DOCUMENTAL
        ↓
REPRESENTACIÓN
   ┌────┼────┐
   ↓    ↓    ↓
  WEB  PDF  XLSX
```

El catálogo vivo no debe intervenir en la reconstrucción de documentos históricos. Todos los renderers deben consumir la misma representación derivada del snapshot.

## Reproducibilidad del proyecto

- Package manager canónico: npm.
- Lockfile canónico: `package-lock.json`.
- `bun.lock`: presente pero marcado como heredado/no canónico por metadata `react-example`.
- `vite`: declarado explícitamente en `devDependencies`.
- `npm test`: ejecuta la suite legacy y la suite específica de Iluminación.
- `npm run lint`: `tsc --noEmit`.
- `npm run build`: `vite build` + `esbuild`.
- CI: todavía inexistente.

## Regla de continuidad

No declarar verde ningún test, lint o build sin resultado de ejecución real. Continuar con auditoría y correcciones funcionales/arquitectónicas; la verificación integral se realizará al finalizar este ciclo de consolidación.

## Regla de proyecto

Este registro corresponde exclusivamente a **Safety V2**. No mezclar con Conexa ni con otros repositorios/proyectos.

# Safety V2 — Registro de descubrimientos de Iluminación

Fecha: 2026-08-29
Repositorio: josemiranda5266-blip/Safety-v2

## Hallazgo: PATCH genérico de mediciones

La ruta `PATCH /measurements/:id` utiliza `updateHygieneMeasurementSchema` y pasa el resultado a `hygieneMeasurementWorkflowService.updateMeasurementWithAudit`.

El esquema de actualización fue endurecido para que las transiciones de estado no se realicen mediante el PATCH genérico. Las transiciones de workflow se ejecutan mediante endpoints controlados (`submit-for-review`, `review`, etc.).

El servicio de persistencia mantiene una máquina explícita de estados y el endpoint específico `POST /measurements/:id/submit-for-review` ejecuta `validateMeasurementForSubmission()` antes de cambiar a `pending_review`.

### Decisión y corrección

El PATCH genérico queda limitado a datos editables de la medición. Las transiciones de workflow no deben ser un efecto lateral de un update genérico.

### Estado

- Hallazgo original confirmado en código: **sí**.
- Riesgo original: bypass de validación previa al envío a revisión.
- Corrección en `main`: **aplicada**.
- Verificación automatizada de esta regresión: **pendiente de ejecución real**.

## Trust boundary de Iluminación

Se detectó que el cliente podía enviar métricas derivadas dentro de `rawData.lighting`. El workflow ahora, cuando la medición existente tiene `protocolType === "lighting"` y el PATCH modifica `rawData.lighting`, valida las lecturas y vuelve a ejecutar el cálculo canónico antes de persistir.

El cálculo canónico rechaza lecturas Lux negativas o no finitas; ya no descarta silenciosamente una lectura inválida.

Se agregó cobertura unitaria para cálculo, Lux negativo y valores no finitos, y el test fue incorporado al script `npm test`.

### Estado

- Recalculo server-side: **implementado**.
- Métricas enviadas por cliente como fuente de verdad: **eliminado para updates de iluminación**.
- Validación física básica de Lux: **implementada**.
- Tests escritos: **sí**.
- Ejecución real de tests/lint/build: **pendiente**.
- Prueba end-to-end contra persistencia real: **pendiente**.

## Regla de verificación

`PROJECT_STATE.md` y este registro son memoria de trabajo. GitHub/código es la fuente de verdad. Si el registro contradice al código, prevalece el código y el registro debe actualizarse antes de continuar.
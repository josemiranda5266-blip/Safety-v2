# Safety V2 — Registro de descubrimientos de Iluminación

Fecha: 2026-08-29
Repositorio: josemiranda5266-blip/Safety-v2

## Hallazgo: PATCH genérico de mediciones

La ruta `PATCH /measurements/:id` utiliza `updateHygieneMeasurementSchema` y pasa el resultado a `hygieneMeasurementWorkflowService.updateMeasurementWithAudit`.

El esquema de actualización permite actualmente `status` además de `measurementDate`, `instrumentIds`, `notes` y `rawData`.

El servicio de persistencia sí protege las transiciones de estado mediante una máquina explícita: `draft -> in_progress/cancelled`, `in_progress -> draft/pending_review/cancelled`, `pending_review -> in_progress/validated/cancelled`, `validated -> closed`, etc.

Sin embargo, la ruta genérica puede intentar `in_progress -> pending_review` sin ejecutar primero `validateMeasurementForSubmission()`, porque esa validación existe en el endpoint específico `POST /measurements/:id/submit-for-review`.

### Decisión

El PATCH genérico debe quedar limitado a datos editables de la medición. Las transiciones de workflow deben ejecutarse exclusivamente mediante endpoints controlados (`submit-for-review`, `review`, etc.).

### Estado

- Hallazgo confirmado en código: **sí**.
- Riesgo: bypass de validación previa al envío a revisión.
- Corrección aplicada: **no todavía**.
- Próximo cambio: retirar `status` del schema de PATCH o, equivalentemente, impedirlo explícitamente en la ruta; después agregar prueba de regresión.

## Regla de verificación

`PROJECT_STATE.md` continúa siendo memoria de trabajo. Este registro documenta el descubrimiento verificable en código para no perder contexto mientras se prepara la corrección.

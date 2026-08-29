# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones, arquitectura, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

## Regla de fuente de verdad
GitHub/código es la fuente de verdad. Este archivo y `docs/audits/*` son memoria de trabajo. Si una afirmación de memoria no está demostrada por el código, se marca **no verificada**. Si el código demuestra algo que no figura en la memoria, se actualiza la memoria.

## 2026-08-29 — Iluminación: estado consolidado de auditoría

### Avances y correcciones aplicadas
- El modelo de iluminación conserva campaña y metadata documental por punto.
- El editor captura y restaura dichos datos.
- `calculateLightingMeasurement()` preserva `campaign`.
- El cálculo canónico rechaza Lux negativos y valores no finitos.
- El backend recalcula las métricas de iluminación cuando un update modifica `rawData.lighting`; no confía en métricas derivadas enviadas por el cliente.
- El PATCH genérico no permite transiciones de estado; `submit-for-review` y `review` son workflows explícitos.
- `submit-for-review` valida antes de pasar a `pending_review`.
- `validated`, `closed` y `archived` quedaron protegidos contra modificaciones en la capa de persistencia.
- El snapshot normativo queda protegido una vez congelado y la generación documental exige snapshot normativo.
- La generación documental exige medición `validated` y snapshots instrumentales completos.
- El documento histórico se reconstruye desde snapshots y no desde el catálogo vivo.
- `lightingDocumentMapper.ts` no recalcula las métricas persistidas; transforma el snapshot de medición en representación documental.
- La representación documental deriva `uniformityPasses` de los valores persistidos, sin consultar normativa viva.
- La evaluación de iluminación usa el criterio congelado y requiere revisión profesional; no emite una conclusión automática de cumplimiento.
- El catálogo normativo y los requisitos específicos de iluminación están separados.
- El resolver de requisitos evita adivinar ante ambigüedad o falta de correspondencia inequívoca.
- `requiredLux` queda asociado al criterio/snapshot normativo, no a un valor libre del usuario.
- `npm test` incluye la suite legacy, mapper y `lightingMeasurement.test.ts`.
- Se corrigió el fixture del test para respetar los tipos reales de iluminación.
- Se agregó cobertura del workflow para manipulación de métricas enviadas por el cliente.
- Se corrigió la inmutabilidad de `archived`.
- Se corrigieron registros de auditoría que habían quedado desactualizados respecto de `main`.

### Descubrimientos pendientes
- El servicio inferior de persistencia es genérico y puede escribir `rawData`; todavía no está demostrado exhaustivamente que no exista otro consumidor directo capaz de bypassar el workflow.
- `validateMeasurementForSubmission()` debe seguir siendo una validación de workflow y no duplicar el cálculo físico; hay que comprobar que ninguna transición permita enviar iluminación sin resultado canónico válido.
- La regla normativa de validez de 12 meses está definida para iluminación, pero todavía no está demostrado que bloquee o marque una medición vencida antes de `validated`.
- El catálogo específico de iluminación es una primera cobertura curada, no una cobertura exhaustiva de todas las actividades/puestos.
- Falta cotejo campo-por-campo y valor-por-valor de la implementación contra SRT 84/2012.
- Falta verificar completamente conclusiones y recomendaciones del protocolo en cada salida documental.
- Falta revisar compatibilidad de registros antiguos con `uniformityRatio` y campos nuevos.
- No se puede declarar verde ningún test/lint/build sin ejecución real.
- No existe CI automático en `main`.
- Persistencia y reconstrucción end-to-end real siguen sin ejecución.

### Hallazgo normativo: vigencia de 12 meses
La Resolución SRT 84/2012 establece una validez de 12 meses para los valores de la medición de iluminación. El código ya contiene la regla de vigencia, pero su integración con la evaluación/workflow de validación todavía debe verificarse.

### Plan de solución / verificación
1. Rastrear todos los consumidores reales de los servicios de mediciones y confirmar que no exista un escritor alternativo que pueda bypassar el workflow de iluminación.
2. Auditar la transición completa `in_progress → pending_review → validated` y garantizar que toda iluminación llegue con cálculo canónico válido.
3. Integrar la vigencia de 12 meses en la regla de workflow apropiada, evitando una segunda fuente de verdad. Primero determinar si debe bloquear validación, generar advertencia de vigencia o ambas cosas según el modelo funcional.
4. Mantener el snapshot normativo completo como evidencia histórica: referencia, versión, criterio, parámetros, fuente y resultado aplicado.
5. Completar el catálogo de requisitos de iluminación sólo con evidencia normativa verificable; nunca inventar `requiredLux` ante ambigüedad.
6. Hacer cotejo campo-por-campo con el protocolo oficial SRT 84/2012.
7. Agregar/ajustar pruebas de regresión para vigencia, snapshots y bypasses de escritura.
8. Ejecutar realmente `npm test`, `npm run lint` y `npm run build` en un entorno reproducible y registrar resultados.
9. Ejecutar prueba end-to-end de persistencia, validación y reconstrucción documental.
10. Sólo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

## Cadena objetivo

```text
LECTURAS CRUDAS
      ↓
CÁLCULO FÍSICO CANÓNICO
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

## Estado actual de Iluminación

| Área | Estado |
|---|---|
| Cálculo físico | 🟢 implementado |
| Validación Lux | 🟢 implementada |
| Recalculo server-side | 🟢 implementado |
| Protección de estados | 🟢 implementada |
| Snapshot normativo | 🟢 implementado; contenido/uso siguen bajo auditoría |
| Snapshot instrumental | 🟢 implementado |
| Documento histórico | 🟢 implementado |
| Evaluación profesional | 🟢 implementada |
| Vigencia 12 meses | 🟡 definida; integración al workflow pendiente |
| Cobertura de requisitos | 🟡 parcial/curada |
| Cotejo completo SRT 84/2012 | 🟡 pendiente |
| Tests específicos | 🟢 escritos |
| Ejecución real de tests | 🔴 pendiente |
| Lint/build real | 🔴 pendiente |
| E2E | 🔴 pendiente |
| Web | 🔴 pendiente |
| XLSX | 🔴 pendiente |

## Regla de continuidad
Este registro corresponde exclusivamente a **Safety V2**. No mezclar con CONEXA, Fletes Ya ni otros proyectos. Cada nuevo descubrimiento debe indicar si está **verificado en código**, **implementado pero no ejecutado**, o **pendiente/no verificado**.

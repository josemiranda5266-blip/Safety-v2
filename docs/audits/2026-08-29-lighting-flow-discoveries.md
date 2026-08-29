# Safety V2 — Registro de descubrimientos de Iluminación

Fecha: 2026-08-29  
Repositorio: `josemiranda5266-blip/Safety-v2`

## Regla de fuente de verdad
GitHub/código es la fuente de verdad. Este archivo es memoria de trabajo y debe corregirse cuando quede desactualizado respecto de `main`.

## Avances y correcciones verificadas en código

### 1. PATCH genérico de mediciones
La ruta `PATCH /measurements/:id` usa el esquema de actualización y pasa los datos al workflow. El esquema fue endurecido para impedir transiciones de estado mediante el PATCH genérico. Las transiciones sensibles se realizan mediante endpoints de workflow específicos.

`POST /measurements/:id/submit-for-review` exige que la medición esté en `in_progress`, ejecuta `validateMeasurementForSubmission()` y sólo después cambia a `pending_review`.

**Estado:** corrección implementada en `main`; regresión automatizada pendiente de ejecución real.

### 2. Trust boundary de Iluminación
El cliente podía enviar métricas derivadas dentro de `rawData.lighting`. El workflow ahora, cuando una medición existente es `lighting` y el update modifica `rawData.lighting`, valida las lecturas y recalcula el resultado canónico antes de persistir.

El cálculo canónico rechaza Lux negativos y valores no finitos.

**Estado:** implementado; tests escritos; ejecución real pendiente.

### 3. Estados inmutables
La capa de persistencia protege `validated`, `closed` y `archived` contra modificaciones.

**Estado:** implementado.

### 4. Snapshots instrumentales
La medición validada conserva snapshots de instrumentos. La generación documental exige snapshots completos y el documento histórico usa esos snapshots, no el catálogo vivo.

**Estado:** implementado; E2E pendiente.

### 5. Snapshot normativo
La generación documental exige snapshot normativo y el snapshot contiene la referencia/versión/criterio/parámetros necesarios para reconstrucción histórica. El snapshot queda protegido cuando la medición ya está congelada.

**Estado:** implementado; contenido y cobertura completa siguen bajo auditoría.

### 6. Mapper y documento histórico
`lightingDocumentMapper.ts` transforma el snapshot persistido en `HygieneDocumentRepresentation` y no vuelve a ejecutar el cálculo físico. `uniformityPasses` es una derivación documental de valores persistidos.

**Estado:** implementado; cobertura adicional pendiente.

### 7. Evaluación normativa
La evaluación de iluminación utiliza el criterio congelado para obtener `requiredLux` y no emite una conclusión automática de cumplimiento; mantiene la revisión profesional como decisión final.

El resolver evita adivinar ante ambigüedad o ausencia de correspondencia inequívoca.

**Estado:** implementado; cobertura normativa completa pendiente.

### 8. Vigencia SRT 84/2012
La normativa establece validez de 12 meses para los valores de la medición de iluminación. El código contiene la regla de vigencia, pero todavía no está demostrado que el workflow de validación impida o marque correctamente una medición vencida.

**Estado:** hallazgo abierto.

## Descubrimientos arquitectónicos abiertos

- `hygieneService` es una capa de persistencia genérica que puede escribir `rawData`; la protección específica de iluminación está concentrada en el workflow. Hay que terminar de demostrar que no existe un consumidor alternativo que pueda bypassar el workflow.
- `validateMeasurementForSubmission()` no debería duplicar el cálculo físico; debe exigir las precondiciones correctas del workflow y apoyarse en la validación/cálculo canónico.
- El catálogo específico de iluminación es una primera cobertura curada y no debe presentarse como cobertura exhaustiva de todas las actividades/puestos.
- Falta cotejo campo-por-campo y valor-por-valor contra el protocolo oficial SRT 84/2012.
- Falta revisar conclusiones/recomendaciones en todas las salidas documentales.
- Falta revisar compatibilidad de registros antiguos con `uniformityRatio` y campos nuevos.
- Tests, lint y build están escritos/configurados pero no deben marcarse como PASS hasta ejecución real.
- No existe CI automático en `main`.

## Plan de solución

1. Completar rastreo de consumidores/escritores de mediciones.
2. Verificar que toda transición `in_progress → pending_review → validated` pase por las validaciones correspondientes.
3. Integrar la vigencia de 12 meses en el punto correcto del workflow, evitando duplicar la fuente de verdad.
4. Mantener snapshots normativos e instrumentales como evidencia histórica inmutable.
5. Completar requisitos de iluminación sólo con evidencia normativa verificable.
6. Cotejar el modelo y documento campo-por-campo con SRT 84/2012.
7. Añadir regresiones para vigencia, snapshots y bypasses.
8. Ejecutar realmente `npm test`, `npm run lint` y `npm run build` y registrar resultados.
9. Ejecutar E2E real de persistencia → validación → documento.
10. Sólo después cerrar Iluminación y avanzar a Ruido.

## Estado de continuidad

```text
Cálculo físico                  🟢
Validación Lux                 🟢
Recalculo server-side           🟢
Protección de estados          🟢
Snapshots                      🟢
Documento histórico            🟢
Evaluación profesional         🟢
Vigencia 12 meses              🟡
Cobertura normativa            🟡
Consumidores alternativos      🟡
Tests ejecutados               🔴
Lint/build ejecutados          🔴
E2E                            🔴
```

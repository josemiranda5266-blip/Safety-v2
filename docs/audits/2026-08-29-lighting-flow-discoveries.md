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
La capa de persistencia protege `validated`, `closed` y `archived` contra modificaciones. `archived` fue agregado explícitamente después de detectar que el servicio inferior todavía permitía modificaciones de datos en ese estado.

**Estado:** implementado.

### 4. Snapshots instrumentales
La medición validada conserva snapshots de instrumentos. La generación documental exige snapshots completos y el documento histórico usa esos snapshots, no el catálogo vivo.

**Estado:** implementado; E2E pendiente.

### 5. Snapshot normativo
La generación documental exige snapshot normativo y el snapshot contiene la referencia/versión/criterio/parámetros necesarios para reconstrucción histórica. El snapshot queda protegido cuando la medición ya está congelada.

**Estado:** implementado; contenido y cobertura completa siguen bajo auditoría.

### 6. Mapper y documento histórico
`lightingDocumentMapper.ts` transforma el snapshot persistido en `HygieneDocumentRepresentation` y no vuelve a ejecutar el cálculo físico. `uniformityPasses` es una derivación documental de valores persistidos.

También se verificó que la generación documental recibe una medición validada y construye una copia histórica de `rawData`, snapshots instrumentales y snapshot normativo; no depende del catálogo vivo para reconstruir el documento.

**Estado:** implementado; cobertura adicional pendiente.

### 7. Evaluación normativa
La evaluación de iluminación utiliza el criterio congelado para obtener `requiredLux` y no emite una conclusión automática de cumplimiento; mantiene la revisión profesional como decisión final.

El resolver evita adivinar ante ambigüedad o ausencia de correspondencia inequívoca.

**Estado:** implementado; cobertura normativa completa pendiente.

### 8. Vigencia SRT 84/2012
La normativa establece validez de 12 meses para los valores de la medición de iluminación. El código contiene la regla de vigencia, pero todavía no está demostrado que el workflow de validación impida o marque correctamente una medición vencida.

**Estado:** hallazgo abierto.

### 9. Catálogo de requisitos de iluminación
El catálogo específico está diseñado como cobertura curada inicial y no como tabla exhaustiva. El sistema debe evitar inventar `requiredLux` cuando la clasificación sea ambigua o no exista correspondencia inequívoca.

**Estado:** diseño seguro; cobertura completa pendiente.

### 10. Fixture y regresiones
Se corrigió el fixture de iluminación para respetar los tipos reales (`sourceType` válido y `pointType`). Se incorporó `lightingMeasurement.test.ts` a `npm test` y se agregó cobertura de manipulación de métricas en el workflow.

**Estado:** tests escritos/configurados; ejecución real pendiente.

## Descubrimientos arquitectónicos abiertos

- `hygieneService` es una capa de persistencia genérica que puede escribir `rawData`; la protección específica de iluminación está concentrada en el workflow. Hay que terminar de demostrar que no existe un consumidor alternativo que pueda bypassar el workflow.
- `validateMeasurementForSubmission()` no debería duplicar el cálculo físico; debe exigir las precondiciones correctas del workflow y apoyarse en la validación/cálculo canónico.
- La regla de vigencia de 12 meses está definida en código pero todavía debe integrarse/verificarse en el workflow correcto.
- El catálogo específico de iluminación es una primera cobertura curada, no una cobertura exhaustiva de todas las actividades/puestos.
- Falta cotejo campo-por-campo y valor-por-valor contra el protocolo oficial SRT 84/2012.
- Falta revisar conclusiones/recomendaciones en todas las salidas documentales.
- Falta revisar compatibilidad de registros antiguos con `uniformityRatio` y campos nuevos.
- Tests, lint y build están escritos/configurados pero no deben marcarse como PASS hasta ejecución real.
- No existe CI automático en `main`.
- Persistencia y reconstrucción end-to-end real siguen sin ejecución.

## Plan de solución y verificación

1. Completar rastreo de consumidores reales de `hygieneService`, especialmente escritores de mediciones y `rawData`, para demostrar que no existe un bypass del workflow.
2. Auditar y, si hace falta, endurecer `validateMeasurementForSubmission()` para que ninguna iluminación pueda pasar a revisión sin datos/cálculo canónico válido, sin duplicar la lógica matemática.
3. Integrar la vigencia de 12 meses en el punto correcto del workflow. Primero determinar si debe bloquear `validated`, generar advertencia, o ambas cosas según el modelo funcional; la fuente de verdad debe ser única.
4. Mantener snapshots normativos e instrumentales completos como evidencia histórica inmutable.
5. Completar el catálogo de requisitos de iluminación sólo con evidencia normativa verificable; ante ambigüedad, exigir clasificación/revisión profesional.
6. Cotejar campo-por-campo el modelo, UI, mapper y documentos contra el protocolo oficial SRT 84/2012.
7. Cotejar valor-por-valor los requisitos de iluminación y documentar el origen normativo de cada `requiredLux`.
8. Revisar conclusiones y recomendaciones de PDF/Web/XLSX para asegurar que distingan resultado técnico, criterio normativo y decisión profesional.
9. Revisar compatibilidad/migración de registros históricos que no tengan los campos nuevos.
10. Agregar regresiones específicas para vigencia, snapshots, estados inmutables y bypasses de escritura.
11. Ejecutar realmente `npm test`, `npm run lint` y `npm run build` en un entorno reproducible y registrar resultados, incluyendo cualquier fallo que aparezca.
12. Ejecutar E2E real: captura → persistencia → recálculo server-side → submit → revisión → validación → snapshots → documento → reconstrucción.
13. Sólo después de cerrar Iluminación de extremo a extremo, avanzar a Ruido.

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
Tests escritos                 🟢
Tests ejecutados               🔴
Lint/build ejecutados          🔴
E2E                            🔴
```

## Criterio de cierre de Iluminación
No considerar Iluminación cerrada sólo porque el código compile. El cierre requiere: integridad de escritura demostrada, cálculo canónico protegido, vigencia normativa resuelta, requisitos normativos verificables, snapshots históricos, documentos coherentes y pruebas reales de test/lint/build/E2E. Solo entonces se podrá pasar al siguiente protocolo.

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Endurecimiento del criterio regulatorio de Iluminación

### Hallazgo

El primer motor de criterios permitía evaluar como conforme un registro aunque faltaran mínimo y promedio, porque trataba la uniformidad como opcional. Eso es demasiado permisivo para una evaluación documental del protocolo: el Anexo IV exige una relación no menor de 0,5 entre iluminancia mínima y media para una uniformidad razonable. Además, la Resolución SRT 84/2012 establece una validez de 12 meses para los valores de medición consignados en el protocolo.

### Corrección

`src/config/srtLightingCriteria.ts` ahora:

- exige `measuredLux`, `requiredLux`, `minimumLux` y `averageLux` para emitir una evaluación de conformidad;
- calcula uniformidad exclusivamente como `minimumLux / averageLux`;
- mantiene el umbral normativo de `0.5`;
- incorpora `validityMonths = 12`;
- calcula `validityExpiresAt` a partir de la fecha de medición;
- informa `isExpired` en función de la fecha de evaluación;
- conserva referencia, versión y fuente oficial;
- mantiene `insufficient_data` cuando no existe información suficiente, en lugar de convertir ausencia de datos en cumplimiento.

### Fuente normativa auditada

La SRT identifica la Resolución 84/2012 como protocolo obligatorio de medición de iluminación y establece una validez de doce meses para los valores consignados. El Decreto 351/79, Anexo IV, establece que la intensidad mínima depende de la dificultad de la tarea visual o del destino del local y fija una relación mínima de 0,5 entre iluminancia mínima y media. citeturn0search0turn0search6turn0search1

### Commit

- `f770380198ce9ca3d406263f9da8ba0a5ba6db5f` — fix(hygiene): harden lighting regulatory evaluation and validity

### Próxima acción

Conectar el criterio con una tabla normativa estructurada de clasificación de tarea/local para resolver el valor requerido aplicable sin hardcodearlo en el motor. El valor y la clasificación utilizados deberán quedar congelados en el snapshot histórico de la medición.

---

## 2026-08-29 — Motor de criterios regulatorios de Iluminación

### Objetivo

Separar la referencia normativa del criterio técnico utilizado para evaluar una medición. El motor debe recibir el valor medido y el valor requerido aplicable, evaluar también la uniformidad cuando exista información suficiente, y devolver el resultado junto con la referencia y versión normativa utilizadas.

### Auditoría normativa

La SRT establece que el protocolo de Iluminación de la Res. 84/2012 es obligatorio y que los valores de medición consignados en el protocolo tienen una validez de 12 meses. El formulario oficial incluye, por punto de muestreo, valor medido en lux, valor requerido legalmente según Anexo IV del Decreto 351/79 y el criterio de uniformidad. El Anexo IV establece una relación no menor de 0,5 entre los valores mínimo y medio para una uniformidad razonable.

### Implementación

- Creado `src/config/srtLightingCriteria.ts`.
- El criterio tiene identificador propio `srt_84_2012_lighting` y referencia `srt-84-2012`.
- El motor distingue `compliant`, `non_compliant` e `insufficient_data`.
- Evalúa `measuredLux >= requiredLux`.
- Calcula uniformidad como `minimumLux / averageLux`.
- El valor requerido no se hardcodea en el motor.
- Se corrigió el acceso al catálogo para utilizar `getSrtReference()`.

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

### Objetivo

Consolidar las referencias normativas utilizadas por los protocolos en un catálogo central, identificable y versionable.

### Implementación

- Creado `src/config/srtRegulatoryCatalog.ts`.
- Referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor.
- La plantilla `lighting_protocol` está vinculada a `srt-84-2012`.
- La representación conserva identidad de la referencia normativa y evaluación congelada del snapshot.

---

## 2026-08-29 — Exportación PDF de Iluminación

### Resultado arquitectónico

```text
SNAPSHOT HISTÓRICO
       ↓
DOCUMENTO VERSIONADO
       ↓
REPRESENTACIÓN DOCUMENTAL
       ├───────────────┐
       ↓               ↓
    VISOR WEB       EXPORTADOR PDF
```

La representación es la fuente común; Web y PDF no poseen cálculos propios.

### Próximas fases prioritarias

1. Tabla normativa aplicable para clasificar tareas/locales de Iluminación.
2. Persistencia del criterio, clasificación y valor requerido utilizado en cada medición.
3. Llevar evaluación y vencimiento al documento/PDF.
4. Protocolo de Ruido.
5. Protocolo de Puesta a Tierra.
6. Integración medición → hallazgo → acción correctiva.
7. Alertas de calibración y vencimientos.
8. Matriz integral de mediciones por empresa.
9. Gestión comercial de alquiler después de consolidar inventario técnico.

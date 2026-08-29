# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Integración del resolver normativo de Iluminación con snapshots

### Objetivo

Conectar la tabla normativa de Iluminación con el modelo de medición sin permitir que Safety invente un valor requerido. Una selección normativa válida debe poder quedar congelada en el snapshot histórico.

### Implementación

- Creado `src/services/srtLightingRequirementResolver.ts`.
- `resolveSrtLightingRequirement()` delega en `resolveLightingRequirement()` y conserva el comportamiento seguro: ID profesional exacto o coincidencia única; casos ambiguos/no encontrados quedan sin resolver.
- `buildLightingNormativeSnapshot()` transforma el requisito seleccionado en `NormativeEvaluationSnapshot`.
- El snapshot conserva ID del requisito, clasificación, tarea/local, `requiredLux`, rango cuando existe, tabla de origen, fuente legal, versión y fecha de medición.
- Se corrigió inmediatamente el contrato del resolver para ajustarlo a las interfaces reales de `srtLightingRequirements.ts`; no se dejó una implementación con propiedades inexistentes.

### Estado arquitectónico

La medición ya dispone de `normativeEvaluationSnapshot?: NormativeEvaluationSnapshot`, por lo que el modelo tiene el punto de persistencia necesario. El siguiente paso es conectar esta construcción con el flujo de edición/guardado y no solamente ofrecerla como helper.

### Commits

- `1b5f72ef8694b896f9150e6c283e737e67754878` — feat(hygiene): connect lighting requirement resolver to measurement snapshots
- `794829cab0084d319cad8c325f88c9d6b9dabab4` — fix(hygiene): align lighting requirement resolver with catalog types

### Próxima acción

Integrar el resolver en el flujo real de guardado/revisión de mediciones, persistiendo `normativeEvaluationSnapshot` solamente cuando existe una selección normativa inequívoca o una selección profesional explícita. Después reflejar el criterio congelado en representación Web y PDF.

---

## 2026-08-29 — Tabla normativa estructurada de Iluminación

### Objetivo

Eliminar la dependencia de un `requiredLux` introducido manualmente y comenzar a resolver el valor requerido desde una tabla normativa versionada.

### Fuente auditada

El Anexo IV del Decreto 351/79 establece que la intensidad mínima depende de la dificultad de la tarea visual (Tabla 1) o del destino del local (Tabla 2), y que la Tabla 1 se utiliza para tareas no incluidas en Tabla 2. La guía oficial de SRT 84/2012 describe el mismo procedimiento. citeturn0search0turn0search13

El formulario oficial de SRT 84/2012 requiere punto de muestreo, hora, sector, sección/puesto, tipo de iluminación, fuente, general/localizada/mixta, uniformidad, valor medido y valor requerido legalmente según Anexo IV del Decreto 351/79. citeturn0search12

### Implementación

- Creado `src/config/srtLightingRequirements.ts`.
- Catálogo estructurado de requisitos de primera cobertura, con fuente `table_2` o `table_1_visual_task`.
- Cada requisito conserva ID, categoría, tarea/local, lux requerido, fuente normativa, versión y URL oficial.
- Se incorporaron rangos de Tabla 1 sin convertirlos artificialmente en falsa precisión.
- `resolveLightingRequirement()` resuelve por ID profesional o coincidencia controlada.
- Las coincidencias ambiguas o inexistentes devuelven `undefined`.

### Commit

- `69e62e7a1e47e7c20f2b516e01d4fa74bddb012c`

---

## 2026-08-29 — Endurecimiento del criterio regulatorio de Iluminación

`src/config/srtLightingCriteria.ts` exige datos suficientes para evaluar iluminancia y uniformidad, mantiene el umbral 0,5 y calcula la validez de 12 meses. La Resolución SRT 84/2012 establece la validez de doce meses. citeturn0search7

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

Creado `src/config/srtRegulatoryCatalog.ts` con referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor.

---

## 2026-08-29 — Exportación PDF de Iluminación

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

1. Integrar el snapshot normativo en el guardado/revisión real de mediciones.
2. Mostrar criterio, clasificación y `requiredLux` congelados en documento Web/PDF.
3. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
4. Protocolo de Ruido.
5. Protocolo de Puesta a Tierra.
6. Integración medición → hallazgo → acción correctiva.
7. Alertas de calibración y vencimientos.
8. Matriz integral de mediciones por empresa.
9. Gestión comercial de alquiler después de consolidar inventario técnico.

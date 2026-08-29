# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> Propósito: mantener dentro del repositorio el contexto técnico, objetivos, decisiones arquitectónicas, hallazgos y avances para retomar el trabajo sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 2026-08-29 — Integración real del snapshot normativo en el editor de Iluminación

### Objetivo

Cerrar el hueco entre el helper normativo y la aplicación real: el criterio normativo no debe existir solamente en código de soporte; debe poder asociarse explícitamente a una medición y quedar persistido antes de enviarla a revisión.

### Auditoría realizada

El backend ya disponía de `POST /measurements/:id/normative-snapshot`. El endpoint valida que la versión normativa exista y que corresponda al tipo de protocolo antes de congelar sus criterios en `normativeEvaluationSnapshot`. Por lo tanto, no era necesario duplicar esa persistencia desde React ni escribir criterios legales directamente desde el cliente.

### Correcciones

- `src/services/hygieneService.ts` incorpora `saveNormativeSnapshot()`.
- `updateMeasurement()` ahora tipa explícitamente `normativeEvaluationSnapshot`.
- `LightingMeasurementEditor.tsx` incorpora una acción explícita para asociar `srt-84-2012`.
- El editor muestra la referencia normativa, versión, cantidad de criterios congelados y fecha de evaluación.
- El requisito de `Normativa asociada` del flujo de envío a revisión ahora queda conectado a una operación real de persistencia, no a un dato local.
- Se mantiene la regla: no se declara cumplimiento automáticamente y la validación final continúa siendo profesional.

### Commits

- `032be13386cfb8533e30b91f08479b0bbfdc4756` — feat(hygiene): persist normative snapshot from measurement service
- `674a461af66fcd67913ec7d09ac235a574fd1b95` — feat(hygiene): connect lighting editor to normative snapshot workflow

### Estado

La cadena crítica queda ahora:

```text
EDITOR
  ↓
DATOS DE MEDICIÓN
  ↓
ASOCIACIÓN NORMATIVA EXPLÍCITA
  ↓
BACKEND VALIDA VERSIÓN
  ↓
NORMATIVE EVALUATION SNAPSHOT
  ↓
ENVÍO A REVISIÓN
  ↓
VALIDACIÓN PROFESIONAL
  ↓
DOCUMENTO
```

### Próxima acción

Eliminar la dependencia del identificador normativo fijo en el cliente y hacer que la UI consulte las versiones normativas activas del backend. Luego conectar el criterio específico seleccionado con el catálogo canónico del servidor, de modo que la clasificación profesional y el `requiredLux` provengan de una única fuente normativa controlada.

---

## 2026-08-29 — Tabla normativa estructurada de Iluminación

### Objetivo

Eliminar la dependencia de un `requiredLux` introducido manualmente y comenzar a resolver el valor requerido desde una tabla normativa versionada.

### Fuente auditada

El Anexo IV del Decreto 351/79 establece que la intensidad mínima depende de la dificultad de la tarea visual (Tabla 1) o del destino del local (Tabla 2), y que la Tabla 1 se utiliza para tareas no incluidas en Tabla 2. La SRT publica oficialmente la Resolución 84/2012, su anexo, guía y formulario. citeturn0search0turn0search2

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

`src/config/srtLightingCriteria.ts` exige datos suficientes para evaluar iluminancia y uniformidad, mantiene el umbral 0,5 y calcula la validez de 12 meses. La Resolución SRT 84/2012 establece que los valores consignados en el protocolo tienen validez de doce meses. citeturn0search2

---

## 2026-08-29 — Catálogo normativo SRT y trazabilidad documental

Creado `src/config/srtRegulatoryCatalog.ts` con referencias canónicas para Iluminación, Ruido, Contaminantes Químicos, Ergonomía, Puesta a Tierra y estrés por calor. La SRT mantiene estos protocolos en su repositorio oficial. citeturn0search8turn0search10

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

1. Reemplazar el identificador normativo fijo del cliente por consulta al catálogo activo del backend.
2. Conectar criterio específico seleccionado con el catálogo normativo canónico del servidor.
3. Mostrar criterio, clasificación y `requiredLux` congelados en documento Web/PDF.
4. Completar cobertura normativa de Iluminación sin coincidencias ambiguas.
5. Protocolo de Ruido.
6. Protocolo de Puesta a Tierra.
7. Integración medición → hallazgo → acción correctiva.
8. Alertas de calibración y vencimientos.
9. Matriz integral de mediciones por empresa.
10. Gestión comercial de alquiler después de consolidar inventario técnico.

# Safety-v2 — Estado del Proyecto y Registro de Dirección Técnica

> **Propósito de este documento:** mantener dentro del repositorio el contexto técnico, los objetivos, decisiones arquitectónicas, hallazgos y avances. Debe actualizarse después de cada fase relevante de auditoría o modificación para que el trabajo pueda retomarse sin depender de memoria conversacional.

**Última actualización:** 2026-08-29  
**Repositorio:** `josemiranda5266-blip/Safety-v2`

---

## 1. Visión del producto

Evolucionar Safety-v2 hacia una plataforma integral para profesionales, consultoras y empresas de Higiene y Seguridad.

La plataforma debe permitir gestionar:

- organizaciones/workspaces y miembros;
- empresas propias y clientes;
- establecimientos, sectores, puestos y trabajadores;
- inspecciones y hallazgos;
- acciones correctivas;
- documentación y normativa;
- mediciones instrumentales de higiene ocupacional;
- protocolos técnicos;
- instrumental, calibraciones y certificados;
- informes y trazabilidad;
- vencimientos y seguimiento;
- asistencia mediante IA, bajo control profesional.

### Principio comercial

El producto no debe presentarse como una herramienta que certifica automáticamente el cumplimiento legal de una empresa.

La plataforma debe asistir al profesional habilitado mediante instrumental, gestión de datos, cálculos, protocolos, documentación, trazabilidad y automatización. La interpretación, validación y firma profesional corresponden al responsable actuante.

---

## 2. Objetivo estratégico

Construir una plataforma con tres líneas complementarias:

1. **Gestión digital de Higiene y Seguridad.**
2. **Gestión/alquiler de instrumental.**
3. **Servicios profesionales de medición.**

Flujo objetivo:

```
Empresa / profesional
        ↓
Contexto de trabajo
        ↓
Inspección o necesidad de evaluación
        ↓
Medición instrumental
        ↓
Cálculo técnico determinístico
        ↓
Evaluación con reglas y referencia normativa
        ↓
Revisión profesional
        ↓
Documento / informe
        ↓
Seguimiento, acciones y vencimientos
```

---

## 3. Protocolos prioritarios

### Etapa inicial

1. Iluminación.
2. Ruido.
3. Puesta a tierra.

### Etapas posteriores

- estrés térmico;
- ergonomía;
- vibraciones;
- contaminantes químicos;
- gases;
- calidad de aire;
- otros riesgos especializados.

**Regla:** antes de codificar criterios técnicos o valores normativos, verificar la fuente normativa oficial aplicable y versionarla.

---

## 4. Principios arquitectónicos

### 4.1 Multi-tenancy

Toda información privada del nuevo dominio debe respetar la frontera de organización/workspace.

Flujo esperado:

```
Request
  ↓
Authentication
  ↓
User identity
  ↓
Organization context
  ↓
Membership / permission
  ↓
Resource ownership
  ↓
Operation
```

No confiar solamente en IDs enviados por el frontend.

### 4.2 No duplicar dominios existentes

Antes de crear una entidad o servicio nuevo, verificar si Safety-v2 ya implementa un modelo equivalente.

El repositorio ya muestra una arquitectura funcional relacionada con:

- organizaciones;
- empresas;
- establecimientos;
- sectores;
- puestos;
- empleados;
- inspecciones;
- hallazgos;
- acciones correctivas/CAPA;
- documentos;
- normativa;
- reportes;
- IA.

La estrategia es **extender e integrar**, no construir sistemas paralelos.

### 4.3 Separación entre motor técnico e IA

```
INPUT
  ↓
VALIDACIÓN
  ↓
MOTOR DETERMINÍSTICO
  ↓
CÁLCULO
  ↓
REGLAS / EVALUACIÓN
  ↓
RESULTADO TÉCNICO
  ↓
IA ASISTIVA
  ↓
REVISIÓN PROFESIONAL
```

La IA puede asistir con:

- explicaciones;
- resúmenes;
- observaciones;
- recomendaciones;
- borradores.

La IA no debe ser la autoridad que inventa valores legales ni declarar automáticamente cumplimiento normativo.

### 4.4 Fuente de verdad

Las nuevas mediciones y datos críticos no deben usar `localStorage` como fuente principal de verdad.

Los borradores locales, si existen en el futuro, deben ser explícitos y distinguibles de datos confirmados en el backend.

### 4.5 No ampliar servicios monolíticos

No agregar el nuevo dominio indiscriminadamente al servicio heredado `db.ts`.

El dominio de mediciones debe tener responsabilidades separadas.

---

## 5. Estado encontrado hasta ahora

### Confirmado

- Firebase está integrado.
- Existe autenticación y verificación de tokens.
- Existe backend propio.
- Existe autorización basada en contexto organizacional.
- El repositorio tiene trabajo reciente de aislamiento multi-tenant para inspecciones.
- Existen controles orientados a evitar accesos entre organizaciones.
- Existe gestión documental.
- La gestión documental contempla categorías relacionadas con mediciones.
- Existe infraestructura de IA.
- Existe un módulo/pantalla de Higiene.
- Existen pantallas y/o flujos para empresas, establecimientos, sectores, puestos y empleados.
- Existen módulos de inspecciones, IPER, CAPA/acciones correctivas, normativa y reportes.

### Hallazgo relevante

Un commit reciente de multi-tenancy para inspecciones documenta:

- aislamiento de `InspectionReport` por organización;
- reglas de Firestore orientadas a acceso organizacional;
- campos de verificación y seguimiento CAPA en hallazgos;
- uso del identificador de organización activa en API y estado.

Este patrón debe servir como referencia para las futuras mediciones.

---

## 6. Arquitectura funcional objetivo

```
ORGANIZACIÓN / WORKSPACE
│
├── Miembros
│
├── Empresas
│   └── Establecimientos
│       ├── Sectores
│       ├── Puestos
│       └── Empleados
│
├── Inspecciones
│   └── Hallazgos
│       └── Acciones / CAPA
│
├── Higiene
│   ├── Mediciones
│   ├── Protocolos
│   ├── Instrumentos
│   └── Matriz de mediciones
│
├── Documentos
│
├── Normativa
│
└── Reportes
```

---

## 7. Integración clave: inspección → medición

Una inspección puede detectar una situación que requiera evaluación instrumental.

Flujo objetivo:

```
INSPECCIÓN
    ↓
HALLAZGO
    ↓
¿REQUIERE MEDICIÓN?
    ↓
SOLICITUD / CREACIÓN DE MEDICIÓN
    ↓
MEDICIÓN
    ↓
RESULTADO
    ↓
ACTUALIZACIÓN DEL HALLAZGO
    ↓
ACCIÓN CORRECTIVA / SEGUIMIENTO
```

Antes de modificar el modelo de hallazgos se debe inspeccionar su estructura actual y evitar agregar campos redundantes.

---

## 8. Dominio futuro de mediciones

La entidad central prevista es conceptualmente:

```
Measurement
```

Debe soportar como mínimo:

- identidad;
- organización/workspace;
- empresa;
- establecimiento;
- alcance contextual;
- tipo y versión de protocolo;
- estado;
- fecha de medición;
- profesional responsable;
- instrumentos utilizados;
- datos crudos;
- datos calculados;
- evaluación;
- referencia normativa utilizada;
- conclusiones;
- recomendaciones;
- validación profesional;
- documentos asociados;
- auditoría temporal.

Estados conceptuales a validar contra los patrones existentes:

```
DRAFT
IN_PROGRESS
COMPLETED
UNDER_REVIEW
VALIDATED
ACTION_REQUIRED
ARCHIVED
```

No introducir estos estados sin comprobar los patrones actuales de enumeraciones y máquinas de estado del repositorio.

---

## 9. Instrumental

Dominio futuro previsto:

- tipo de instrumento;
- fabricante;
- modelo;
- número de serie;
- propietario;
- disponibilidad;
- mantenimiento;
- calibración;
- certificados;
- historial de uso.

Estados conceptuales:

```
AVAILABLE
RESERVED
RENTED
IN_USE
MAINTENANCE
CALIBRATION_DUE
OUT_OF_SERVICE
RETIRED
```

La gestión comercial de alquiler no debe implementarse antes de consolidar el inventario técnico y su trazabilidad.

---

## 10. Base normativa

Separar dos conceptos:

### Biblioteca documental

Documentos, legislación, guías y material de consulta para búsqueda y asistencia de IA.

### Catálogo normativo estructurado

Debe permitir modelar:

- identificador;
- versión;
- vigencia;
- fuente oficial;
- protocolo;
- parámetros;
- reglas;
- referencias técnicas.

Una medición debe conservar la referencia/versionado utilizado en su evaluación para mantener trazabilidad histórica.

---

## 11. Deuda técnica identificada

### `db.ts`

Existe una concentración elevada de responsabilidades históricas. No continuar ampliándolo como servicio universal.

### Persistencia híbrida

Existen mecanismos que combinan almacenamiento local y sincronización. Para nuevos datos críticos, definir explícitamente la fuente de verdad.

### Gestión documental

Existen mecanismos de fallback local. Los protocolos e informes profesionales no deben quedar silenciosamente como si estuvieran confirmados en servidor cuando solo existen localmente.

### `App.tsx`

La navegación parece concentrada mediante coordinación de múltiples pantallas y estados. Evitar añadir cada protocolo como un nuevo bloque global; preferir que Higiene concentre su navegación interna.

---

## 12. Próxima fase de auditoría

Antes de modificar el dominio de mediciones, completar la lectura directa de:

1. `HygieneScreen` y sus componentes.
2. Modelos actuales de Company/Establishment/Sector/Position/Employee.
3. API multi-tenant existente.
4. Rutas backend relacionadas.
5. Modelo de inspecciones y hallazgos.
6. Patrones de autorización.
7. Persistencia Firestore de los dominios existentes.
8. Sistema actual de reportes y generación documental.

### Objetivo de esta fase

Determinar exactamente:

- qué ya está implementado;
- qué está incompleto;
- qué debe corregirse;
- qué puede reutilizarse;
- dónde integrar las mediciones sin duplicación.

---

## 13. Regla de trabajo

Después de cada fase relevante se debe actualizar este documento con:

- fecha;
- auditoría realizada;
- hallazgos;
- decisiones;
- archivos modificados;
- cambios realizados;
- pendientes;
- siguiente acción concreta.

### Formato del registro

```
## YYYY-MM-DD — Fase / avance

### Objetivo
...

### Hallazgos
...

### Decisiones
...

### Cambios realizados
...

### Archivos modificados
...

### Pendientes
...

### Próxima acción
...
```

---

# Registro de avances

## 2026-08-29 — Inicio de transformación y auditoría

### Objetivo

Determinar si Safety-v2 puede evolucionar hacia una plataforma integral de Higiene y Seguridad con mediciones instrumentales.

### Hallazgos

- La aplicación ya posee una base SaaS/multi-tenant.
- Existen organizaciones y controles de autorización.
- Existe un dominio de inspecciones y hallazgos.
- Existe gestión documental.
- Existe infraestructura de IA.
- Existen módulos empresariales y de Higiene.
- La aplicación no debe tratarse como un proyecto vacío ni duplicar sus dominios existentes.

### Decisiones

- Evolucionar Safety-v2 en lugar de crear una aplicación paralela.
- Reutilizar el dominio empresarial existente.
- Integrar mediciones dentro del área de Higiene.
- Mantener separación estricta entre motor técnico, catálogo normativo e IA.
- Registrar el estado técnico dentro del repositorio.

### Cambios realizados

- Se creó este documento de continuidad y dirección técnica.

### Pendientes

- Auditoría directa de HygieneScreen.
- Auditoría de modelos y servicios empresariales.
- Auditoría de inspecciones/hallazgos.
- Auditoría de rutas y autorización.
- Diseño final de la integración del dominio Measurement.

### Próxima acción

Completar la auditoría del módulo de Higiene y del flujo multi-tenant existente antes de implementar la primera modificación del dominio de mediciones.


## 2026-08-29 — Auditoría directa del módulo de Higiene

### Objetivo

Inspeccionar la implementación real de Higiene antes de crear nuevos dominios o duplicar funcionalidades.

### Hallazgos

- HygieneScreen ya existe y centraliza dos áreas: Mediciones e Instrumentos.
- MeasurementScreen lista mediciones por empresa activa mediante hygieneService.
- InstrumentScreen lista instrumentos por organización y muestra vencimiento de calibración.
- Los tipos existentes son HygieneMeasurement y HygieneInstrument.
- HygieneMeasurement es actualmente demasiado plano para protocolos profesionales: representa un único valor, límite y resultado.
- HygieneInstrument no tiene actualmente organización, tipo de instrumento, estado, mantenimiento ni historial de uso dentro de su modelo tipado.
- hygieneService persiste directamente en Firestore bajo organizaciones/{orgId}/hygieneMeasurements y organizaciones/{orgId}/hygieneInstruments.
- El servicio obtiene la organización directamente desde localStorage, en lugar de reutilizar de forma consistente tenantApi o el contexto de tenant.
- El servicio no conserva explícitamente en el modelo de medición organizationId, creador, timestamps, estado del ciclo de vida ni versión normativa.
- El filtrado actual de mediciones por empresa se realiza en la consulta, pero el modelo todavía no implementa la estructura completa de autorización y trazabilidad requerida para datos profesionales.
- La interfaz de instrumentos contiene un botón de creación y acciones de certificado que actualmente son principalmente UI; la funcionalidad completa de alta y gestión todavía debe consolidarse.
- El sistema de reportes contiene generación de documentos con datos simulados para una demostración existente. Esa estrategia no debe reutilizarse para protocolos técnicos reales.

### Decisiones

- No crear un segundo módulo de Higiene: se evolucionará el módulo existente.
- No reemplazar de golpe HygieneMeasurement; se planificará una migración compatible o una nueva entidad versionada para evitar romper pantallas existentes.
- El primer objetivo técnico será endurecer el contexto organizacional y la trazabilidad del servicio de Higiene.
- La futura medición profesional tendrá estructura contextual, protocolo, instrumentos, datos crudos, cálculo, evaluación y revisión profesional.
- Los cálculos y criterios normativos deberán permanecer fuera de los componentes React y fuera del renderizador PDF.
- Los protocolos técnicos reales no utilizarán datos mock como fuente de resultados.

### Archivos auditados

- src/components/Console/Hygiene/HygieneScreen.tsx
- src/components/Console/Hygiene/MeasurementScreen.tsx
- src/components/Console/Hygiene/InstrumentScreen.tsx
- src/services/hygieneService.ts
- src/types/safety.ts
- src/services/inspectionService.ts
- src/services/tenantApi.ts
- src/components/Console/Reports/ReportsScreen.tsx
- src/App.tsx

### Pendientes

- Auditar rutas backend y reglas de Firestore específicas de Higiene.
- Auditar el modelo exacto de autorización de membresías y asignación de empresas para reutilizarlo en Higiene.
- Diseñar la migración desde HygieneMeasurement hacia un modelo profesional versionado.
- Definir la primera implementación funcional: Iluminación, Ruido o Puesta a Tierra.
- Sustituir la dependencia directa de localStorage del servicio de Higiene por una fuente de contexto consistente.

### Próxima acción

Auditar el backend y las reglas de seguridad aplicables a Higiene y, con ese patrón confirmado, corregir primero la capa de persistencia y contexto antes de ampliar la interfaz.


## 2026-08-29 — Implementación: permisos RBAC para Higiene

### Cambio realizado

Se incorporó el dominio de permisos de Higiene al núcleo central de autorización:

- hygiene:read
- hygiene:create
- hygiene:update

### Matriz aplicada

- owner: lectura, creación y actualización.
- admin: lectura, creación y actualización.
- member: lectura, creación y actualización.
- auditor: solo lectura.
- platform_admin: mantiene acceso total por la regla existente de plataforma.

### Decisión de seguridad

No se agregó hygiene:delete. Las mediciones profesionales requieren trazabilidad y la eliminación física no será el mecanismo inicial de ciclo de vida. La futura evolución utilizará estados, cancelación o archivado según el dominio.

### Commit

- d311a299b30894e66c2f2fcd87245c9121cc5f82 — feat(auth): add hygiene domain permissions

### Próxima implementación

Crear schemas estrictos de validación para instrumentos y para el contexto común de una medición, reutilizando Zod y el patrón de rutas API v2 existente. Después se implementará hygieneRoutes y la persistencia mediante Firebase Admin.


## 2026-08-29 — Implementación: validación estricta de API para Higiene

### Cambio realizado

Se agregaron schemas Zod estrictos al núcleo de validación del backend:

- hygieneMeasurementContextSchema
- createHygieneInstrumentSchema
- updateHygieneInstrumentSchema
- createHygieneMeasurementSchema
- updateHygieneMeasurementSchema

También se definieron enums controlados para:

- estado de medición;
- estado de instrumento;
- categoría de instrumento.

### Estados de medición

- draft
- in_progress
- pending_review
- validated
- closed
- cancelled
- archived

### Decisiones

- Los schemas usan strict() para rechazar campos inesperados.
- Los IDs y strings técnicos tienen límites explícitos.
- rawData queda como contenedor temporal controlado por protocolo, pero los protocolos concretos reemplazarán progresivamente esa entrada genérica por schemas especializados.
- La creación exige al menos un instrumento.
- El contexto exige empresa y establecimiento; sector, puesto y empleado permanecen opcionales según el tipo de medición.

### Commit

- 4469ef8259bcf6ba617480495fa3b002353186e6 — feat(hygiene): add strict API validation schemas

### Próxima acción

Implementar el servicio backend de Higiene con Firebase Admin, trazabilidad y aislamiento por organizationId. Luego crear hygieneRoutes reutilizando requireAuth, requireTenantContext, requirePermission y los guards jerárquicos existentes.


## 2026-08-29 — Implementación: servicio backend multi-tenant de Higiene

### Cambio realizado

Se creó `server/services/hygieneService.ts`.

El servicio implementa persistencia server-side para instrumentos y mediciones mediante Firebase Admin, reemplazando progresivamente el acceso directo desde el frontend.

### Recursos

- hygieneInstruments
- hygieneMeasurements

### Garantías implementadas

- Todas las lecturas se filtran por `orgId`.
- Las búsquedas individuales fallan cerradas cuando el documento pertenece a otro tenant.
- Las actualizaciones se realizan dentro de transacciones.
- `id`, `orgId`, `createdBy` y `createdAt` permanecen inmutables.
- El servidor mantiene trazabilidad mediante `createdBy`, `updatedBy`, `createdAt` y `updatedAt`.
- Las mediciones preservan su contexto jerárquico durante una actualización.
- Los instrumentos y mediciones incorporan `active` para permitir ciclos de vida sin borrado físico inicial.

### Colecciones

Por el momento se utiliza una colección de nivel raíz con aislamiento obligatorio por `orgId`, alineada con el patrón moderno existente de companies, establishments y employees.

### Commit

- 0b6a067d1778176bfb90daf7cc8888c11340f06a — feat(hygiene): add tenant-isolated backend service

### Próxima acción

Implementar `server/routes/hygieneRoutes.ts` con autenticación, tenant context, permisos y validación jerárquica de company/establishment antes de crear o exponer mediciones.


## 2026-08-29 — Implementación: API protegida y validación jerárquica de Higiene

### Cambio realizado

Se creó `server/routes/hygieneRoutes.ts` y se registró en `server.ts` bajo:

- /api/v2/hygiene

### Endpoints iniciales

Instrumentos:

- GET /instruments
- GET /instruments/:id
- POST /instruments
- PATCH /instruments/:id

Mediciones:

- GET /measurements
- GET /measurements/:id
- POST /measurements
- PATCH /measurements/:id

### Seguridad aplicada

Todas las rutas utilizan:

- requireAuth
- requireTenantContext
- requirePermission
- aislamiento por orgId

La creación de mediciones verifica la jerarquía real:

Organization -> Company -> Establishment -> Sector? -> Position? -> Employee?

También se valida que cada instrumento pertenezca al tenant y no esté retirado ni fuera de servicio antes de asociarlo a una medición.

### Commits

- 35d94cfd1ada67afc24128ab8039ff986c629712 — feat(hygiene): add protected API routes and hierarchy validation
- 8995fe61fe77c065bd8b70788a781eb3e99b9dba — feat(hygiene): register protected v2 hygiene routes

### Próxima acción

Auditar y corregir el cliente `src/services/hygieneService.ts` para migrarlo de acceso directo a Firestore/localStorage hacia la nueva API. Después se evolucionará la UI para trabajar con el modelo multi-tenant.


## 2026-08-29 — Implementación: migración del cliente de Higiene a API protegida

### Cambio realizado

Se refactorizó `src/services/hygieneService.ts`.

Se eliminó de este servicio el acceso directo del frontend a:

- Firestore client SDK;
- colecciones organizations/{orgId}/hygieneMeasurements;
- colecciones organizations/{orgId}/hygieneInstruments;
- auditService del cliente;
- lectura del tenant desde localStorage como fuente de autoridad.

El servicio ahora utiliza:

- Firebase Auth para obtener el ID token del usuario autenticado;
- Authorization Bearer;
- /api/v2/hygiene;
- tenant context resuelto por el backend.

### Compatibilidad temporal

Las interfaces UI existentes `HygieneMeasurement` y `HygieneInstrument` siguen siendo utilizadas mediante adaptadores de API. Esto permite migrar la persistencia sin romper inmediatamente las pantallas legacy.

### Deuda técnica identificada

Los tipos de frontend son más pobres que el modelo backend. La siguiente evolución debe reemplazar los adaptadores legacy por DTOs profesionales compartidos o tipos de dominio del cliente.

### Commit

- a9e99ea47841733527382bc47a2e0f6ed087a882 — refactor(hygiene): migrate frontend service to protected v2 API

### Próxima acción

Auditar todas las pantallas y componentes que consumen hygieneService. Identificar dependencias del modelo legacy y evolucionar primero los tipos del frontend, evitando que category, instrumentType, status, lifecycle y trazabilidad permanezcan ocultos detrás de adaptadores temporales.

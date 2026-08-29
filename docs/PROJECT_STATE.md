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


## 2026-08-29 — Implementación: eliminación del modelo legacy de Higiene en frontend

### Cambio realizado

Se evolucionó `src/types/safety.ts` para reemplazar los tipos legacy de instrumentos y mediciones por el modelo de dominio alineado con la API V2.

Se agregaron:

- HygieneInstrumentCategory
- HygieneInstrumentStatus
- HygieneMeasurementStatus
- HygieneMeasurementContext
- CreateHygieneInstrumentInput
- CreateHygieneMeasurementInput

El modelo actual conserva explícitamente:

- contexto jerárquico;
- múltiples instrumentos;
- estado de ciclo de vida;
- active;
- notas y datos crudos por protocolo;
- trazabilidad de creación y actualización.

### Servicio cliente

Se eliminaron los adaptadores `toLegacyInstrument` y `toLegacyMeasurement` de `src/services/hygieneService.ts`.

El cliente ahora consume y devuelve directamente el modelo de dominio de Higiene y agrega operaciones GET individual y PATCH para instrumentos y mediciones.

### Commits

- d092b3a99be80d777d276ae4faceb68014d5a3b2 — refactor(hygiene): replace legacy frontend domain types
- 9ca0595ac2412dd3c12302584203f08fb33b3b89 — refactor(hygiene): remove legacy API adapters and expose domain model

### Próxima acción

Auditar las pantallas que dependían de los campos legacy. Corregir consumidores para usar context, protocolType, measurementDate e instrumentIds. La prioridad es localizar todas las referencias reales antes de modificar componentes, para evitar introducir compatibilidad falsa.


## 2026-08-29 — Implementación: corrección de consumidores UI del dominio de Higiene

### Hallazgo

Las pantallas reales del módulo están en:

- src/components/Console/Hygiene/InstrumentScreen.tsx
- src/components/Console/Hygiene/MeasurementScreen.tsx

Ambas seguían consumiendo campos del modelo legacy, por lo que la migración previa de tipos habría dejado incompatibilidades de compilación y semántica.

### Correcciones realizadas

InstrumentScreen ahora utiliza:

- category;
- instrumentType;
- status;
- active;
- calibrationDate/calibrationExpiry opcionales.

Se corrigió la evaluación de disponibilidad: un instrumento no se considera disponible solamente por tener un objeto existente; también se considera su lifecycle y vencimiento.

MeasurementScreen ahora utiliza:

- measurementDate;
- protocolType;
- context.companyId;
- context.establishmentId;
- instrumentIds;
- status;
- notes.

Se eliminó la presentación de campos legacy que ya no pertenecen a la entidad general, como agent, value, applicableLimit, result, professionalName y reportUrl.

### Commits

- 780800b07a1f8c507f8ba762b521c74b4229d890 — refactor(hygiene): align instrument screen with domain lifecycle
- 903ba7338b1fe98d8925c8cc29a76e807d2cf8f6 — refactor(hygiene): align measurement screen with v2 domain model

### Estado de la migración

La lectura UI de instrumentos y mediciones ya está alineada con el dominio V2. Las acciones de alta siguen siendo el siguiente punto pendiente: los botones visuales no deben considerarse funcionalidad implementada hasta tener formularios conectados a los endpoints POST.

### Próxima acción

Implementar la primera capa de alta profesional: formulario de instrumento conectado al POST protegido. Después construir el flujo de creación de medición como wizard jerárquico y por protocolo.


## 2026-08-29 — Implementación: alta completa de instrumentos desde UI

### Cambio realizado

Se conectó el botón “Nuevo Equipo” de InstrumentScreen al flujo real de creación.

El flujo implementado es:

UI → validación cliente → CreateHygieneInstrumentInput → hygieneService.addInstrument → POST /api/v2/hygiene/instruments → backend → persistencia → recarga de listado.

### Campos implementados

- categoría;
- tipo de instrumento;
- marca;
- modelo;
- número de serie;
- estado;
- fecha de calibración;
- vencimiento de calibración;
- URL de certificado;
- observaciones.

### Decisiones de arquitectura

- organizationId no se solicita en el formulario: el tenant debe ser resuelto por el backend;
- las fechas vacías se envían como undefined y no como strings vacíos;
- los errores de API se muestran al usuario;
- luego de crear correctamente se recarga el inventario desde la fuente de verdad.

### Commit

- 59c4d36a431ee156d347b1319542c8bb9da4a2b1 — feat(hygiene): add instrument creation workflow

### Próxima acción

Construir el flujo de alta de mediciones. Debe ser un wizard guiado y no un formulario plano. La primera etapa debe seleccionar contexto organizacional y protocolo; después instrumentos; finalmente datos específicos del protocolo.


## 2026-08-29 — Implementación: wizard jerárquico para alta de mediciones

### Cambio realizado

MeasurementScreen ahora contiene un flujo de creación en cuatro etapas:

1. contexto organizacional;
2. protocolo y fecha;
3. instrumentos;
4. resumen y creación.

### Contexto

La medición utiliza el TenantContext existente para seleccionar entidades ya pertenecientes al tenant:

- empresa activa;
- establecimiento;
- sector opcional;
- puesto opcional;
- trabajador opcional.

No se permite crear una medición sin empresa activa ni establecimiento.

### Instrumentos

El wizard permite múltiples instrumentos y consume el inventario de la API. Inicialmente presenta instrumentos activos con status active. La validación definitiva de disponibilidad y calibración debe seguir perteneciendo al backend.

### Resultado

El submit construye CreateHygieneMeasurementInput y utiliza POST /api/v2/hygiene/measurements. Al finalizar, vuelve a consultar la fuente de verdad.

### Alcance intencional

Este wizard crea la entidad base de medición. Todavía no captura los datos técnicos específicos de cada protocolo. Esa separación es deliberada para evitar convertir la entidad general en un formulario de ruido/iluminación/puesta a tierra mezclado.

### Commit

- 3aff6a8d327818ae53027f510828017fbf07369d — feat(hygiene): add hierarchical measurement creation wizard

### Próxima acción

Auditar y formalizar el catálogo de protocolos. La primera implementación específica debe ser Iluminación, con un modelo tipado para puntos de medición y datos de evaluación, antes de implementar cálculos o generación documental.


## 2026-08-29 — Implementación: dominio específico del protocolo de Iluminación

### Principio aplicado

Se separó explícitamente:

1. entidad general de medición;
2. datos específicos del protocolo;
3. cálculos determinísticos;
4. evaluación normativa/profesional.

### Tipos incorporados

En src/types/safety.ts se agregaron:

- HygieneProtocolType;
- LightingSourceType;
- LightingPointType;
- LightingMeasurementPoint;
- LightingMeasurementData;
- CreateLightingMeasurementData;
- HygieneProtocolEvaluation.

### Motor de cálculo

Se creó src/services/lightingMeasurement.ts.

El motor calcula únicamente propiedades matemáticas derivadas de los valores cargados:

- promedio de lux;
- mínimo;
- máximo;
- relación mínimo/máximo.

No determina cumplimiento legal ni reemplaza la evaluación profesional.

### Persistencia

Se agregó hygieneService.saveLightingData(), que persiste los datos tipados bajo rawData.lighting mediante el PATCH existente de la medición.

### Decisión normativa

No se codificaron valores legales ni umbrales de cumplimiento sin una base normativa oficial versionada. Antes de automatizar la evaluación de cumplimiento se debe diseñar el catálogo normativo con referencia, versión, vigencia y fuente documental.

### Commits

- eb9adaa2c461e09a46c3c4f0f1a690b0bfe1e160 — feat(hygiene): add typed lighting protocol domain
- 00dbf230e96279e64f78460dfb74ee40b77bd34f — feat(hygiene): add deterministic lighting calculations
- 6ab8afa45d311ac1b707b28da405bbc3a3700b18 — feat(hygiene): support typed lighting data persistence

### Próxima acción

Construir el editor UI de Iluminación asociado a una medición existente y luego incorporar un catálogo normativo versionado antes de producir cualquier resultado de cumplimiento.


## 2026-08-29 — Implementación: editor visual de Iluminación

### Cambio realizado

Se agregó LightingMeasurementEditor y se conectó a las mediciones existentes cuyo protocolType es lighting.

### Flujo

Medición de Iluminación → Editar → carga técnica → cálculo descriptivo en pantalla → guardar → PATCH de la medición → recarga desde API.

### Datos editables

- tipo de iluminación;
- sistema de iluminación;
- descripción de tarea;
- puntos de medición dinámicos;
- tipo de cada punto;
- valor en lux;
- descripción de ubicación.

### Vista previa

El editor usa calculateLightingMeasurement() para mostrar promedio, mínimo, máximo y relación mínimo/máximo antes del guardado.

### Principio mantenido

Los indicadores son descriptivos. No se declara cumplimiento normativo automáticamente y no se reemplaza la validación profesional.

### Commits

- 1ad087c54896b4f85d5ff84761874505f3003d23 — feat(hygiene): add lighting measurement editor
- e09a663362126c5b0ec9c600d65e79b9bde19319 — feat(hygiene): connect lighting editor to measurements

### Próxima acción

Diseñar el catálogo normativo versionado como fuente independiente de verdad. Debe soportar protocolo, referencia, versión, vigencia, fuente oficial, valores aplicables y trazabilidad histórica de la evaluación.


## 2026-08-29 — Implementación: base del catálogo normativo versionado

### Problema resuelto

La evaluación de una medición no debe depender de valores normativos hardcodeados dentro del formulario ni cambiar retroactivamente cuando se actualice una norma.

### Dominio incorporado

Se agregaron:

- NormativeRecordStatus;
- NormativeSource;
- NormativeCriterion;
- NormativeProtocolVersion;
- NormativeEvaluationSnapshot.

Cada versión normativa identifica protocolo, referencia, versión, estado, vigencia, fuente oficial y criterios estructurados.

### Servicios incorporados

src/services/normativeCatalog.ts contiene:

- resolveActiveNormativeVersion(): selecciona una versión activa aplicable a una fecha determinada;
- createNormativeEvaluationSnapshot(): congela los criterios utilizados en una evaluación.

### Decisión crítica de trazabilidad

Una evaluación debe almacenar un snapshot de los criterios utilizados. Nunca debe recalcularse automáticamente una medición histórica con una norma modificada sin decisión explícita y nueva evaluación.

### Estado actual

El dominio y la lógica pura del catálogo están implementados en frontend. La siguiente etapa debe definir la persistencia y administración del catálogo como fuente de verdad de backend, con autorización restringida para cambios normativos.

### Commits

- 541801a493de8d80682b7e2f5bc0ffb5cf2c08db — feat(normative): add versioned normative catalog domain
- 74632e8a3f3d0af5ca61e96bf18a166df9860bfa — feat(normative): add normative version resolver and snapshots

### Próxima acción

Auditar la ruta backend existente de higiene y agregar la persistencia del catálogo normativo sin mezclarlo con documentos personales ni permitir que usuarios comunes modifiquen referencias oficiales.


## 2026-08-29 — Implementación: catálogo normativo persistente en backend

### Auditoría realizada

Se verificó la arquitectura real de backend. El servidor Express registra hygieneRoutes bajo /api/v2/hygiene y las mediciones se persisten en Firestore mediante el servicio server/services/hygieneService.ts.

### Cambio realizado

Se creó server/services/normativeCatalogService.ts como servicio de persistencia independiente en la colección Firestore normativeProtocolVersions.

### API incorporada

Se creó server/routes/normativeCatalogRoutes.ts y se registró en server.ts bajo:

- GET /api/v2/normative-catalog/protocols
- GET /api/v2/normative-catalog/protocols/:id

La lectura exige autenticación, contexto de tenant y permiso hygiene:read.

### Decisión de seguridad

Las rutas de escritura no se expusieron todavía. La modificación de referencias normativas oficiales requiere un modelo explícito de autorización administrativa y gobernanza documental; no se reutilizará indiscriminadamente el permiso operativo de creación de mediciones.

### Observación de arquitectura

El catálogo normativo es global como fuente de conocimiento. No se almacenó por orgId para evitar que cada tenant pueda crear una "norma propia". La evaluación de cada tenant debe conservar su snapshot de la versión utilizada.

### Commits

- 965e263d9d385bc0e1fd840332dae0829f49d18f — feat(normative): add Firestore catalog persistence service
- dat2b7aab3b32997328684f5a5d01cf9b6 — feat(normative): add read-only normative catalog routes
- cefa8bf46e2a9274836941edd5bb5d57a0e9bb66 — feat(normative): register normative catalog API

### Próxima acción

Conectar la medición con una versión normativa concreta mediante un snapshot inmutable de evaluación. Antes, revisar los permisos disponibles para definir la administración del catálogo y evitar introducir una vía de modificación no autorizada.


## 2026-08-29 — Implementación: snapshot normativo inmutable asociado a mediciones

### Cambio de modelo

HygieneMeasurementRecord y HygieneMeasurement ahora pueden conservar normativeEvaluationSnapshot. El snapshot guarda el identificador de la versión normativa, referencia, versión, fecha de evaluación y copia completa de los criterios utilizados.

### Endpoint incorporado

POST /api/v2/hygiene/measurements/:id/normative-snapshot

Entrada:
- normativeProtocolVersionId

El backend verifica:

1. que la medición exista dentro de la organización;
2. que la versión normativa exista;
3. que el protocolType de la versión coincida con el protocolType de la medición.

### Inmutabilidad histórica

El endpoint copia los criterios desde el catálogo hacia la medición. La medición no depende de consultar el estado actual del catálogo para reconstruir una evaluación histórica.

### Estado actual

Ya existe la infraestructura para asociar una versión normativa con una medición. Todavía falta definir una política explícita de bloqueo una vez validada/cerrada y construir la evaluación asistida que produzca un resultado profesionalmente revisable a partir del snapshot.

### Commits

- b52b019a11319bf8d24ef201c1d2c6e1e88014de — feat(normative): persist immutable evaluation snapshot on measurements
- 2762469b5a55b489f5e17e1fcc9f03a5f137afd8 — feat(normative): attach catalog snapshot to measurement
- 15f98485fc5b84adfb1a206e968645cfc971db3c — feat(normative): expose measurement evaluation snapshot type

### Próxima acción

Agregar una capa de evaluación asistida para Iluminación que utilice exclusivamente el snapshot normativo asociado a la medición y produzca un resultado técnico informativo, dejando la conclusión definitiva bajo revisión profesional.


## 2026-08-29 — Implementación: motor de evaluación asistida de Iluminación

### Cambio realizado

Se creó src/services/lightingEvaluation.ts. El motor recibe exclusivamente LightingMeasurementData y NormativeEvaluationSnapshot, evitando consultar valores normativos directamente desde el catálogo durante la reconstrucción de una evaluación histórica.

### Resultado actual

La evaluación produce un resumen de indicadores calculados, observaciones por criterio estructurado y el estado requires_professional_review. No genera automáticamente CUMPLE o NO CUMPLE.

### Integración visual

LightingMeasurementEditor ahora puede mostrar una evaluación asistida cuando la medición posee normativeEvaluationSnapshot. Si todavía no hay snapshot, informa que primero debe asociarse una versión normativa.

### Principio de seguridad profesional

El motor describe y relaciona los datos con los criterios disponibles. La conclusión normativa definitiva permanece pendiente de revisión y validación profesional.

### Commits

- 4c13e724af5d48a19b0e01171e90d52295ef21fd — feat(hygiene): add assisted lighting evaluation engine
- befc805acd0dbc714c8a352c9b1b89cde83b8013 — feat(hygiene): show assisted lighting evaluation from snapshot

### Próxima acción

Persistir la evaluación asistida como resultado trazable separado del snapshot y definir el flujo de estados draft → in_progress → pending_review → validated/closed, incluyendo el bloqueo de información crítica después de una validación profesional.


## 2026-08-29 — Implementación: ciclo de vida y revisión profesional de mediciones

### Ciclo controlado

El backend ahora valida transiciones de estado: draft → in_progress → pending_review → validated → closed, con transiciones de corrección/cancelación explícitas. Se eliminó la posibilidad de saltar arbitrariamente entre estados.

### Revisión profesional

Se incorporó POST /api/v2/hygiene/measurements/:id/review. Una medición solo puede ser revisada desde pending_review. La aprobación la lleva a validated; la solicitud de cambios la devuelve a in_progress y registra decisión, revisor, fecha y comentarios.

### Inmutabilidad

validated y closed son estados bloqueados para modificaciones ordinarias. updateMeasurement rechaza cambios distintos del cambio de estado permitido desde validated hacia closed. Esto protege rawData, instrumentos, snapshot normativo y demás información técnica contra modificaciones posteriores silenciosas.

### Commits

- 075072f3405ae2be0ac43e69765652498006f682 — feat(hygiene): enforce measurement lifecycle and immutable validated records
- 7509b1303abd68905d33e04171e00c0e997f4682 — feat(hygiene): add professional measurement review workflow

### Próxima acción

Corregir la semántica del estado archived/cancelled y construir un registro de eventos/auditoría de cambios. El siguiente objetivo es que cada transición crítica quede registrada independientemente del estado actual de la medición.


## 2026-08-29 — Implementación: auditoría histórica de mediciones

### Infraestructura

Se creó server/services/hygieneAuditService.ts con persistencia independiente en hygieneMeasurementAuditEvents. Cada evento incluye organización, medición, actor, tipo, fecha, transición de estado opcional y metadatos.

### API

Se agregó GET /api/v2/hygiene/measurements/:id/audit-events. La consulta valida primero que la medición pertenezca a la organización del contexto autenticado.

### Eventos integrados inicialmente

- normative_snapshot_attached
- review_approved
- changes_requested

Las revisiones ahora conservan su transición de estado en el historial. La asociación de una versión normativa también queda registrada con referencia y versión.

### Observación pendiente

La auditoría todavía no está centralizada dentro del servicio transaccional. Las rutas de creación, actualización y transición general deben migrarse a un mecanismo común para que ningún evento crítico dependa de que un controlador recuerde registrarlo manualmente.

### Commits

- 29bb7aed1a594a7460b6e4af73a6710a5ca5848f — feat(audit): add hygiene measurement event persistence
- e4b39646cbd6fc32ff19d3014b7cd2e3be5f3b22 — feat(audit): expose measurement history and record reviews
- 073a4e509cbbaf8ae52415760618edaa13f1813f — feat(audit): record normative snapshot attachment events

### Próxima acción

Completar la auditoría desde las operaciones centrales de medición y evitar registros duplicados. Luego implementar una vista de historial para que el profesional pueda ver la secuencia documental de una medición.


## 2026-08-29 — Refactor: operaciones centrales de mediciones y auditoría

### Problema corregido

La creación y actualización de mediciones estaban repartidas entre rutas y servicio base. Esto permitía que una operación modificara Firestore sin registrar el evento histórico correspondiente.

### Nueva capa

Se creó server/services/hygieneMeasurementWorkflowService.ts.

La capa centraliza createMeasurementWithAudit y updateMeasurementWithAudit. Cada operación obtiene el estado anterior, ejecuta la modificación mediante hygieneService y registra el evento de auditoría con actor, transición y campos modificados.

### Rutas migradas

- creación de medición
- actualización general
- asociación de snapshot normativo
- revisión profesional

### Clasificación automática inicial

El workflow identifica created, updated, normative_snapshot_attached, submitted_for_review, validated, closed, cancelled y archived según la operación y transición.

### Deuda técnica detectada

La revisión profesional todavía añade un evento semántico específico review_approved o changes_requested además del evento general de transición generado por el workflow. La siguiente consolidación debe evitar duplicados innecesarios y permitir un único evento rico por operación.

### Commits

- 7dda53ad5a57af4927e7b020229831aed5906525 — refactor(audit): centralize measurement mutations with audit events
- 97bbd1ee104630fce9a7d45538aa7e612b71b42a — refactor(hygiene): route measurement mutations through audited workflow
- 944353f365e56e6b4fc8f135cd850a675ff6a438 — fix(audit): classify normative snapshot workflow events

### Próxima acción

Consolidar eventos de revisión para producir una única entrada semántica por operación y construir el modelo de historial visual en frontend.


## 2026-08-29 — Implementación: eventos semánticos únicos e historial visual

### Consolidación de auditoría

updateMeasurementWithAudit ahora acepta un contexto de auditoría que permite definir el tipo semántico del evento y metadatos adicionales. La revisión profesional usa esta capacidad para producir review_approved o changes_requested como una única entrada de auditoría, evitando la duplicación del evento genérico de transición.

### Frontend

Se creó src/services/hygieneAuditService.ts y src/components/Console/Hygiene/MeasurementAuditTimeline.tsx. El timeline consulta el historial protegido por organización y presenta etiqueta humana, fecha, transición de estado y comentarios disponibles.

### Integración

El editor de Iluminación ahora contiene una sección desplegable Historial documental. Esto permite ver la secuencia de eventos sin abandonar la medición.

### Commits

- 9eab8b404220d45f1cac19099933748a658e6b9a — refactor(audit): support semantic events in measurement workflow
- 7e4f20a614acb9c91a4459f406402b85ed146513 — fix(audit): emit one semantic event for professional reviews
- d81f6559f9bc125f06aad1833ad1dd1309247599 — feat(hygiene): add frontend audit history service
- be454b33d8e794efdf7bff8e19fca31b86ea7f2e — feat(hygiene): add measurement audit timeline component
- 39eb3d5a4e997ec368cf418acc0bf66dac6a9074 — feat(hygiene): expose audit history in lighting editor

### Próxima acción

Extender la misma infraestructura de historial a la pantalla general de mediciones y separar la acción de enviar a revisión de la edición ordinaria, de forma que el paso hacia pending_review tenga una interfaz y validaciones explícitas.


## 2026-08-29 — Implementación: envío formal a revisión y validaciones previas

### Acción explícita

Se agregó POST /api/v2/hygiene/measurements/:id/submit-for-review. La transición hacia pending_review dejó de ser un cambio de estado ordinario y ahora representa una operación profesional explícita.

### Validaciones de envío

La nueva capa server/services/hygieneSubmissionService.ts verifica empresa, establecimiento, instrumento asociado, snapshot normativo y datos técnicos. Para Iluminación verifica además la existencia de puntos de medición, respetando la estructura real rawData.lighting.points y la forma plana como compatibilidad.

### Restricción de estado

Solo una medición en in_progress puede enviarse a revisión. Los errores devuelven códigos específicos y la lista de requisitos pendientes.

### Auditoría

Un envío exitoso genera submitted_for_review mediante el workflow centralizado y registra que las validaciones fueron superadas.

### Frontend

hygieneService incorpora submitForReview(id), preparado para que el editor muestre una acción separada de la edición ordinaria.

### Commits

- 21fe796d8e73bd56bf75a53098436133f0c1eb39 — feat(hygiene): add explicit measurement submission validation
- 03cb2e8f7072511a6d950e3905f9e27742f9c7f2 — feat(hygiene): add explicit validated submission to professional review
- 507cac9835cc97b8af5dc285523c7581bc79df62 — fix(hygiene): validate nested lighting measurement points on submission
- 9ffafac12a97ded4b8385647cc3533248347b8d5 — feat(hygiene): add frontend submit for review action

### Próxima acción

Integrar el botón y estado de envío formal en el editor de Iluminación, mostrando requisitos pendientes de manera visible. Después avanzar hacia la revisión visual profesional y la generación documental, sin declarar aún cumplimiento legal automático.


## 2026-08-29 — Implementación: panel visual de preparación para revisión

### Editor de Iluminación

Se agregó un panel Estado documental al editor. El panel muestra el estado actual y, mientras la medición está en in_progress, verifica visualmente empresa, establecimiento, instrumento, normativa y puntos de medición.

### Acción explícita

El botón Enviar a revisión utiliza hygieneService.submitForReview y queda deshabilitado mientras existan requisitos pendientes. El backend continúa siendo la autoridad final de validación; la lista visual es una ayuda de preparación y no sustituye la validación del servidor.

### Estados posteriores

El editor informa cuando una medición está pending_review o validated, evitando presentar el envío como una operación disponible en esos estados.

### Commit

- a775d946964f2c40feba5d5b9d2077a4d13ce75d — feat(hygiene): add explicit submission readiness panel to lighting editor

### Próxima acción

Auditar la revisión profesional existente y convertirla en una interfaz dedicada para el revisor, con contexto de empresa, datos técnicos, normativa, evaluación asistida e historial antes de aprobar o solicitar cambios.


## 2026-08-29 — Implementación: interfaz dedicada de revisión profesional

### Auditoría de la revisión existente

La API de revisión ya imponía pending_review como estado previo y registraba decisiones semánticas. Se completó la capa frontend para evitar que la decisión quede expuesta como una operación aislada.

### Nueva interfaz

Se creó src/components/Console/Hygiene/ProfessionalMeasurementReview.tsx. Para una medición pendiente de revisión, la pantalla presenta contexto de empresa y establecimiento, protocolo, fecha, cantidad de instrumentos, snapshot normativo, evaluación asistida cuando corresponde, comentarios e historial documental.

### Decisiones

- Aprobar revisión → validated y evento review_approved.
- Solicitar cambios → in_progress y evento changes_requested.

Solicitar cambios exige un comentario en frontend. El backend conserva la validación de estado como autoridad.

### Integración

LightingMeasurementEditor redirige visualmente una medición pending_review al componente de revisión profesional, evitando editar datos técnicos mientras se encuentra en ese estado.

### Commits

- dd693bfeef05ff3ec879601527d5de224b15c73e — feat(hygiene): expose professional review action to frontend
- 82a62efec6c34a9268ee985ccfeefc0577c23d34 — feat(hygiene): add dedicated professional measurement review component
- 9cdaaa3939d13a8480e7160b267b26e4a992f0ac — feat(hygiene): route pending lighting measurements to professional review view

### Próxima acción

Fortalecer el backend de revisión: exigir comentarios para changes_requested y evaluar permisos/roles específicos de revisor en lugar de reutilizar únicamente hygiene:update. Luego comenzar la capa de documento/protocolo final a partir de mediciones validadas.


## 2026-08-29 — Endurecimiento de revisión: validación de comentarios en servidor

La solicitud de cambios ya no depende de la interfaz para exigir fundamento. POST /measurements/:id/review ahora normaliza comments y rechaza changes_requested sin texto mediante REVIEW_COMMENTS_REQUIRED.

Esto mantiene la regla de seguridad: las restricciones críticas deben aplicarse en el servidor aunque exista validación equivalente en el frontend.

### Auditoría de permisos

Se confirmó que la ruta sigue utilizando requirePermission("hygiene:update"). La separación hacia un permiso hygiene:review requiere una modificación coordinada del catálogo/servicio real de permisos y de las asignaciones de rol existentes. No se introdujo un permiso inexistente de manera aislada para evitar bloquear usuarios o crear una autorización inconsistente. Esta separación queda como próximo cambio de autorización transversal.

### Commit

- 36143f3e66e28fb81b45520410fcf171f5de599a — fix(hygiene): require server-side comments when requesting changes

### Próxima acción

Auditar y modificar el sistema central de permisos para introducir higiene:review de manera compatible. Después, comenzar la arquitectura de documentos generados a partir de una medición validada, incluyendo snapshot de datos, versión de plantilla y trazabilidad, sin implementar todavía firma legal automática.


## 2026-08-29 — RBAC: separación efectiva entre edición y revisión profesional

### Hallazgo

El sistema central de autorización está concentrado en server/authorization/types.ts y utiliza un tipo Permission junto con MEMBERSHIP_ROLE_PERMISSIONS. La auditoría confirmó que hygiene:update era el único permiso de modificación para el dominio y que auditor solo tenía higiene:read.

### Cambio

Se incorporó hygiene:review al catálogo tipado de permisos. owner y admin reciben el permiso por administración global de la organización. El rol auditor recibe hygiene:review sin recibir hygiene:update, preservando separación entre capacidad de editar y capacidad de revisar.

La ruta POST /measurements/:id/review ahora exige requirePermission("hygiene:review").

### Modelo resultante

- Técnico/editor: higiene de lectura/creación/actualización según su rol, sin capacidad automática de revisión.
- Auditor/revisor: hygiene:read + hygiene:review, sin hygiene:update.
- Owner/admin: capacidades de administración y revisión.

La granularidad de un rol profesional de Higiene específico queda como futura evolución del modelo de membresías; no se introdujo un nuevo MembershipRole para evitar ampliar innecesariamente el alcance transversal actual.

### Commits

- dcc1b252c413f100ae182b46588bd9e2013f8826 — feat(auth): add dedicated hygiene review permission to RBAC matrix
- 09650b749d9730cd36a7e7f3504c4887dfa12b7f — fix(auth): protect hygiene review with dedicated permission

### Próxima acción

Diseñar e implementar el modelo de documento generado para mediciones validadas: entidad documental, snapshot de datos, referencia normativa, versión de plantilla, generación reproducible y trazabilidad. La generación no implicará certificación ni firma legal automática.


## 2026-08-29 — Arquitectura de documentos generados desde mediciones validadas

### Principio implementado

No se generó directamente un PDF mutable desde la medición. Se creó una entidad documental independiente que conserva una fotografía reproducible de la medición validada.

### Nuevo servicio

server/services/hygieneDocumentService.ts define HygieneGeneratedDocument con measurementId, protocolo, templateKey, templateVersion, generatedBy, generatedAt, estado documental y measurementSnapshot.

El snapshot conserva contexto jerárquico, fecha, instrumentos, datos técnicos, notas, snapshot normativo, resultado de revisión y estado de la medición al momento de la generación. La generación solo acepta mediciones validated.

### API

GET /measurements/:id/generated-documents requiere document:read.
POST /measurements/:id/generated-documents requiere document:create y rechaza mediciones que no estén validated con MEASUREMENT_NOT_VALIDATED.

La creación registra un evento documental en la auditoría de la medición, incluyendo documentId y versión de plantilla.

### Límites actuales

Esta fase crea la entidad documental y su snapshot, pero todavía no produce un PDF ni implementa firma electrónica o certificación legal automática. Es deliberado: primero se consolidó la trazabilidad y reproducibilidad de la fuente documental.

### Commits

- 8a2bb2ff3376945bc33cefebc66d43b4b6c06926 — feat(hygiene): add reproducible generated document snapshot service
- 4347ac0aaa868a0ad3004832b71a98d0b73f4b41 — feat(hygiene): add validated measurement document generation endpoints

### Próxima acción

Integrar la entidad generada al frontend y diseñar una representación documental específica para Iluminación. Después definir un renderizador de plantilla versionada y un formato de salida, manteniendo separados datos técnicos, contenido generado y cualquier futura firma profesional.


## 2026-08-29 — Integración visual de documentos generados

Se conectó la arquitectura documental con el frontend.

### Frontend API

src/services/hygieneService.ts ahora expone getGeneratedDocuments(id) y generateDocument(id, templateKey?, templateVersion?).

### Nuevo componente

src/components/Console/Hygiene/GeneratedDocumentsPanel.tsx muestra documentos existentes, versión de plantilla, fecha de generación, estado e identificador. La generación solo se ofrece visualmente cuando la medición está validated; el servidor mantiene la misma restricción como control autoritativo.

### Integración inicial

LightingMeasurementEditor muestra el panel cuando la medición está validated. Esto mantiene el flujo en una sola experiencia: captura -> revisión -> validación -> documento.

### Commits

- 65aae03588de4556398a04fc2a4b45eda5eaa4b3 — feat(hygiene): expose generated document API to frontend
- f9b8faa5dec0bf4f8cbf5d36ab7f758647d4063a — feat(hygiene): add generated documents frontend panel
- 33a578a0ab095b946a16ebcc2bdd6bdb2cbbf373 — feat(hygiene): surface generated documents in validated lighting workflow

### Próxima acción

Diseñar el contenido estructurado de la plantilla de Iluminación v1.0.0 y crear una representación reproducible del documento antes de elegir el motor de PDF. Debe incluir encabezado, identificación, contexto, instrumento, puntos, indicadores, referencia normativa, evaluación asistida y bloque explícito de revisión profesional.


## 2026-08-29 — Plantilla estructurada: Iluminación v1.0.0

Se incorporó una capa de representación documental independiente del almacenamiento y del futuro formato PDF.

### Principio

El documento generado conserva el snapshot. La representación interpreta ese snapshot mediante una plantilla identificada por templateKey/templateVersion. Esto permite cambiar el renderizador futuro sin recalcular ni consultar nuevamente la medición original.

### Iluminación

buildLightingDocumentRepresentation produce secciones estructuradas para: identificación documental, empresa/contexto, datos técnicos y puntos de medición, instrumentación, referencia normativa y evaluación, revisión profesional y trazabilidad.

Incluye un disclaimer explícito: el documento es apoyo técnico/documental y no reemplaza la interpretación, validación ni firma profesional competente.

### API

GET /generated-documents/:documentId/representation requiere document:read, verifica aislamiento por organización y actualmente soporta protocolo lighting.

### Frontend API

hygieneService.getDocumentRepresentation(documentId) permite consumir la representación desde la interfaz.

### Commits

- 001020d6d944f55924abf514e8f28b9f8e20db0b — feat(hygiene): add structured lighting document representation
- f0d1ba1b049f1845818f3de719c34ed167bc5f57 — feat(hygiene): add generated document lookup for safe rendering
- 7e8c2be63056f1965a1f8c6ef13f4302d3ce9c93 — feat(hygiene): expose structured lighting document representation
- 18b733b147f97768cceea828f850f2466a275882 — feat(hygiene): expose document representation to frontend

### Próxima acción

Crear el visor documental de Iluminación en frontend utilizando esta representación y separarlo del futuro exportador. Luego definir el adaptador PDF como una fase posterior sobre la misma representación.


## 2026-08-29 — Visor web de documentos de Iluminación

### Implementación

Se agregó src/components/Console/Hygiene/LightingDocumentViewer.tsx. El visor consume la representación estructurada desde el backend y la presenta en secciones legibles sin volver a consultar ni recalcular la medición original.

El visor incluye encabezado documental, versión de plantilla, fecha de generación, secciones de identificación/contexto/datos técnicos/instrumentación/normativa/revisión/trazabilidad y disclaimer profesional.

### Integración

GeneratedDocumentsPanel ahora ofrece acción Ver para documentos lighting y abre el visor como una capa modal. La selección utiliza el documentId, por lo que el contenido visual continúa derivando del snapshot almacenado.

### Commits

- d130b5f1fb607bfe475bc464529f22d1753d253b — feat(hygiene): add lighting document representation viewer
- 79bd87d6bc0ec2c74a9483b99ff9a798564bd102 — feat(hygiene): open lighting document viewer from generated documents

### Estado arquitectónico

La cadena completa de Iluminación ya alcanza: captura -> validación -> snapshot -> documento generado -> representación versionada -> visor web.

### Próxima acción

Auditar la estructura de datos específica de los puntos de Iluminación para reemplazar las claves técnicas genéricas del visor por etiquetas profesionales y tablas específicas. Luego definir un modelo de plantilla compartido para renderizadores web/PDF.

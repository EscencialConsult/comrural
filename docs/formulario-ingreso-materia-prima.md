# Formulario de Ingreso de Materia Prima — Segundo de la maqueta

**Registro P-ADM-03/R-02 · Ingreso de Materia Prima · Versión 05**
Segundo formulario digitalizado (el primero fue
[formulario-inspeccion-materia-prima.md](./formulario-inspeccion-materia-prima.md)).
Mismo criterio: pixel-perfect contra el papel real, section-aware, reusando
los átomos de `src/components/formularios/` que el primer formulario ya dejó
genéricos.

Fecha: 2026-08-20 · Proyecto: COMRURAL XXI — Software de Gestión (frontend)

---

## 1. Qué es

La versión en pantalla del formulario que Almacén llena al recibir un lote
de materia prima — desde que entra el camión hasta que se cierra la
recepción con los pesos finales. Mantiene el orden del papel: Control de
documentos, Datos de recepción, Datos del transporte, Datos del producto,
Resumen de recepción, Detalle de rechazos, Unidades de medida,
Observaciones, Responsables.

> **Corrección 2026-08-21**: esta primera versión tenía "Datos de
> recepción" antes que "Control de documentos" — al revés. Se confirmó
> contra una foto del papel real (registro P-ADM-03/R-02) que mandó
> Facundo: "CONTROL DE DOCUMENTOS" es la primera sección de la hoja,
> arriba de "DATOS DE RECEPCION". Se corrigió acá y en
> `FormularioIngresoMateriaPrima.jsx` (los `numero` de `SeccionFormulario`
> se intercambiaron).

### Dónde vive

> ⚠️ **Corrección post-reunión**: la primera versión de esta pantalla vivía
> en una ruta propia colgada de Calidad
> (`/panel/calidad/lotes/:lotId/ingreso`). Es un error — la reunión con
> Milenka es explícita: *"necesito ponerle otra subpestaña a este almacén
> que diga recepción"* (video1788040555.txt). El punto de entrada real es
> Almacén, como una subpestaña de esa misma pantalla, sin navegar a una URL
> aparte. Se corrigió extrayendo el cuerpo del formulario a un componente
> propio (`FormularioIngresoMateriaPrima.jsx`) que ambos puntos de entrada
> montan.

| Qué | Dónde |
|---|---|
| Cuerpo del formulario (sin ruta) | `src/components/formularios/FormularioIngresoMateriaPrima.jsx` |
| Componentes nuevos | `DatosRecepcionLote.jsx`, `ControlDocumentos.jsx`, `DatosTransporte.jsx`, `DatosProductoYCantidad.jsx`, `ResumenRecepcion.jsx`, `PesajeFinal.jsx` |
| Componentes reusados sin cambios | `CabeceraFormulario`, `SeccionFormulario`, `OpcionSiNo`, `ContadorSacos`, `SelectorDeBase`, `CampoObservaciones`, `FirmasResponsables`, `AvisoFaltante`, `solicitudesDeAlta` |
| **Punto de entrada real** | Subpestaña "Recepción" de `PanelAlmacen.jsx` — cambia de vista local (`pantalla.vista`), **no navega**, misma URL `/panel/almacen` todo el tiempo |
| Ruta con URL propia (secundaria) | `/panel/calidad/lotes/:lotId/ingreso` (`PanelIngresoMateriaPrima.jsx`, envoltorio delgado) — para un link directo puntual, ej. desde el resumen de Calidad en `PanelRecepcionLote.jsx` |

Confirma la promesa del primer formulario: los átomos ya construidos para
Calidad sirvieron tal cual acá — ninguno tuvo que tocarse.

---

## 2. Diferencia real de fondo con el formulario de Calidad

El papel es una sola hoja continua, pero el backend (`warehouse-receipts`)
exige crear la recepción primero (`POST`, con lo mínimo) y recién después
completar el resto por `PATCH` — no hay forma de mandar la hoja entera de
una sola vez. La pantalla resuelve esto mostrando **todas las secciones
siempre visibles** (para que se vea el documento completo, como en el
papel), pero el botón de abajo cambia según el estado real de
`warehouseReceipt`:

- No existe → **"Iniciar recepción"** (`POST`), secciones 5 y 6 no se
  muestran (nada que resumir todavía).
- `INICIADA` → **"Guardar cambios"** (`PATCH`) siempre visible; **"Cerrar
  recepción"** (`PATCH` con `complete:true`) solo cuando
  `summary.canRegisterWeight` o `summary.canCompleteWithoutWeight` — igual
  que ya hacía el formulario viejo en `PanelRecepcionLote.jsx`.
- `FINALIZADA` → todo de solo lectura, sin botones.

`receivedPackageCount` se resiembra en un `useEffect` anclado a
`warehouseReceipt?.id` (no a toda `recepcion`), mismo criterio ya
establecido en el formulario de Calidad para no pisar edición sin guardar
en cada `recargar()`.

---

## 3. Hallazgos contra el backend real (auditados, no supuestos)

Antes de escribir un campo se leyó completo `warehouse-receipt.dto.ts`, el
controller y el service — mismo método que con Calidad. Tres cosas del
papel no tienen equivalente exacto en el backend:

### 3.1 — Detalle de rechazos: no existe estructurado

El papel pide **N° de sacos + descripción por causa** en la sección
"DETALLE DE RECHAZOS". El backend no tiene ese dato en ningún lado — ni en
`warehouse-receipts`, ni en `quality-resolutions`, ni en `inspections`. Lo
único real es `rejectedPackageCount`, un **entero agregado** que
`warehouse-receipts` copia de `inspection.rejectedBagCount` (a su vez la
respuesta de un único ítem del formulario de Calidad, "total de sacos
rechazados"). No hay lista línea por línea con motivo.

Se muestra el total (solo lectura) con un aviso explícito de que el detalle
por causa no es capturable hoy — igual que la sección `CamposSinClasificar`
del formulario de Calidad, no se inventa un campo que no persiste a ningún
lado.

### 3.2 — `transportInfo`: el backend exige 4 campos que el papel no pide

El papel muestra 5 datos de transporte (Vehículo, N. de Placa, Color,
Conductor, N. de Licencia). `driverSchema`/`vehicleSchema` (ambos
`.strict()`) exigen 9: además de esos 5, `identityDocument` y
`licenseCategory` del conductor, `brand` y `model` del vehículo. Como
`transportInfo` es todo-o-nada (si se manda, los 9 son obligatorios), se
agregaron los 4 campos igual, con un `hint` que aclara que no están en el
papel.

### 3.3 — Conversión a quintales: verificada contra el papel real, no inventada

`46 kg = 1 quintal` no es un número supuesto — se confirmó contra los
propios valores impresos en el ejemplo real que mandó Milenka: `19319,60 kg
÷ 46 = 419,99 qq` y `19279,85 kg ÷ 46 = 419,13 qq`, exacto contra lo
impreso. Ya estaba usado (en un prototipo viejo, `PanelAlmacen.jsx`, no
enganchado) con el mismo factor. La API solo habla en kilogramos — los
quintales son conversión de presentación, nunca se mandan.

### 3.4 — Sin nombre de usuario en ningún firmante

A diferencia de la inspección de Calidad (que trae `createdByName` en
`GET /inspections/:id`), `warehouse-receipts` solo expone `receivedBy` como
id crudo, sin `*Name`, y la resolución compuesta tampoco trae
`reviewedByName` (eso vive solo en `GET /quality-resolutions/:id`, que esta
pantalla no pide). Los 4 recuadros de `FirmasResponsables` muestran
`usuario: null` siempre — "Pendiente" en vez de inventar un nombre.

---

## 4. Qué persiste y qué no

| Dato | ¿Se guarda? | Motivo |
|---|---|---|
| Control de documentos (verificado + notas) | ✅ Sí | `producerListVerified/Notes`, `shippingGuideVerified/Notes` |
| Datos del transporte (9 campos) | ✅ Sí | `transportInfo`, todo o nada |
| Tipo de envase / N. de bolsas | ✅ Sí | `packagingType`, `receivedPackageCount` — bloqueado en cuanto existe resolución de Calidad |
| Observaciones | ✅ Sí | `notes` |
| Peso bruto / neto | ✅ Sí, solo junto con el cierre | `acceptedGrossWeightKg/NetWeightKg`, solo si `canRegisterWeight` |
| Producto / Fecha / Hora inicio / Hora final | ❌ No | Datos del lote y sellos del backend (`startedAt`/`completedAt`) |
| Detalle de rechazo por causa | ❌ No | No existe el campo — ver §3.1 |
| Firmas | ❌ No | Sin conectar, igual que en Calidad |

---

## 5. Verificado en vivo

Con el backend real corriendo (`npm run start:dev`, puerto 5000) y el
frontend en `:5173`, sesión real (`facundoescencial@gmail.com`):

- **LOT-10** (recepción `INICIADA`, sin resolución de Calidad todavía):
  carga los datos reales, sección 6 muestra el mensaje de espera correcto
  ("se habilita cuando Calidad emita su resolución"), `PATCH` de "Guardar
  cambios" respondió `200` y la confirmación se mostró en pantalla.
- **LOT-9** (recepción `FINALIZADA`): 100 bolsas, 5 sacos rechazados, peso
  bruto 2000 kg → 43,48 qq, peso neto 1900 kg → 41,30 qq — conversión
  exacta, todo en solo lectura, sin botones (nada que hacer en un
  documento cerrado).
- Sin errores de consola en ningún caso.

---

## 6. Pendiente

- Conectar las firmas.
- Versión imprimible (PDF).
- Si en algún momento se decide capturar el detalle de rechazo por causa
  (no solo el total), hace falta una tabla nueva del lado del backend — hoy
  no hay dónde guardarlo.
- El tercer formulario (Nota de Recepción, P-ADM-03/R-11) queda en espera:
  la propia reunión con Milenka lo definió como solo-imprimible, generado
  con los datos que ya cargan los formularios 1 y 2 — no es un formulario
  de carga aparte. Su destino en la app, cuando se construya, es **Calidad
  y Laboratorio** (no Almacén) — corrección directa de Facundo tras esta
  entrega.

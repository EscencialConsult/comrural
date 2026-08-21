# Formulario de Inspección de Materia Prima — Modelo de diseño

**Registro I-CAL-29/R-01 · Área Control de Calidad · Versión 02**
Primer modelo digital del formulario. Documento de diseño: qué se construyó,
con qué componentes, con qué colores y bajo qué lógica.

Fecha: 2026-08-20 · Proyecto: COMRURAL XXI — Software de Gestión (frontend)

---

> ## ✅ Estado: enganchada — es el formulario real de Calidad
>
> Se conectó siguiendo al pie de la letra la §10.3 (ruta en `App.jsx`, sin
> tocar nada más de esa sección). `PanelRecepcionLote.jsx` ya no renderiza el
> renderer genérico (`FormularioInspeccion.jsx`) inline: su sección
> "Inspección de Calidad" quedó como resumen + botón que trae acá — se
> resolvió la advertencia de la §10.3 sobre "no dejar los dos formularios
> vivos". `FormularioInspeccion.jsx` sigue existiendo (no se borró, no se
> pidió), pero ya no lo usa ninguna pantalla de este flujo.
>
> Se sumó lo único que le faltaba para cerrar el ciclo: esta pantalla podía
> iniciar la inspección y guardar respuestas, pero no tenía forma de
> **finalizarla** — sin eso, ninguna inspección abierta acá podía pasar a
> `FINALIZADA` y la Resolución de Calidad nunca se habilitaba. Se agregó
> "Finalizar inspección" con una confirmación inline (sin pantalla de revisión
> aparte: esta pantalla ya muestra el formulario completo).
>
> Todo lo necesario para clonarla a otro proyecto sigue en la **§10. Cómo
> integrarla o clonarla**.

---

## 1. Qué es

La versión en pantalla del formulario en papel que Calidad llena cuando llega
un lote de materia prima. Mantiene la estructura de la hoja —5 secciones
numeradas, tabla de hallazgos a dos columnas, pie de firmas— para que un
auditor pueda cruzar pantalla contra papel renglón por renglón.

No es un `<form>` genérico: cada sección tiene una disposición propia,
derivada de cómo se lee y se completa esa parte de la hoja.

### Dónde vive

| Qué | Dónde |
|---|---|
| Pantalla | `src/pages/PanelInspeccionMateriaPrima.jsx` |
| Componentes | `src/components/formularios/` (14 `.jsx` + 1 `.css` + 1 `.js`) |
| CSS propio | `src/components/formularios/formularios.css` |
| Stub de avisos | `src/components/formularios/solicitudesDeAlta.js` |
| Tokens de marca | `DESIGN.md` (raíz del repo) |
| Ruta | **ninguna** — ver §10 |

La pantalla está escrita como **ruta hija de `DashboardLayout`**: aporta solo
su `<main>` y no rearma sidebar ni header. Cuando se enganche, hereda el shell
sin tocar nada.

---

## 2. Mapa del papel a la pantalla

| Papel | Pantalla | Componente |
|---|---|---|
| Encabezado (logo + REGISTRO + Código/Versión/Página) | Franja verde superior | `CabeceraFormulario` |
| 1. DATOS GENERALES | Sección 1 | `DatosGeneralesLote` |
| 2. CONDICIONES LLEGADA DE TRANSPORTE | Sección 2 | `TablaCriterios` |
| 3. EVALUACIÓN DE INSPECCIÓN (RECHAZO) | Sección 3 | `TablaRechazo` |
| 4. TAMAÑO DE GRANO | Sección 4 | `TablaMediciones` |
| 5. DATOS COMPLEMENTARIOS | Sección 5 | `DatosComplementarios` |
| OBSERVACIONES | Apartado propio | `CampoObservaciones` |
| 4 recuadros de firma | Apartado propio | `FirmasResponsables` |

El orden en pantalla es **idéntico al del papel**. Hubo una versión intermedia
con los datos complementarios arriba (por ser datos automáticos) y se revirtió:
la secuencia 1→5 es lo que hace verificable el documento.

---

## 3. Sistema visual

### Colores usados (todos del kit de marca, ninguno nuevo)

| Token | Hex | Uso en el formulario |
|---|---|---|
| `crema-quinua` | `#FAF4E8` | Fondo general de la app |
| `verde-pistacho` | `#DCE5C8` | Fondo de sección (25%), pregunta obligatoria (70%) |
| `verde-bosque` | `#2A572B` | Pastilla del número de sección, encabezados de tabla, etiquetas de campo, barra del total |
| `verde-hoja` | `#62A83C` | Flecha "sumar", bordes de tabla, hover de acciones |
| `verde-lima` | `#84B739` | **Acento único**: respuesta seleccionada, botón primario, foco de inputs |
| `marron-cafe` | `#3E2312` | Texto principal |
| `marron-tierra` | `#733F1F` | Bordes de input (25%), superficies neutras |
| `marron-arcilla` | `#9C4119` | Flecha "restar", avisos de completitud, campos sin clasificar |
| `rojo-pasankalla` | `#C0392B` | Solo errores reales y rechazo total del lote |

**Reglas heredadas de `DESIGN.md` que se respetaron:**
- Cero `box-shadow` en toda la pantalla. La profundidad es tinte de color.
- Todo control clickeable en pastilla (`rounded-full`).
- Una sola familia tipográfica (Montserrat) variando peso; nunca `700`.
- Motion limitado a `transition-colors duration-150`.

**Ajuste hecho sobre la marcha:** el fondo de sección era `marron-tierra/5` y
sobre el crema resultaba indistinguible del fondo — las secciones no se leían
como bloques. Pasó a `verde-pistacho/25`. En el mismo pase se subieron todos
los grises translúcidos (`/40`→`/65`, `/50`→`/70`, `/30`→`/50`) y los bordes
(`/10`→`/20`).

### Jerarquía

- Número de sección: pastilla verde bosque de 28px con el número en crema.
- Título de sección: 14px, bold, mayúscula, `tracking-wide`.
- Etiqueta de campo: 12px, semibold, mayúscula, verde bosque al 85%.
- Encabezado de tabla: 12px, bold, verde bosque, con `border-b-2` verde hoja.

---

## 4. Catálogo de componentes

### `CabeceraFormulario`
Franja única con logo (`/logos/logorealcolor.webp`, el mismo del sidebar
expandido), antetítulo "REGISTRO", nombre del documento y las pastillas
Código / Versión / Página. En el papel esto es un solo recuadro; acá también
—mismo fondo, mismo borde— en vez de bloques sueltos separados por aire.

Props: `antetitulo`, `titulo`, `codigo`, `version`, `pagina`, `acciones`.

### `SeccionFormulario`
Bloque contenedor. Props: `numero`, `titulo`, `nota`, `acciones`, `children`.
El slot `acciones` es el rincón derecho del título, para acciones que
pertenecen a esa sección y no a la pantalla entera.

### `DatosGeneralesLote` — sección 1
Producto, Fecha, Proveedor, Lote, Hora de inicio, Hora de fin.
Producto/proveedor/lote son selectores contra los maestros; fecha y horas usan
el campo con ícono. Aloja el botón "¿Falta un dato en el sistema?".

### `SelectorDeBase`
Combobox contra los maestros del sistema. Ver §5.

### `CampoFechaHora`
Campo de fecha u hora con ícono que estampa el momento actual. Ver §5.

### `AvisoFaltante`
Botón + modal para avisar que falta un dato maestro. Elegís **Producto /
Proveedor / Lote / Otro** y un detalle (obligatorio solo en "Otro", porque
"otro" a secas no le sirve a quien recibe el aviso).

### `TablaCriterios` — sección 2
Las 8 preguntas de condiciones de llegada, como **listado vertical a todo el
ancho**, no como tabla. Cada renglón: pregunta → Sí/No → observación.

> **Por qué no es tabla:** las preguntas llegan a 24 palabras. En media
> pantalla el texto se parte en cinco renglones y el par Sí/No queda lejos a
> la derecha; con zoom alto no se llega a leer de corrido qué se responde. Una
> tabla sirve con celdas cortas y comparables — acá cada fila es una pregunta
> para leer entera.

- La pregunta 8 (`arrival_conditions_accepted`) lleva fondo propio, anillo
  verde y pastilla **OBLIGATORIA**, más una línea que avisa que un "No"
  rechaza el lote completo.
- La observación arranca **plegada**, como botón chico, y se despliega al
  tocarla (o sola si ya tiene texto). Ocho inputs vacíos duplicaban el alto de
  la sección para algo que casi nunca se usa.
- Al pie, contador vivo de completitud.

### `OpcionSiNo`
Par de pastillas con tercer estado. Ver §5.

### `TablaRechazo` — sección 3
**Una sola tabla** de hallazgos impresa a dos columnas, igual que el papel: la
lista arranca en "Paja", baja 9 renglones y sigue en "Granos dañados". Las dos
columnas comparten el encabezado `DESCRIPCIÓN | CANT. SACOS` repetido y **no
llevan título propio** — en la hoja no hay ningún encabezado ahí.

- Izquierda: 8 hallazgos + su "Otros" = 9 filas.
- Derecha: 6 hallazgos + su "Otros" = 7 filas.
- Nota al pie de **toda** la tabla: `* Vidrio, metal, madera, semillas,
  semillas alergénicas.` — define qué cuenta como materia extraña, que es lo
  que evita que dos analistas clasifiquen distinto el mismo hallazgo.
- Cierra con la barra verde de **Total bolsas rechazadas**.

### `ContadorSacos`
Número con flechas ±. Ver §5.

### `TablaMediciones` — sección 4
4 categorías de grano × 3 mediciones de porcentaje retenido. **Acá sí es
tabla**: las celdas son tres números comparables entre sí y el valor está en
poder leerlas en columna de un vistazo.

Las 3 mediciones no son 3 columnas en la base: son 3 `occurrence` del mismo
ítem (`occurrences = 3`).

### `DatosComplementarios` — sección 5
Total recibido, Total peso neto, ¿Se acepta la materia prima?
Los tres son editables **y** hay un botón **"Traer del sistema"** que los
completa de una con lo que ya sabe el sistema. Las dos formas conviven porque
el dato existe pero no siempre a tiempo ni siempre bien.

### `CampoObservaciones`
Textarea de observaciones generales. Si queda vacío lo dice explícitamente.

### `FirmasResponsables`
Los cuatro recuadros del papel, uno al lado del otro: Analista de Calidad,
Asistente de Almacenes, Transporte, Gerente de Aseguramiento. Cada uno con
espacio de firma + Usuario + Puesto.

---

## 5. Controles especiales (y por qué son así)

### Sí/No con tercer estado — nunca un switch

Un switch tiene dos estados y **no puede representar "todavía no respondí"**.
Si la respuesta correcta es "No" y nadie mueve el control, el campo queda sin
responder y el backend rechaza el cierre sin que se vea por qué en pantalla.

`null` = sin responder, y **se ve**: las dos pastillas con borde marcado.
Tocar la opción ya elegida la deselecciona.

**El seleccionado va siempre en verde lima, tanto Sí como No.** En la pregunta
2 ("¿se transportan sustancias peligrosas?") la respuesta deseable es "No" —
pintar ese No de color de alerta induce al error justo donde más importa. No
hay respuesta buena y mala: hay respuesta.

### Contador con flechas (± con color)

En planta el conteo se acumula de a uno mirando la pila; nadie llega con el
total en la cabeza. Un input pelado obliga a borrar y reescribir en cada saco.

- Flecha izquierda **resta** (marrón arcilla), derecha **suma** (verde hoja).
  Con un solo tono neutro las dos se leían como adorno.
- El número se sigue pudiendo tipear directo.
- Sirve para enteros (sacos) y decimales (porcentajes) vía `paso`,
  `decimales` y `sufijo`, con redondeo explícito para evitar
  `2.44 + 1 = 3.4400000000000004`.
- `null` ("sin contar") se distingue de `0` ("contado, dio cero"). Restar
  desde `null` lleva a 0 y ahí frena.

### Selector contra maestros — se escribe para BUSCAR, no para inventar

`<input list>` + `<datalist>` **parece** un selector y no lo es: sugiere pero
no obliga. Con proveedores eso significa que "Quinua Real", "quinua real" y
"Quinua Rael" pasan como tres proveedores distintos y ninguno apunta a la fila
real. Tampoco un `<select>`: con decenas de opciones, abrir la lista entera es
más lento que tipear tres letras.

- El input filtra; el valor **solo cambia al elegir de la lista**.
- Guarda el **id**, no el nombre.
- Ignora acentos: `perez` encuentra "Pérez".
- Cada opción muestra un **detalle** al lado (código del producto, tipo de
  proveedor). No es decorativo: hay dos proveedores con nombre idéntico y
  distinto tipo, sin ese dato son dos renglones imposibles de distinguir.
- Teclado completo (↑ ↓ Enter Escape) y cierra al clickear afuera.

**El lote es distinto:** elegir otro lote **navega** a la inspección de ese
lote. Cada lote tiene su formulario y sus respuestas. Como campo común, se
terminaría con el código de un lote arriba y las respuestas de otro abajo.

### Campo de fecha/hora con ícono

Chrome dibuja su ícono adentro del input y **solo abre el selector si hacés
clic sobre él** (≈20px del borde). Un botón propio al lado deja dos íconos
compitiendo.

Solución en dos partes:

1. CSS que estira el indicador nativo sobre todo el input y lo vuelve
   invisible → **clic en cualquier parte del campo abre el selector**, y no se
   ve un segundo ícono. Se recorta a `right: 2.75rem` para no comerse el clic
   del botón propio.
2. Un ícono adentro del campo (calendario / reloj) que **estampa el momento
   actual** sin abrir nada. Lleva `z-10` obligatorio; sin eso queda tapado por
   el indicador transparente.

El valor **nunca queda fijo**: después de usar el ícono se sigue editando el
campo. El ícono es un atajo, no un candado. Horario en **24 h**, sin AM/PM,
como el papel.

### Total bolsas rechazadas — manual

Lo escribe el analista: es su número, el que firma. Puede no coincidir con la
suma aritmética de los renglones (un mismo saco puede caer en más de un
defecto y contarse una vez), así que forzarlo sería corregirle el criterio.

Debajo de la etiqueta aparece **"Los renglones suman N"**, y **solo cuando
difiere** del número escrito. Aviso pasivo, no corrige nada. Importa porque el
backend valida ese número contra los envases que recibió Almacén y rechaza la
inspección si se pasa: conviene que un dedazo se note acá y no al finalizar.

### "Otros" — filas que se agregan con `+`

Cada columna de la sección 3 cierra con su renglón "Otros": descripción libre
+ cantidad, con un `+` para sumar filas y una `✕` para quitarlas.

No es invención de pantalla: el formulario ya lo tiene modelado como **dos
grupos repetibles abiertos** (`rejection_other_contaminant` y
`rejection_other_grain`), cada uno con un ítem TEXT y uno INTEGER, ambos con
`occurrences = null` (= se repite sin tope). Cada fila se guarda en su
`occurrence`, igual que cualquier otra respuesta.

Quitar una fila **vacía las dos respuestas**, no baja un contador: la fila se
muestra porque tiene valores guardados, así que bajar el contador sin
limpiarlas la haría reaparecer en la próxima carga.

---

## 6. Modelo de lógica

### Origen de los datos

```
GET /raw-material-lots/:lotId/reception   → lote, resumen, recepción, resolución
GET /inspections/:inspectionId            → { inspection, form, responses }
PATCH /inspections/:id/responses          → guardar respuestas
```

El formulario es **data-driven**: los ítems, sus tipos, secciones y
obligatoriedad salen del backend. La pantalla no tiene la lista de preguntas
escrita adentro.

### Renderer *section-aware*

La pantalla conoce los tres códigos de sección reales y le da a cada uno su
disposición propia:

```js
const SECCION = {
  CONDICIONES: 'arrival_conditions',
  RECHAZO: 'rejection_evaluation',
  TAMANIO_GRANO: 'grain_size',
}
```

Lo que no reconoce cae en un render genérico al final: una sección nueva del
backend **nunca desaparece** de la pantalla.

Además, cada sección se filtra al tipo de dato que su maquetación sabe
dibujar, y **los descartes se muestran señalados** en un bloque de aviso
(`CamposSinClasificar`), nunca ocultos. Sin eso, un ítem obligatorio invisible
produce un 400 al finalizar sin ninguna explicación en pantalla.

### Estado

| Estado | Contenido |
|---|---|
| `valores` | `{ "itemId:occurrence": valor }` — todas las respuestas |
| `tocados` | `Set` de claves modificadas; solo eso se manda al guardar |
| `generales` | Sección 1 (objetos `{ id, nombre }`, no cadenas) |
| `complementarios` | Sección 5 |
| `observacionesCriterio` | Observaciones por criterio de la sección 2 |
| `observaciones` | Observación general del pie |

**Regla crítica de resiembra:** el efecto que carga las respuestas del
servidor depende **solo de `form.id`**, nunca de `responses`. La pantalla
recarga después de cada mutación, y si dependiera de `responses`, cada
recarga pisaría lo que la persona tipeó y todavía no guardó.

### Regla de corte del formulario

Si `arrival_conditions_accepted` se responde **No**:

- Aparece un aviso de **rechazo total del lote** en rojo pasankalla.
- Las secciones 3 y 4 se atenúan y pasan a solo lectura.
- Queda operativa la observación, para dejar el motivo.

Se compara contra `false` explícito, **no** `!valor`: mientras la pregunta
esté sin responder (`null`) el formulario sigue entero.

> ⚠️ Hoy esto es solo la capa visual. El backend
> (`assertAllRequiredAnswered`) sigue exigiendo **todas** las obligatorias, así
> que finalizar va a fallar hasta que se implemente la excepción del lado del
> servidor.

### Guardado

Un solo botón, en batch. Solo viajan las claves de `tocados`. Un valor vacío
se manda como `{ clear: true }`; el resto según su `dataType`
(`valueBoolean` / `valueNumber` / `valueText` / `valueDate` / `valueOption`).

---

## 7. Qué persiste y qué no

| Dato | ¿Se guarda? | Motivo |
|---|---|---|
| Respuestas de secciones 2, 3 y 4 | ✅ Sí | — |
| Filas de "Otros" (descripción + cantidad) | ✅ Sí | Grupos repetibles del formulario |
| Total bolsas rechazadas | ✅ Sí | Ítem `total_rejected_bags` |
| Observación por criterio (sección 2) | ❌ No | Faltan 8 `form_items` TEXT hermanos de los BOOLEAN |
| Producto / proveedor / lote | ❌ No | Son datos **del lote**, los carga Compras; no hay endpoint desde acá |
| Fecha / hora inicio / hora fin | ❌ No | El backend las sella (`startedAt` / `completedAt`) |
| Los tres de la sección 5 | ❌ No | Son de Almacén y de la resolución, cada uno con su endpoint |
| Firmas | ❌ No | Sin conectar |

**Regla de honestidad aplicada en los tres casos:** lo que no se guarda **se
avisa donde se escribe**, no en un README. Y un espacio pendiente va con borde
**punteado**, nunca sólido — un recuadro de firma vacío con borde firme se lee
como "acá faltó una firma", que es otra cosa.

---

## 8. Hallazgos en la base (auditados contra la BD real)

### Ítems de prueba que bloquean el cierre

Están cargados a mano en el formulario real, **activos y obligatorios**:
`asd` ("asdf"), `nueva_seccion` ("nueva seccion"), `nuevo_campo` ("Nueva") y
`adf` ("ads", ya inactivo).

Como `assertAllRequiredAnswered` exige toda obligatoria antes de finalizar,
**ninguna inspección se puede cerrar mientras existan**.

➡️ Migración lista: `0029_cleanup_test_form_items.sql` (renumerada — el backend
tenía migraciones `0026`/`0027` propias de otro compañero cuando se trajeron
los cambios; se regeneró con `drizzle-kit generate --custom` para no pisarlas)

### "Paja" desactivado por accidente

`straw_bags` es el primer renglón de la sección 3. Se creó el 14/08 a las
15:52 y se desactivó a las 15:54 — dos minutos después, probando el endpoint
de baja. `listApplicableAt` excluye los ítems desactivados antes del inicio de
la inspección, así que **no aparecía en ninguna inspección nueva**.

➡️ Migración lista: `0028_reactivate_straw_bags_form_item.sql` (misma
renumeración que la de arriba)

### Permisos del rol `calidad`

El rol tenía `inspections:read` + `inspections:update`, **pero no
`inspections:create`**: un analista de calidad no podía abrir su propia
inspección, necesitaba que un superadmin se la abra. Contradecía lo acordado
en la reunión ("cualquiera puede iniciar primero, es independiente").

➡️ **Ya resuelto** — llegó en `0027_inspections_create_calidad.sql`, del
mismo compañero que trajo el módulo de muestras. No hizo falta migración
propia.

### Otros datos

- Proveedores: hay dos con el nombre exacto repetido y distinto tipo
  (`PRODUCER` y `OTHER`).
- La sección `rejection_evaluation` fue cargada directamente en la BD, no por
  migración: no está versionada en el repo.

---

## 9. Pendientes

**Backend**
1. Correr `0028` (reactivar Paja) y `0029` (limpiar ítems de prueba) contra la
   base real — **bloqueado hoy**: `MIGRATION_DATABASE_URL` tiene la
   contraseña del rol `postgres` vencida/incorrecta (confirmado con el
   backend real: `password authentication failed for user "postgres"`, error
   de Postgres, no de los scripts). Solo se resetea desde el dashboard de
   Supabase.
2. ~~Dar `inspections:create` al rol `calidad`~~ — ya resuelto en `0027`.
3. Excepción en `assertAllRequiredAnswered` para el rechazo por condiciones.
4. 8 `form_items` TEXT para las observaciones por criterio.

**Frontend**
5. Conectar las firmas.
6. Versión imprimible (PDF) con los 4 recuadros de firma manuscrita y la
   sección 5 en su posición del papel.
7. Fórmulas de cálculo de la sección 5, cuando Calidad las defina.

---

## 10. Cómo integrarla o clonarla

La maqueta se construyó para poder moverse entera. Esta sección tiene todo lo
necesario: qué archivos son, de qué depende y los pasos exactos.

### 10.1 Inventario completo

Todos estos archivos son **nuevos**. Ninguno pisa nada del proyecto.

```
src/components/formularios/
  AvisoFaltante.jsx           modal "falta un dato en el sistema"
  CabeceraFormulario.jsx      logo + antetítulo/nombre + Código/Versión
  CampoFechaHora.jsx          fecha/hora + ícono que estampa el ahora
  CampoObservaciones.jsx      textarea + aviso si queda vacío
  ContadorSacos.jsx           número + flechas ± con color
  DatosComplementarios.jsx    sección 5 + "Traer del sistema"
  DatosGeneralesLote.jsx      sección 1
  FirmasResponsables.jsx      4 recuadros de firma en fila
  OpcionSiNo.jsx              par Sí/No con tercer estado
  SeccionFormulario.jsx       bloque numerado + slot `acciones`
  SelectorDeBase.jsx          combobox contra maestros
  TablaCriterios.jsx          sección 2 (cuestionario vertical)
  TablaMediciones.jsx         sección 4 (grilla de N mediciones)
  TablaRechazo.jsx            sección 3 (tabla a dos columnas + "Otros")
  formularios.css             truco del selector nativo de fecha/hora
  solicitudesDeAlta.js        stub del aviso al responsable

src/pages/
  PanelInspeccionMateriaPrima.jsx   ensambla todo (section-aware)

docs/
  formulario-inspeccion-materia-prima.md   este documento
```

**Por qué el CSS y el stub viven adentro de la carpeta** y no en `index.css` /
`services/`: para que la maqueta no toque ningún archivo compartido. Se mueven
con la carpeta y funcionan solos. Al integrar se pueden dejar donde están —
Vite resuelve el `import './formularios.css'` sin configuración extra.

### 10.2 De qué depende

**Paquetes npm** (los tres ya estaban en el proyecto):

| Paquete | Para qué |
|---|---|
| `react` ≥ 19 | `useId` en `SelectorDeBase` |
| `react-router-dom` ≥ 7 | `useParams`, `useNavigate` |
| `lucide-react` | Íconos |
| `tailwindcss` v4 | Todas las clases |

**Del proyecto** (solo lectura — la maqueta no modifica ninguno):

| Import | Qué aporta | Al clonar |
|---|---|---|
| `components/Button.jsx` | Botón en pastilla con ripple | Reemplazable por el botón del destino |
| `components/dashboard/AccesoDenegado.jsx` | Pantalla de sin permiso | Reemplazable |
| `context/AuthContext.jsx` | `permisos`, `usuario` | Adaptar al auth del destino |
| `hooks/useSolicitud.js` | Estado `enviando` / `error` de una request | Reemplazable |
| `services/rawMaterialReceptionsService` | `GET .../reception` | Necesario |
| `services/inspectionsService` | `GET`, `PATCH responses`, `POST complete` | Necesario |
| `services/productsService` · `suppliersService` · `lotsService` | Listados de los selectores | Necesario |
| `/logos/logorealcolor.webp` | Logo del encabezado | Cambiar por el del destino |

**Tokens de Tailwind** que tienen que existir en el `@theme` del destino
(ver §3 para los hex): `verde-bosque`, `verde-hoja`, `verde-lima`,
`verde-pistacho`, `marron-cafe`, `marron-tierra`, `marron-arcilla`,
`crema-quinua`, `rojo-pasankalla`.

> Si el proyecto destino tiene otra paleta, **no pegar los hex de COMRURAL**:
> mapear cada token al equivalente del destino. Lo que se porta es la técnica,
> no el color.

**Endpoints** que la pantalla consume:

```
GET   /raw-material-lots/:lotId/reception
GET   /inspections/:inspectionId            → { inspection, form, responses }
POST  /raw-material-lots/:lotId/inspections
PATCH /inspections/:inspectionId/responses
```

**Permisos** que evalúa: `raw-material-receptions:read` (ver la pantalla),
`inspections:update` (editar), `inspections:create` (abrir la inspección).

### 10.3 Engancharla en ESTE proyecto

Son dos cambios. Es exactamente lo que estaba puesto y se revirtió al
separarla, así que se puede volver a aplicar tal cual.

**1) La ruta** — en `src/App.jsx`, junto al resto de las rutas hijas de
`DashboardLayout`:

```jsx
import PanelInspeccionMateriaPrima from './pages/PanelInspeccionMateriaPrima.jsx'

// …dentro del <Route element={<RutaProtegida><DashboardLayout/></RutaProtegida>}>
<Route path="/panel/calidad/lotes/:lotId/inspeccion" element={<PanelInspeccionMateriaPrima />} />
```

**2) La entrada** — en `src/pages/PanelCalidad.jsx`, en la celda de acciones de
cada fila de la tabla de lotes:

```jsx
<button
  type="button"
  onClick={() => navigate(`/panel/calidad/lotes/${l.id}/inspeccion`)}
  className="rounded-full px-3 py-1.5 text-xs font-semibold text-verde-bosque transition-colors duration-150 hover:bg-verde-hoja/10"
>
  Inspección
</button>
```

Nada más. La pantalla se gatea sola por `raw-material-receptions:read` y
maneja sus propios estados de carga, error y "lote sin inspección abierta".

> **Antes de integrar, decidir qué pasa con la pantalla vieja.** Hoy conviven
> dos formularios de inspección: este y el bloque "Inspección de Calidad" de
> `PanelRecepcionLote.jsx`, que usa el renderer genérico
> `components/calidad/FormularioInspeccion.jsx`. Dejar los dos vivos es la
> receta para que se desincronicen.

### 10.4 Clonarla a OTRO proyecto

1. Copiar `src/components/formularios/` completa y la pantalla.
2. Confirmar/mapear los tokens del §10.2 en el `@theme` del destino.
3. Cambiar el logo en `CabeceraFormulario.jsx`.
4. Reapuntar los imports de servicios, auth y `useSolicitud` a los del destino.
5. Cambiar los códigos de sección y de ítem por los del formulario nuevo:

```js
// PanelInspeccionMateriaPrima.jsx — lo único específico de I-CAL-29/R-01
const SECCION = { CONDICIONES: '…', RECHAZO: '…', TAMANIO_GRANO: '…' }
const ITEM_ACEPTA_CONDICIONES = 'arrival_conditions_accepted'
const ITEM_TOTAL_RECHAZADAS = 'total_rejected_bags'
const COLUMNAS_RECHAZO = [ /* códigos por columna + groupCode del "Otros" */ ]
const NOTA_MATERIAS_EXTRANIAS = '…'
```

**Los cuatro componentes atómicos no saben nada de COMRURAL** y se pueden
llevar sueltos, sin el resto: `OpcionSiNo`, `ContadorSacos`, `SelectorDeBase`
y `CampoFechaHora` (este último con su `formularios.css`).

### 10.5 Qué NO clonar sin revisar

- **`FirmasResponsables`** tiene los cuatro cargos de COMRURAL escritos en la
  pantalla que lo usa. Otro formulario tiene otros firmantes.
- **`DatosComplementarios`** asume los tres campos de la sección 5 de esta
  hoja. Es el componente menos genérico de todos.
- **La regla de corte** (`arrival_conditions_accepted` = No → rechazo total)
  es de este formulario. En otro puede no haber pregunta decisiva, o ser otra.

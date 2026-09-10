import {
  Globe,
  IdCard,
  Building2,
  Handshake,
  Boxes,
  ShoppingCart,
  SlidersHorizontal,
  ClipboardList,
  ClipboardCheck,
  LayoutGrid,
  FlaskConical,
  Warehouse,
  Receipt,
  TestTubes,
  Factory,
  Users,
  ShieldCheck,
  ListChecks,
  Activity,
  PackageCheck,
  Package,
  Wheat,
  Archive,
} from 'lucide-react'

// Única fuente de verdad de "qué pantallas de datos maestros van agrupadas
// bajo qué módulo padre" (pedido explícito: Personas/Organizaciones/
// Proveedores/Productos/Lotes dentro de Compras, Países dentro de
// Configuración — ver DashboardSidebar.jsx). La usan DOS lugares:
//   1. DashboardSidebar.jsx — arma el menú lateral con sub-items.
//   2. GrupoTabs.jsx — arma las pastillas arriba de cada pantalla del
//      grupo, para saltar entre hermanas sin volver al menú.
// Sumar una pantalla nueva (M-siguiente) es agregar UNA línea acá — el
// sidebar y las pastillas se actualizan solos, ninguno de los dos archivos
// vuelve a tocarse.
export const GRUPOS_MAESTROS = [
  {
    id: 'compras',
    // A diferencia de Configuración, "Compras" SÍ es un módulo de negocio
    // real gateado por su propio permiso (ver utils/permisos.js,
    // puedeVerModulo) — alguien con acceso a "Personas" pero no a Compras
    // no tiene por qué ver una pastilla que lo manda a una pantalla de "sin
    // acceso". `padre.permiso` ausente (como en Configuración) = acceso
    // libre; presente = se filtra igual que cualquier otro item.
    padre: { nombre: 'Compras', ruta: '/panel/compras', permiso: 'compras:read', Icon: ShoppingCart },
    items: [
      { id: 'personas', nombre: 'Personas', ruta: '/panel/personas', permiso: 'people:read', Icon: IdCard },
      {
        id: 'organizaciones',
        nombre: 'Organizaciones',
        ruta: '/panel/organizaciones',
        permiso: 'organizations:read',
        Icon: Building2,
      },
      {
        id: 'proveedores',
        nombre: 'Proveedores',
        ruta: '/panel/proveedores',
        permiso: 'suppliers:read',
        Icon: Handshake,
      },
      { id: 'productos', nombre: 'Productos', ruta: '/panel/productos', permiso: 'products:read', Icon: Boxes },
    ],
  },
  {
    // Igual que 'configuracion': no es un módulo de negocio de modulos.json,
    // así que DashboardSidebar.jsx lo resuelve aparte (subitemsUsuarios,
    // mismo criterio que subitemsConfiguracion) en vez de por el
    // modulos.map() genérico. Entra acá solo para que esta sea la ÚNICA
    // fuente de "padre + hermanas" — así GrupoTabs.jsx (las pastillas
    // arriba de la pantalla) funciona gratis, sin un caso especial más.
    id: 'usuarios',
    padre: { nombre: 'Usuarios', ruta: '/panel/usuarios', permiso: 'iam:read', Icon: Users },
    items: [
      {
        id: 'roles',
        nombre: 'Roles y permisos',
        ruta: '/panel/usuarios/roles',
        permiso: 'iam:read',
        Icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'configuracion',
    padre: { nombre: 'Configuración', ruta: '/panel/configuracion', Icon: SlidersHorizontal },
    items: [
      {
        id: 'paises',
        nombre: 'Países',
        ruta: '/panel/paises',
        permiso: 'countries:read',
        Icon: Globe,
        descripcion: 'Catálogo de países usados en direcciones, teléfonos y datos de proveedores.',
      },
      {
        id: 'formularios',
        nombre: 'Formularios',
        ruta: '/panel/formularios',
        permiso: 'forms:read',
        Icon: ClipboardList,
        descripcion: 'Plantillas de formulario y sus campos — la base de los registros dinámicos del sistema.',
      },
      {
        id: 'areas',
        nombre: 'Áreas',
        ruta: '/panel/areas',
        permiso: 'areas:read',
        Icon: LayoutGrid,
        descripcion: 'Áreas de planta a las que se asocian formularios y registros de producción.',
      },
    ],
  },
  {
    id: 'calidad',
    // Mismo criterio que Compras: "Calidad" (el padre) es el Inicio del
    // área — solo analytics — e "Inspección" (el único hijo por ahora, más
    // van a sumarse con los próximos formularios) es donde vive la tabla
    // de lotes con su estado y el formulario de inspección. El nombre es
    // "Inspección", no "Recepción/Inspección" — la Recepción es tarea de
    // Almacén (ver el grupo `almacen` de acá abajo), esta pantalla solo
    // MUESTRA de lectura el estado de esa recepción como contexto para
    // inspeccionar, no la gestiona. `permiso: 'lots:read'` en los dos
    // porque hoy esa es la condición real que separa el camino completo
    // (almacén/superadmin) del camino de cola simple para el rol `calidad`
    // puro (ver PanelCalidad.jsx) — sin `lots:read` no hay Inicio con tabs
    // ni tabla que agrupar, así que el padre queda como link plano y este
    // grupo no se arma.
    // Nombre del padre "Calidad" a secas (no "Calidad y Lab.") — pedido
    // explícito: Laboratorio quedó como módulo aparte en el sidebar (ver
    // DashboardSidebar.jsx, link manual gateado por samples:read), no una
    // hermana más acá adentro.
    padre: { nombre: 'Calidad', ruta: '/panel/calidad', permiso: 'lots:read', Icon: FlaskConical },
    items: [
      {
        id: 'inspeccion',
        nombre: 'Inspección',
        ruta: '/panel/calidad/inspeccion',
        permiso: 'lots:read',
        Icon: ClipboardList,
      },
      // Formulario 3 (Nota de Recepción, P-ADM-03/R-11) — sub-item normal,
      // mismo molde que Inspección.
      {
        id: 'remito',
        nombre: 'Remito',
        ruta: '/panel/calidad/remito',
        permiso: 'lots:read',
        Icon: Receipt,
      },
      // Muestreo + solicitud de análisis de laboratorio — permiso propio
      // (samples:read, no lots:read como sus hermanas) porque es el
      // permiso técnico real que protege esos endpoints, mismo criterio
      // que Compras usa lots:read para su hermana "Lotes" en vez de
      // compras:read. Mismo componente (SeccionMuestras.jsx) que también
      // usa PanelLaboratorio.jsx — pedido explícito, no una copia.
      {
        id: 'muestras',
        nombre: 'Muestras',
        ruta: '/panel/calidad/muestras',
        permiso: 'samples:read',
        Icon: TestTubes,
      },
      // Control de proceso de Área A (control-proceso-a) — lo llena un
      // inspector de Calidad sobre el lavado que registra Producción, pero
      // el permiso real es propio (control-proceso-a:read, agregado en
      // 0035), no lots:read — pedido explícito: vive en Calidad, no dentro
      // del grupo Producción, ver comrural_erp_backend/docs/control-proceso-a.md.
      {
        id: 'control-proceso',
        nombre: 'Control de Proceso',
        ruta: '/panel/calidad/control-proceso',
        permiso: 'control-proceso-a:read',
        Icon: ClipboardCheck,
      },
      // MOCKUP (RP-17, ver SeccionInspeccionAreaB.jsx) — verificación de
      // pureza antes del envasado de Área B. Nunca se compartió un
      // formulario real de esto en las reuniones, a diferencia de sus
      // hermanas de arriba.
      {
        id: 'inspeccion-area-b',
        nombre: 'Inspección Área B',
        ruta: '/panel/calidad/inspeccion-area-b',
        permiso: 'lots:read',
        Icon: ShieldCheck,
      },
    ],
  },
  {
    id: 'laboratorio',
    // Cambio puramente visual (pedido explícito): antes "Laboratorio" era
    // un único link plano en el sidebar (ver DashboardSidebar.jsx) con sus
    // 4 secciones como pastillas locales DENTRO de la pantalla
    // (PanelLaboratorio.jsx, PillTabs). Ahora sigue el mismo molde que
    // Calidad/Compras/Almacén: el padre ("Laboratorio") es la pantalla de
    // "Recepción de muestras" en sí (mismo criterio que Compras, cuyo padre
    // ES la gestión de lotes, no un Inicio separado), y las otras 3 son
    // hermanas con ruta propia — GrupoTabs.jsx ya las muestra como
    // pastillas arriba solo con esta entrada. El sidebar en sí necesita un
    // ajuste manual aparte (ver DashboardSidebar.jsx) porque Laboratorio no
    // tiene fila en modulos.json — no pasa por el mecanismo automático que
    // usan los módulos de negocio reales.
    padre: { nombre: 'Laboratorio', ruta: '/panel/laboratorio', permiso: 'samples:read', Icon: TestTubes },
    items: [
      {
        id: 'analisis',
        nombre: 'Análisis',
        ruta: '/panel/laboratorio/analisis',
        permiso: 'samples:read',
        Icon: ListChecks,
      },
      {
        id: 'actividad',
        nombre: 'Actividad',
        ruta: '/panel/laboratorio/actividad',
        permiso: 'samples:read',
        Icon: Activity,
      },
      // MOCKUP (RP-21, ver SeccionLoteDespacho.jsx) — antes vivía como 4ta
      // pastilla local de PanelLaboratorio.jsx, ahora es hermana real como
      // el resto.
      {
        id: 'lote-despacho',
        nombre: 'Lote de Despacho',
        ruta: '/panel/laboratorio/lote-despacho',
        permiso: 'samples:read',
        Icon: PackageCheck,
      },
    ],
  },
  {
    id: 'produccion',
    // Mismo criterio que Calidad/Almacén: "Producción" (el padre) es el
    // Inicio del área — solo dashboard/analytics — y "Área A" es la única
    // área física conectada al backend real (production-area-a). "Área B"
    // se sacó por completo (pedido explícito) — era 100% mockup, sin ningún
    // módulo de backend detrás; no queda ni la ruta, ni la pantalla, ni sus
    // 5 formularios, ver comrural_erp_backend/docs/production-area-a.md.
    // Adentro de "Área A" vive su propia fila de subpestañas locales
    // (PillTabs, ver SeccionAreaA.jsx) con los formularios de esa área —
    // esas subpestañas NO son rutas, viven en un solo nivel más abajo que
    // esto.
    //
    // "Área B" es hermana de "Área A" (pedido explícito) — igual patrón,
    // sus propias subpestañas locales (PillTabs) viven adentro
    // (SeccionAreaB.jsx), no acá. "Control de Existencias" es la primera de
    // esas subpestañas: por ahora solo lista los lotes que ya iniciaron el
    // lavado (currentStatus === 'LAVADO', ver SeccionControlExistencias.jsx)
    // — el resto del contenido todavía no está definido.
    padre: { nombre: 'Producción', ruta: '/panel/produccion', permiso: 'produccion:read', Icon: Factory },
    items: [
      {
        id: 'area-a',
        nombre: 'Área A',
        ruta: '/panel/produccion/area-a',
        permiso: 'produccion:read',
        Icon: Warehouse,
      },
      {
        id: 'area-b',
        nombre: 'Área B',
        ruta: '/panel/produccion/area-b',
        permiso: 'produccion:read',
        Icon: Boxes,
      },
    ],
  },
  {
    id: 'almacen',
    // Mismo criterio que Calidad: "Almacén" (el padre) es el
    // Inicio del área — solo analytics — y "Recepción" (el único hijo por
    // ahora) es donde vive la tabla de lotes pendientes/en curso y el
    // formulario de ingreso de materia prima. Pedido explícito de Facundo:
    // "que en almacén aparezca solo los datos como de inicio y se abra la
    // nueva pestaña que sea recepción" — mismo patrón, un solo permiso
    // (`almacen:read`) porque acá no hay split de roles como en Calidad.
    padre: { nombre: 'Almacén', ruta: '/panel/almacen', permiso: 'almacen:read', Icon: Warehouse },
    items: [
      // Recepción y Entrega de MP unificadas bajo un solo ítem (antes
      // "Entrega de MP" tenía su propia fila acá) — único caso donde el par
      // ingreso/salida de un mismo material no vivía junto como en
      // Envases/PT/General. Ahora son subpestañas locales dentro de
      // PanelAlmacenRecepcion.jsx (ver ese archivo), mismo patrón que sus
      // hermanas. Cambio puramente visual: la ruta sigue siendo la misma.
      {
        id: 'recepcion',
        nombre: 'Recepción y Entrega',
        ruta: '/panel/almacen/recepcion',
        permiso: 'almacen:read',
        Icon: ClipboardList,
      },
      // MOCKUP (P-ADM-03/R-19 ingreso, P-ADM-03/R-27 + P-ADM-03/R-20 salida)
      // — ingreso y salida de envases/embalaje/insumos de proceso, agrupados
      // acá porque son el mismo flujo de material (subpestañas locales
      // adentro, ver PanelAlmacenEnvases.jsx). Sin backend propio todavía.
      {
        id: 'envases',
        nombre: 'Envases y Embalaje',
        ruta: '/panel/almacen/envases',
        permiso: 'almacen:read',
        Icon: Boxes,
      },
      // MOCKUP (P-BPA-01/R-11 ingreso, P-BPA-01/R-12 salida) — solo
      // Producto Terminado Local (RP-20); exportación queda en Producción
      // (ver ControlProductoAlmacen.jsx). Agrupado con subpestañas como
      // Envases. Sin backend propio todavía.
      {
        id: 'producto-terminado',
        nombre: 'Producto Terminado',
        ruta: '/panel/almacen/producto-terminado',
        permiso: 'almacen:read',
        Icon: Package,
      },
      // MOCKUP — reorganización pedida por el usuario (13 ítems de sidebar
      // eran demasiados): Ingreso/Salida de Almacén General (P-ADM-03/R-19/
      // R-27/R-20), Indumentaria y EPP (I-SYSO-06/R-06) y Bajas
      // (P-ADM-03/R-21) agrupados acá con subpestañas locales, ver
      // PanelAlmacenGeneral.jsx. Sin backend propio todavía.
      {
        id: 'general',
        nombre: 'Almacén General',
        ruta: '/panel/almacen/general',
        permiso: 'almacen:read',
        Icon: Boxes,
      },
    ],
  },
  {
    id: 'inventario',
    // Reorganización pedida por el usuario: Inventario pasa a ser su
    // propio grupo con pastillas reales arriba (GrupoTabs.jsx), mismo
    // patrón que Compras — antes intentaba simular esto con PillTabs
    // locales adentro de una sola pantalla y terminaba en pestañas
    // anidadas dentro de pestañas. No es un módulo de negocio nuevo (no
    // tiene fila en mock/data/modulos.json, esa lista son los 8
    // departamentos reales de la empresa — "Almacén" ya incluye
    // inventario en su propia descripción), por eso usa el mismo permiso
    // que Almacén (almacen:read) en vez de uno propio.
    // El padre ("Inventario", /panel/inventario) es la pestaña central:
    // Conteo/Ajustes/Alta de Ítem viven ahí adentro como subpestañas
    // locales (un solo nivel, mismo criterio que Almacén General →
    // Ingreso/Salida/...). Los 3 hijos son Existencias dividida por
    // categoría (antes un selector de "Grupo" dentro de una sola
    // pantalla).
    padre: { nombre: 'Inventario', ruta: '/panel/inventario', permiso: 'almacen:read', Icon: ClipboardCheck },
    items: [
      {
        id: 'inventario-mp',
        nombre: 'Materia Prima',
        ruta: '/panel/inventario/materia-prima',
        permiso: 'almacen:read',
        Icon: Wheat,
      },
      {
        id: 'inventario-pt',
        nombre: 'Producto Terminado',
        ruta: '/panel/inventario/producto-terminado',
        permiso: 'almacen:read',
        Icon: Package,
      },
      {
        id: 'inventario-envases',
        nombre: 'Envases e Insumos',
        ruta: '/panel/inventario/envases-insumos',
        permiso: 'almacen:read',
        Icon: Boxes,
      },
      {
        id: 'inventario-general',
        nombre: 'Almacén General',
        ruta: '/panel/inventario/almacen-general',
        permiso: 'almacen:read',
        Icon: Archive,
      },
    ],
  },
]

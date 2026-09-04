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
    padre: { nombre: 'Producción', ruta: '/panel/produccion', permiso: 'produccion:read', Icon: Factory },
    items: [
      {
        id: 'area-a',
        nombre: 'Área A',
        ruta: '/panel/produccion/area-a',
        permiso: 'produccion:read',
        Icon: Warehouse,
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
      {
        id: 'recepcion',
        nombre: 'Recepción',
        ruta: '/panel/almacen/recepcion',
        permiso: 'almacen:read',
        Icon: ClipboardList,
      },
    ],
  },
]

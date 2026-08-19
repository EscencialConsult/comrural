import {
  Globe,
  IdCard,
  Building2,
  Handshake,
  Boxes,
  Layers,
  ShoppingCart,
  SlidersHorizontal,
  ClipboardList,
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
      { id: 'lotes', nombre: 'Lotes', ruta: '/panel/lotes', permiso: 'lots:read', Icon: Layers },
    ],
  },
  {
    id: 'configuracion',
    padre: { nombre: 'Configuración', ruta: '/panel/configuracion', Icon: SlidersHorizontal },
    items: [
      { id: 'paises', nombre: 'Países', ruta: '/panel/paises', permiso: 'countries:read', Icon: Globe },
      {
        id: 'formularios',
        nombre: 'Formularios',
        ruta: '/panel/formularios',
        permiso: 'forms:read',
        Icon: ClipboardList,
      },
    ],
  },
]

import { Warehouse, FlaskConical, Factory, ShoppingCart, Calculator, Briefcase, Wrench, Truck } from 'lucide-react'

// Un solo lugar para el ícono de cada módulo — lo usan ModuloCard.jsx
// (grid público de /modulos) y DashboardSidebar.jsx (nav del panel).
export const MODULO_ICON = {
  almacen: Warehouse,
  calidad: FlaskConical,
  produccion: Factory,
  compras: ShoppingCart,
  contabilidad: Calculator,
  gerencia: Briefcase,
  mantenimiento: Wrench,
  despacho: Truck,
}

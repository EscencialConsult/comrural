import { Wheat } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionExistenciasAlmacen from '../components/almacen/SeccionExistenciasAlmacen.jsx'

// Hermana de "Inventario" (config/gruposMaestros.js) — Existencias
// dividida por categoría, ver SeccionExistenciasAlmacen.jsx (prop
// `grupoFijo`) para el detalle de por qué es mockup.
export default function PanelInventarioMateriaPrima() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Wheat className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Existencias — Materia Prima</h1>
          <p className="text-sm text-marron-cafe/60">Stock disponible y bloqueado de materia prima.</p>
        </div>
      </header>

      <SeccionExistenciasAlmacen grupoFijo="Materia Prima" />
    </main>
  )
}

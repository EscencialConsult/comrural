import { useState } from 'react'
import { PackagePlus, PackageMinus, Package } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionIngresoProductoTerminado from '../components/almacen/SeccionIngresoProductoTerminado.jsx'
import SeccionSalidaProductoTerminado from '../components/almacen/SeccionSalidaProductoTerminado.jsx'

// Mismo criterio que Envases y Embalaje (PanelAlmacenEnvases.jsx): Ingreso
// y Salida son el mismo ciclo de vida de un lote de PT, van agrupados en
// subpestañas locales bajo un solo ítem de sidebar.
const SUBPESTAÑAS_PT = [
  { id: 'ingreso', nombre: 'Ingreso', Icon: PackagePlus },
  { id: 'salida', nombre: 'Salida', Icon: PackageMinus },
]

// Sub-item nuevo de "Almacén" en el sidebar (config/gruposMaestros.js).
// Solo Producto Terminado Local (RP-20) — el de exportación lo controla
// Producción, ver ControlProductoAlmacen.jsx.
export default function PanelAlmacenProductoTerminado() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')
  const [subPestaña, setSubPestaña] = useState('ingreso')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Package className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Producto Terminado</h1>
          <p className="text-sm text-marron-cafe/60">Ingreso y salida de producto terminado local (PTL).</p>
        </div>
      </header>

      <PillTabs pestañas={SUBPESTAÑAS_PT} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'ingreso' && <SeccionIngresoProductoTerminado />}
      {subPestaña === 'salida' && <SeccionSalidaProductoTerminado />}
    </main>
  )
}

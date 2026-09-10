import { useState } from 'react'
import { PackagePlus, PackageMinus, Boxes } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionIngresoEnvases from '../components/almacen/SeccionIngresoEnvases.jsx'
import SeccionSalidaEnvases from '../components/almacen/SeccionSalidaEnvases.jsx'

// Subpestañas locales (PillTabs, no rutas) — mismo patrón que
// SeccionAreaB.jsx: Ingreso y Salida son el mismo flujo de material
// (Envases/Embalaje/Insumos de proceso), no dos pantallas sin relación, así
// que van agrupadas bajo un solo ítem de sidebar en vez de uno por cada una.
const SUBPESTAÑAS_ENVASES = [
  { id: 'ingreso', nombre: 'Ingreso', Icon: PackagePlus },
  { id: 'salida', nombre: 'Salida', Icon: PackageMinus },
]

// Sub-item nuevo de "Almacén" en el sidebar (config/gruposMaestros.js),
// mismo permiso que el resto — ver SeccionIngresoEnvases.jsx y
// SeccionSalidaEnvases.jsx para el detalle de por qué son mockup.
export default function PanelAlmacenEnvases() {
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
          <Boxes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Envases y Embalaje</h1>
          <p className="text-sm text-marron-cafe/60">Ingreso y salida de envases, embalaje e insumos de proceso.</p>
        </div>
      </header>

      <PillTabs pestañas={SUBPESTAÑAS_ENVASES} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'ingreso' && <SeccionIngresoEnvases />}
      {subPestaña === 'salida' && <SeccionSalidaEnvases />}
    </main>
  )
}

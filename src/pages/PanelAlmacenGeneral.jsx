import { useState } from 'react'
import { PackagePlus, PackageMinus, Boxes, HardHat, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionIngresoAlmacenGeneral from '../components/almacen/SeccionIngresoAlmacenGeneral.jsx'
import SeccionSalidaAlmacenGeneral from '../components/almacen/SeccionSalidaAlmacenGeneral.jsx'
import SeccionEntregaIndumentariaEpp from '../components/almacen/SeccionEntregaIndumentariaEpp.jsx'
import SeccionBajaAlmacen from '../components/almacen/SeccionBajaAlmacen.jsx'

// Reorganización pedida por el usuario: 13 ítems de sidebar eran demasiados
// — Indumentaria/EPP y Bajas se mudan acá como subpestañas (mismo criterio
// que Ingreso/Salida), en vez de tener cada una su propio ítem de sidebar.
const SUBPESTAÑAS_GENERAL = [
  { id: 'ingreso', nombre: 'Ingreso', Icon: PackagePlus },
  { id: 'salida', nombre: 'Salida', Icon: PackageMinus },
  { id: 'indumentaria-epp', nombre: 'Indumentaria y EPP', Icon: HardHat },
  { id: 'bajas', nombre: 'Bajas', Icon: Trash2 },
]

// Sub-item de "Almacén" (config/gruposMaestros.js) — sección 2.4 del
// relevamiento: escritorio, limpieza, mantenimiento, solicitudes de
// compra, más Indumentaria/EPP y Bajas agrupadas acá (ver nota arriba).
export default function PanelAlmacenGeneral() {
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
          <h1 className="text-2xl font-extrabold text-marron-cafe">Almacén General</h1>
          <p className="text-sm text-marron-cafe/60">Escritorio, limpieza, mantenimiento, indumentaria/EPP, solicitudes de compra y bajas.</p>
        </div>
      </header>

      <PillTabs pestañas={SUBPESTAÑAS_GENERAL} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'ingreso' && <SeccionIngresoAlmacenGeneral />}
      {subPestaña === 'salida' && <SeccionSalidaAlmacenGeneral />}
      {subPestaña === 'indumentaria-epp' && <SeccionEntregaIndumentariaEpp />}
      {subPestaña === 'bajas' && <SeccionBajaAlmacen />}
    </main>
  )
}

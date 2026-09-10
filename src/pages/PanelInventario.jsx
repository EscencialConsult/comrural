import { useState } from 'react'
import { ClipboardCheck, Repeat, SlidersHorizontal, PackagePlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionInventarioAlmacen from '../components/almacen/SeccionInventarioAlmacen.jsx'
import SeccionAjusteInventario from '../components/almacen/SeccionAjusteInventario.jsx'
import SeccionAltaItem from '../components/almacen/SeccionAltaItem.jsx'

// Subpestañas locales de "Inventario" (la raíz del grupo, ver
// config/gruposMaestros.js — las pastillas de arriba de la pantalla las
// arma GrupoTabs.jsx solo, no hace falta nada acá para eso). Conteo es el
// mensual/cíclico que antes se llamaba simplemente "Inventario" a secas;
// se renombra a "Conteo" para no repetir el nombre de la pestaña padre.
const SUBPESTAÑAS_INVENTARIO = [
  { id: 'conteo', nombre: 'Conteo', Icon: Repeat },
  { id: 'ajustes', nombre: 'Ajustes', Icon: SlidersHorizontal },
  { id: 'alta-item', nombre: 'Alta de Ítem', Icon: PackagePlus },
]

export default function PanelInventario() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')
  const [subPestaña, setSubPestaña] = useState('conteo')

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ClipboardCheck className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Inventario</h1>
          <p className="text-sm text-marron-cafe/60">Conteo mensual/cíclico, ajustes y alta de ítems.</p>
        </div>
      </header>

      <PillTabs pestañas={SUBPESTAÑAS_INVENTARIO} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'conteo' && <SeccionInventarioAlmacen />}
      {subPestaña === 'ajustes' && <SeccionAjusteInventario />}
      {subPestaña === 'alta-item' && <SeccionAltaItem />}
    </main>
  )
}

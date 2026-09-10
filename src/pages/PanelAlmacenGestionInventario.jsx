import { useState } from 'react'
import { Boxes, ClipboardCheck, ArrowLeftRight, Undo2, SlidersHorizontal, PackagePlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionExistenciasAlmacen from '../components/almacen/SeccionExistenciasAlmacen.jsx'
import SeccionInventarioAlmacen from '../components/almacen/SeccionInventarioAlmacen.jsx'
import SeccionAlmacenIntermedio from '../components/almacen/SeccionAlmacenIntermedio.jsx'
import SeccionDevolucionAlmacen from '../components/almacen/SeccionDevolucionAlmacen.jsx'
import SeccionAjusteInventario from '../components/almacen/SeccionAjusteInventario.jsx'
import SeccionAltaItem from '../components/almacen/SeccionAltaItem.jsx'

// Reorganización pedida por el usuario: Existencias, Inventario, Almacén
// Intermedio, Devoluciones, Ajustes y Alta de Ítem tenían cada una su
// propio ítem de sidebar (6 en total) — se agrupan acá bajo un solo ítem
// de "Almacén" con subpestañas locales, mismo patrón que Envases/PT/
// General. Todas menos Almacén Intermedio ya venían de pantallas propias,
// ver cada Seccion*.jsx para el detalle de por qué son mockup.
const SUBPESTAÑAS_GESTION = [
  { id: 'inventario', nombre: 'Inventario', Icon: ClipboardCheck },
  { id: 'existencias', nombre: 'Existencias', Icon: Boxes },
  { id: 'intermedio', nombre: 'Almacén Intermedio', Icon: ArrowLeftRight },
  { id: 'devoluciones', nombre: 'Devoluciones', Icon: Undo2 },
  { id: 'ajustes', nombre: 'Ajustes', Icon: SlidersHorizontal },
  { id: 'alta-item', nombre: 'Alta de Ítem', Icon: PackagePlus },
]

export default function PanelAlmacenGestionInventario() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')
  // Arranca en "inventario" (no "existencias") para que el nombre de la
  // pantalla coincida con lo primero que se ve al entrar — la pestaña de
  // sidebar y la subpestaña interna se llaman igual a propósito.
  const [subPestaña, setSubPestaña] = useState('inventario')

  if (!puedeVer) {
    return <AccesoDenegado titulo="No tenés acceso a este módulo" mensaje="Tu rol actual no incluye Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Boxes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Inventario</h1>
          <p className="text-sm text-marron-cafe/60">Consulta de stock, conteos, buffer de producción, devoluciones, ajustes y alta de ítems.</p>
        </div>
      </header>

      <PillTabs pestañas={SUBPESTAÑAS_GESTION} activa={subPestaña} onCambiar={setSubPestaña} />

      {subPestaña === 'existencias' && <SeccionExistenciasAlmacen />}
      {subPestaña === 'inventario' && <SeccionInventarioAlmacen />}
      {subPestaña === 'intermedio' && <SeccionAlmacenIntermedio />}
      {subPestaña === 'devoluciones' && <SeccionDevolucionAlmacen />}
      {subPestaña === 'ajustes' && <SeccionAjusteInventario />}
      {subPestaña === 'alta-item' && <SeccionAltaItem />}
    </main>
  )
}

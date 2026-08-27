import { Warehouse } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionAreaA from '../components/produccion/SeccionAreaA.jsx'

// Ruta propia (ver config/gruposMaestros.js + App.jsx) — mismo criterio que
// PanelCalidadRecepcion.jsx/PanelAlmacenRecepcion.jsx: pantalla hermana de
// "Producción" (Inicio), a la que se salta con las pastillas de arriba
// (GrupoTabs.jsx) sin volver al menú lateral.
export default function PanelProduccionAreaA() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('produccion:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Producción." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Warehouse className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Área A</h1>
          <p className="text-sm text-marron-cafe/60">Recepción de materia prima y secado.</p>
        </div>
      </header>

      <SeccionAreaA />
    </main>
  )
}

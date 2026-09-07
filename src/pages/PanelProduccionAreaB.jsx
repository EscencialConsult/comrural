import { Boxes } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionAreaB from '../components/produccion/SeccionAreaB.jsx'

// Ruta propia (ver config/gruposMaestros.js + App.jsx) — hermana de "Área A"
// (PanelProduccionAreaA.jsx), a la que se salta con las pastillas de arriba
// (GrupoTabs.jsx) sin volver al menú lateral. Adentro vive su propia fila de
// subpestañas locales (PillTabs, ver SeccionAreaB.jsx) — "Control de
// Existencias" es la primera.
export default function PanelProduccionAreaB() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('produccion:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Producción." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Boxes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Área B</h1>
          <p className="text-sm text-marron-cafe/60">Seguimiento de existencias de materia prima en proceso.</p>
        </div>
      </header>

      <SeccionAreaB />
    </main>
  )
}

import { ClipboardList } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionEntregaMateriaPrima from '../components/almacen/SeccionEntregaMateriaPrima.jsx'

// Sub-item nuevo de "Almacén" en el sidebar (config/gruposMaestros.js),
// mismo permiso que "Recepción" (almacen:read) — ver
// SeccionEntregaMateriaPrima.jsx para el detalle de por qué es mockup.
export default function PanelAlmacenEntrega() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <ClipboardList className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Entrega de Materia Prima</h1>
          <p className="text-sm text-marron-cafe/60">Solicitud y entrega de lotes completos a Producción.</p>
        </div>
      </header>

      <SeccionEntregaMateriaPrima />
    </main>
  )
}

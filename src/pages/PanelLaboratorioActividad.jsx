import { Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionActividad from '../components/laboratorio/SeccionActividad.jsx'

// Hermana de PanelLaboratorio.jsx (ver ese archivo para el porqué del
// cambio de estructura) — antes era la pastilla local "actividad".
export default function PanelLaboratorioActividad() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('samples:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Laboratorio." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Activity className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Actividad</h1>
          <p className="text-sm text-marron-cafe/60">Historial de acciones sobre muestras y análisis.</p>
        </div>
      </header>

      <SeccionActividad />
    </main>
  )
}

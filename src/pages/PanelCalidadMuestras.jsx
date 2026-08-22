import { TestTubes } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import SeccionMuestras from '../components/calidad/SeccionMuestras.jsx'

// Sub-item de "Calidad" en el sidebar (config/gruposMaestros.js), mismo
// mecanismo que "Inspección" (PanelCalidadRecepcion.jsx) y "Remito"
// (PanelCalidadRemito.jsx) — el Inicio del área (PanelCalidad.jsx) quedó
// como solo analytics, esta pantalla es la de trabajo real. Reusa
// SeccionMuestras.jsx tal cual, el MISMO componente que PanelLaboratorio.jsx
// — pedido explícito: la pestaña Muestras vive en los dos módulos, no una
// copia en cada uno.
export default function PanelCalidadMuestras() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('samples:read')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Muestras." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <TestTubes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Muestras</h1>
          <p className="text-sm text-marron-cafe/60">Muestreo y solicitudes de análisis de materia prima.</p>
        </div>
      </header>

      <SeccionMuestras />
    </main>
  )
}

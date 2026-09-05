import { useState } from 'react'
import { TestTubes, ClipboardList, ListChecks, Activity } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import SeccionPendientes from '../components/laboratorio/SeccionPendientes.jsx'
import SeccionSolicitudes from '../components/laboratorio/SeccionSolicitudes.jsx'
import SeccionActividad from '../components/laboratorio/SeccionActividad.jsx'

// Laboratorio — módulo aparte de Calidad en el sidebar (pedido explícito).
// "Muestras" (crear muestra + solicitar análisis) ya NO vive acá — quedó
// exclusiva de Calidad (PanelCalidadMuestras.jsx, sub-item del sidebar) para
// no duplicar la misma pantalla en dos módulos. "Pendientes" es la cola de
// trabajo propia de Laboratorio: todas las solicitudes que pidió Calidad,
// con el botón "Recibir" para las que están en PENDIENTE_MUESTRA — a
// diferencia de "crear/solicitar" (que es cosa de Calidad), "recibir" es
// acción de Laboratorio (pedido explícito, ver SeccionPendientes.jsx).
// "Solicitudes" separa lo YA recibido por dónde se procesa cada ensayo,
// según la modalidad real asignada en "Asignar laboratorio" (ver
// FormularioAsignarLaboratorio.jsx/SeccionSolicitudes.jsx) — backend real:
// POST .../assign-modality, analysis-executions, external-shipments y
// laboratory-reports (ver docs/laboratory-executions-shipments-reports.md
// del backend). También es donde vive "Analizar" para lo asignado a
// Laboratorio interno (pedido explícito, ya no en Pendientes).
const PESTAÑAS_LABORATORIO = [
  { id: 'pendientes', nombre: 'Recepción de muestras', Icon: ClipboardList },
  { id: 'solicitudes', nombre: 'Análisis', Icon: ListChecks },
  { id: 'actividad', nombre: 'Actividad', Icon: Activity },
]

export default function PanelLaboratorio() {
  const { permisos } = useAuth()
  // samples:read es el permiso técnico real de este módulo (no calidad:read,
  // que solo gatea visibilidad de sidebar) — mismo criterio que la pestaña
  // "Lotes" de Compras se gatea con lots:read.
  const puedeVer = permisos.has('samples:read')

  const [pestaña, setPestaña] = useState('pendientes')

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Laboratorio." />
  }

  return (
    <main className="flex w-full flex-col gap-8 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <TestTubes className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Laboratorio</h1>
          <p className="text-sm text-marron-cafe/60">Muestreo y solicitudes de análisis de materia prima.</p>
        </div>
      </header>

      <PillTabs pestañas={PESTAÑAS_LABORATORIO} activa={pestaña} onCambiar={setPestaña} />

      {pestaña === 'pendientes' && <SeccionPendientes />}

      {pestaña === 'solicitudes' && <SeccionSolicitudes />}

      {pestaña === 'actividad' && <SeccionActividad />}
    </main>
  )
}

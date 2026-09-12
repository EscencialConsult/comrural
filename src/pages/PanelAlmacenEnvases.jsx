import { useMemo, useState } from 'react'
import { PackagePlus, PackageMinus, Boxes, Undo2, Truck, ChevronLeft, Play } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import Button from '../components/Button.jsx'
import BarraFiltros from '../components/almacen/BarraFiltros.jsx'
import FormSelect from '../components/FormSelect.jsx'
import SeccionIngresoEnvases from '../components/almacen/SeccionIngresoEnvases.jsx'
import SeccionSalidaEnvases from '../components/almacen/SeccionSalidaEnvases.jsx'
import SeccionDevolucionAlmacen from '../components/almacen/SeccionDevolucionAlmacen.jsx'
import { LLEGADAS_PROGRAMADAS_ENVASES_EJEMPLO } from '../data/almacenMock.js'

const SUBALMACENES_ENVASES = [...new Set(LLEGADAS_PROGRAMADAS_ENVASES_EJEMPLO.map((l) => l.subalmacen))]

// Subpestañas locales (PillTabs, no rutas) — mismo patrón que
// SeccionAreaB.jsx: Ingreso y Salida son el mismo flujo de material
// (Envases/Embalaje/Insumos de proceso), no dos pantallas sin relación, así
// que van agrupadas bajo un solo ítem de sidebar en vez de uno por cada una.
// "Devoluciones" se suma acá (reorganización pedida por el usuario): cada
// división tiene su propia subpestaña de devoluciones — la de Materia
// Prima vive en PanelAlmacenRecepcion.jsx, esta es la de Envases/Insumos.
const SUBPESTAÑAS_ENVASES = [
  { id: 'ingreso', nombre: 'Ingreso', Icon: PackagePlus },
  { id: 'salida', nombre: 'Salida', Icon: PackageMinus },
  { id: 'devoluciones', nombre: 'Devoluciones', Icon: Undo2 },
]

// Sub-item nuevo de "Almacén" en el sidebar (config/gruposMaestros.js),
// mismo permiso que el resto. "Ingreso" es mockup puro (ver
// SeccionIngresoEnvases.jsx). "Salida" es un listado real de notas
// P-ADM-03/R-20 (ver SeccionSalidaEnvases.jsx) — el formulario completo
// (con la sección §1 "Requerimiento del área" todavía mockup) vive en
// ModalSalidaEnvases.jsx, abierto desde el botón "Registrar salida".
export default function PanelAlmacenEnvases() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')
  const [subPestaña, setSubPestaña] = useState('ingreso')
  // Ingreso ahora tiene lista + formulario, mismo patrón que
  // PanelAlmacenRecepcion.jsx (lotAbierto) — acá no hay ningún lote/
  // entidad real detrás, así que "abrir" el formulario no depende de un
  // id: cualquier fila de la lista, o "Llegada sin aviso", llevan al MISMO
  // SeccionIngresoEnvases.jsx en blanco. Es mockup puro, simulando el
  // mismo flujo de "programado vs. sin aviso" que ya existe de verdad en
  // Recepción de MP.
  const [formularioIngresoAbierto, setFormularioIngresoAbierto] = useState(false)

  const cambiarSubPestaña = (id) => {
    setFormularioIngresoAbierto(false)
    setSubPestaña(id)
  }

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

      <PillTabs pestañas={SUBPESTAÑAS_ENVASES} activa={subPestaña} onCambiar={cambiarSubPestaña} />

      {subPestaña === 'ingreso' &&
        (formularioIngresoAbierto ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setFormularioIngresoAbierto(false)}
              className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
              Volver al listado
            </button>
            <SeccionIngresoEnvases />
          </div>
        ) : (
          <ListaLlegadasProgramadas onAbrirFormulario={() => setFormularioIngresoAbierto(true)} />
        ))}
      {subPestaña === 'salida' && <SeccionSalidaEnvases />}
      {subPestaña === 'devoluciones' && <SeccionDevolucionAlmacen />}
    </main>
  )
}

// Mismo formato que la lista de Recepción de MP (tarjetas en mobile, tabla
// desde md), pero sin backend detrás — el botón "Recepcionar" de cada fila
// y "Llegada sin aviso" hacen exactamente lo mismo (abrir el formulario en
// blanco), a diferencia de MP donde "sin aviso" sí crea un lote real.
function ListaLlegadasProgramadas({ onAbrirFormulario }) {
  const [busqueda, setBusqueda] = useState('')
  const [subalmacen, setSubalmacen] = useState('')

  const hayFiltrosActivos = busqueda !== '' || subalmacen !== ''
  const limpiarFiltros = () => {
    setBusqueda('')
    setSubalmacen('')
  }

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return LLEGADAS_PROGRAMADAS_ENVASES_EJEMPLO.filter((l) => {
      if (subalmacen && l.subalmacen !== subalmacen) return false
      if (q && !l.item.toLowerCase().includes(q) && !l.proveedor.toLowerCase().includes(q)) return false
      return true
    })
  }, [busqueda, subalmacen])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-extrabold text-marron-cafe">Pendientes de recepción</h2>
        <Button variant="secondary" className="gap-1.5 px-3.5 py-2 text-sm" onClick={onAbrirFormulario}>
          <Truck className="size-4" strokeWidth={2} />
          Llegada sin aviso
        </Button>
      </div>

      <BarraFiltros
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        placeholderBusqueda="Ítem o proveedor…"
        hayFiltrosActivos={hayFiltrosActivos}
        onLimpiar={limpiarFiltros}
      >
        <FormSelect label="Subalmacén" value={subalmacen} onChange={(e) => setSubalmacen(e.target.value)} className="min-w-[160px] flex-1 sm:max-w-[200px]">
          <option value="">Todos</option>
          {SUBALMACENES_ENVASES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </FormSelect>
      </BarraFiltros>

      <div className="flex flex-col gap-3 md:hidden">
        {filtradas.map((l) => (
          <div key={l.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-marron-cafe">{l.item}</p>
              <p className="truncate text-xs text-marron-cafe/60">{l.proveedor}</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-marron-tierra/10 pt-2">
              <span className="text-xs text-marron-cafe/60">
                {new Date(l.fechaProgramada).toLocaleDateString('es-BO', { dateStyle: 'medium' })} · N° {l.numeroSolicitud}
              </span>
              <Button
                variant="secondary"
                className="gap-1.5 border-2 border-rojo-pasankalla! px-3 py-1.5 text-xs"
                onClick={onAbrirFormulario}
              >
                <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                Recepcionar
              </Button>
            </div>
          </div>
        ))}
        {filtradas.length === 0 && (
          <p className="rounded-2xl bg-marron-tierra/5 px-4 py-6 text-center text-sm text-marron-cafe/50">
            No hay llegadas programadas.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 md:block">
        <table className="w-full min-w-[720px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[20%]" />
            <col className="w-[12%]" />
            <col className="w-[12%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
              <th className="px-4 py-3">Ítem</th>
              <th className="px-4 py-3">Proveedor</th>
              <th className="px-4 py-3">Subalmacén</th>
              <th className="px-4 py-3">N° solicitud</th>
              <th className="px-4 py-3">Fecha programada</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                <td className="truncate px-4 py-3 text-marron-cafe" title={l.item}>
                  {l.item}
                </td>
                <td className="truncate px-4 py-3 text-marron-cafe" title={l.proveedor}>
                  {l.proveedor}
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-marron-cafe/70">{l.subalmacen}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{l.numeroSolicitud}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">
                  <div className="flex items-center justify-between gap-3">
                    <span>{new Date(l.fechaProgramada).toLocaleDateString('es-BO', { dateStyle: 'medium' })}</span>
                    <Button
                      variant="secondary"
                      className="gap-1.5 border-2 border-rojo-pasankalla! px-3 py-1.5 text-xs whitespace-nowrap"
                      onClick={onAbrirFormulario}
                    >
                      <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                      Recepcionar
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  No hay llegadas programadas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

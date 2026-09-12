import { useMemo, useState } from 'react'
import { PackagePlus, PackageMinus, Package, ChevronLeft, Play, AlertTriangle, History } from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'
import AccesoDenegado from '../components/dashboard/AccesoDenegado.jsx'
import PillTabs from '../components/dashboard/PillTabs.jsx'
import Button from '../components/Button.jsx'
import BarraFiltros from '../components/almacen/BarraFiltros.jsx'
import SeccionIngresoProductoTerminado from '../components/almacen/SeccionIngresoProductoTerminado.jsx'
import SeccionSalidaProductoTerminado from '../components/almacen/SeccionSalidaProductoTerminado.jsx'
import SeccionHistorialSalidaProductoTerminado from '../components/almacen/SeccionHistorialSalidaProductoTerminado.jsx'
import { LLEGADAS_PROGRAMADAS_PT_EJEMPLO, EXISTENCIAS_EJEMPLO } from '../data/almacenMock.js'

// Lotes de PT disponibles para despacho — mismos datos que Existencias →
// Producto Terminado (PanelInventarioProductoTerminado.jsx), para que el
// saldo que se ve acá coincida con el de esa pantalla en vez de inventar
// dos listas separadas. Ordenados por vencimiento ascendente: es
// literalmente el orden FEFO que describe la narrativa (P-05) — "priorizar
// el lote con vencimiento más próximo". Solo lotes con saldo > 0 — pedido
// explícito: un lote agotado desaparece de "Salida" en vez de quedar
// listado con "0 disponibles" (queda igual visible en el historial, ver
// SeccionHistorialSalidaProductoTerminado.jsx).
const LOTES_PT_DISPONIBLES = EXISTENCIAS_EJEMPLO.filter((e) => e.grupo === 'Producto Terminado' && e.disponible > 0).sort(
  (a, b) => new Date(a.vencimiento) - new Date(b.vencimiento),
)

// Mismo criterio que Envases y Embalaje (PanelAlmacenEnvases.jsx): Ingreso
// y Salida son el mismo ciclo de vida de un lote de PT, van agrupados en
// subpestañas locales bajo un solo ítem de sidebar. "Historial" se suma
// acá (pedido explícito) — separado de "Salida" porque esa lista solo debe
// mostrar lotes con saldo pendiente de despacho, no lo ya despachado.
const SUBPESTAÑAS_PT = [
  { id: 'ingreso', nombre: 'Ingreso', Icon: PackagePlus },
  { id: 'salida', nombre: 'Salida', Icon: PackageMinus },
  { id: 'historial', nombre: 'Historial', Icon: History },
]

// Sub-item nuevo de "Almacén" en el sidebar (config/gruposMaestros.js).
// Solo Producto Terminado Local (RP-20) — el de exportación lo controla
// Producción, ver ControlProductoAlmacen.jsx.
export default function PanelAlmacenProductoTerminado() {
  const { permisos } = useAuth()
  const puedeVer = permisos.has('almacen:read')
  const [subPestaña, setSubPestaña] = useState('ingreso')
  // Ingreso = lista + formulario, mismo patrón que Envases y Recepción de
  // MP — pero SIN botón de "llegada sin aviso" (pedido explícito: PT
  // siempre llega programado, Producción avisa con anticipación).
  const [formularioIngresoAbierto, setFormularioIngresoAbierto] = useState(false)
  // Salida = tabla de lotes disponibles + formulario, mismo patrón que
  // Ingreso — acá SÍ puede haber más de una salida por lote (a diferencia
  // de la entrega de MP, que es del lote completo): la narrativa (P-05)
  // habla de descontar "la cantidad" del lote, no cerrarlo, por eso el
  // botón dice "Registrar salida" y no "Despachar todo".
  const [formularioSalidaAbierto, setFormularioSalidaAbierto] = useState(false)

  const cambiarSubPestaña = (id) => {
    setFormularioIngresoAbierto(false)
    setFormularioSalidaAbierto(false)
    setSubPestaña(id)
  }

  if (!puedeVer) {
    return <AccesoDenegado mensaje="No tenés acceso a Almacén." />
  }

  return (
    <main className="flex w-full flex-col gap-6 p-6 md:p-10">
      <header className="flex items-center gap-3">
        <div className="rounded-full bg-verde-hoja/10 p-3">
          <Package className="size-6 text-verde-bosque" strokeWidth={1.75} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-marron-cafe">Producto Terminado</h1>
          <p className="text-sm text-marron-cafe/60">Ingreso y salida de producto terminado local (PTL).</p>
        </div>
      </header>

      <PillTabs pestañas={SUBPESTAÑAS_PT} activa={subPestaña} onCambiar={cambiarSubPestaña} />

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
            <SeccionIngresoProductoTerminado />
          </div>
        ) : (
          <ListaLlegadasProgramadas onAbrirFormulario={() => setFormularioIngresoAbierto(true)} />
        ))}
      {subPestaña === 'salida' &&
        (formularioSalidaAbierto ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setFormularioSalidaAbierto(false)}
              className="flex w-fit items-center gap-1 text-sm font-medium text-marron-cafe/60 transition-colors duration-150 hover:text-marron-cafe"
            >
              <ChevronLeft className="size-4" strokeWidth={1.75} />
              Volver al listado
            </button>
            <SeccionSalidaProductoTerminado />
          </div>
        ) : (
          <ListaLotesDisponibles onAbrirFormulario={() => setFormularioSalidaAbierto(true)} />
        ))}
      {subPestaña === 'historial' && <SeccionHistorialSalidaProductoTerminado />}
    </main>
  )
}

// Mismo formato que Envases/Recepción (tarjetas en mobile, tabla desde
// md), sin backend detrás — el botón "Recepcionar" abre el formulario en
// blanco. Sin "llegada sin aviso": ver nota arriba.
function ListaLlegadasProgramadas({ onAbrirFormulario }) {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return LLEGADAS_PROGRAMADAS_PT_EJEMPLO
    return LLEGADAS_PROGRAMADAS_PT_EJEMPLO.filter((l) => l.producto.toLowerCase().includes(q) || l.loteProduccion.toLowerCase().includes(q))
  }, [busqueda])

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-extrabold text-marron-cafe">Pendientes de recepción</h2>

      <BarraFiltros
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        placeholderBusqueda="Producto o lote…"
        hayFiltrosActivos={busqueda !== ''}
        onLimpiar={() => setBusqueda('')}
      />

      <div className="flex flex-col gap-3 md:hidden">
        {filtradas.map((l) => (
          <div key={l.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-marron-cafe">{l.producto}</p>
              <p className="truncate text-xs text-marron-cafe/60">Lote de producción {l.loteProduccion}</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-marron-tierra/10 pt-2">
              <span className="text-xs text-marron-cafe/60">
                {new Date(l.fechaProgramada).toLocaleDateString('es-BO', { dateStyle: 'medium' })} · ~{l.cantidadEstimada} u.
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
        <table className="w-full min-w-[680px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[30%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Lote de producción</th>
              <th className="px-4 py-3">Fecha de elaboración</th>
              <th className="px-4 py-3">Cantidad estimada</th>
              <th className="px-4 py-3">Fecha programada</th>
            </tr>
          </thead>
          <tbody>
            {filtradas.map((l) => (
              <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                <td className="truncate px-4 py-3 text-marron-cafe" title={l.producto}>
                  {l.producto}
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-marron-cafe/70">{l.loteProduccion}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">
                  {new Date(l.fechaElaboracion).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
                </td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">{l.cantidadEstimada}</td>
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

// Días de aviso para marcar "próximo a vencer" — mismo umbral de ejemplo
// que usa SeccionExistenciasAlmacen.jsx (sin definición oficial en la
// documentación).
const DIAS_AVISO_VENCIMIENTO = 60
const proximoAVencer = (vencimiento) => {
  const dias = (new Date(vencimiento) - new Date()) / 86400000
  return dias >= 0 && dias <= DIAS_AVISO_VENCIMIENTO
}

// Lotes de PT con saldo disponible, ordenados FEFO — "Registrar salida"
// abre el mismo formulario para cualquier lote (mockup, sin
// preseleccionarlo): el formulario ya trae su propio selector de lote por
// fila.
function ListaLotesDisponibles({ onAbrirFormulario }) {
  const [busqueda, setBusqueda] = useState('')

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return LOTES_PT_DISPONIBLES
    return LOTES_PT_DISPONIBLES.filter((l) => l.item.toLowerCase().includes(q) || l.lote.toLowerCase().includes(q))
  }, [busqueda])

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-extrabold text-marron-cafe">Lotes disponibles para despacho</h2>

      <BarraFiltros
        busqueda={busqueda}
        onBusquedaChange={(e) => setBusqueda(e.target.value)}
        placeholderBusqueda="Producto o lote…"
        hayFiltrosActivos={busqueda !== ''}
        onLimpiar={() => setBusqueda('')}
      />

      <div className="flex flex-col gap-3 md:hidden">
        {filtrados.map((l) => (
          <div key={l.id} className="flex flex-col gap-2 rounded-2xl bg-marron-tierra/5 p-4">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-marron-cafe">{l.item}</p>
              <p className="truncate font-mono text-xs text-marron-cafe/60">Lote {l.lote}</p>
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-marron-tierra/10 pt-2">
              <span className={`flex items-center gap-1 text-xs ${proximoAVencer(l.vencimiento) ? 'font-semibold text-marron-arcilla' : 'text-marron-cafe/60'}`}>
                {proximoAVencer(l.vencimiento) && <AlertTriangle className="size-3.5 shrink-0" strokeWidth={2} />}
                {l.disponible} {l.unidad} disponibles · vence {new Date(l.vencimiento).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
              </span>
              <Button
                variant="secondary"
                className="gap-1.5 border-2 border-verde-bosque! px-3 py-1.5 text-xs text-verde-bosque!"
                onClick={onAbrirFormulario}
              >
                <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                Registrar salida
              </Button>
            </div>
          </div>
        ))}
        {filtrados.length === 0 && (
          <p className="rounded-2xl bg-marron-tierra/5 px-4 py-6 text-center text-sm text-marron-cafe/50">
            No hay lotes con saldo disponible.
          </p>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-3xl bg-marron-tierra/5 md:block">
        <table className="w-full min-w-[680px] table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[16%]" />
            <col className="w-[16%]" />
            <col className="w-[18%]" />
            <col className="w-[18%]" />
          </colgroup>
          <thead>
            <tr className="border-b border-marron-tierra/15 bg-marron-tierra/10 text-center text-xs font-bold uppercase tracking-wide text-marron-cafe/80">
              <th className="px-4 py-3">Producto</th>
              <th className="px-4 py-3">Lote</th>
              <th className="px-4 py-3">Disponible</th>
              <th className="px-4 py-3">Vencimiento</th>
              <th className="px-4 py-3">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((l) => (
              <tr key={l.id} className="border-b border-marron-tierra/10 last:border-b-0 hover:bg-marron-tierra/5">
                <td className="truncate px-4 py-3 text-marron-cafe" title={l.item}>
                  {l.item}
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-marron-cafe/70">{l.lote}</td>
                <td className="px-4 py-3 text-center text-marron-cafe/70">
                  {l.disponible} {l.unidad}
                </td>
                <td className="px-4 py-3 text-center text-xs">
                  <span className={`inline-flex items-center gap-1 ${proximoAVencer(l.vencimiento) ? 'font-semibold text-marron-arcilla' : 'text-marron-cafe/60'}`}>
                    {proximoAVencer(l.vencimiento) && <AlertTriangle className="size-3.5" strokeWidth={2} />}
                    {new Date(l.vencimiento).toLocaleDateString('es-BO', { dateStyle: 'medium' })}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <Button
                    variant="secondary"
                    className="gap-1.5 border-2 border-verde-bosque! px-3 py-1.5 text-xs whitespace-nowrap text-verde-bosque!"
                    onClick={onAbrirFormulario}
                  >
                    <Play className="size-3.5 shrink-0" strokeWidth={2.25} />
                    Registrar salida
                  </Button>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-sm text-marron-cafe/50">
                  No hay lotes con saldo disponible.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

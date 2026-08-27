import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { PRESENTACIONES_COMERCIALES } from '../../../config/presentacionesComerciales'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import OpcionSiNo from '../../formularios/OpcionSiNo.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Skeleton from '../../Skeleton.jsx'

const PRODUCTOS = ['Quinua Blanca', 'Quinua Negra', 'Quinua Roja', 'Quinua Tricolor']

// Mismas 4 presentaciones reales de RP-19 (Volumen B) — el envase que se
// controla acá es justamente el que termina en una de esas presentaciones.
const TIPOS_ENVASE = PRESENTACIONES_COMERCIALES.map((p) => p.nombre)

const RECHAZOS_IMPUREZAS = [
  { key: 'paja', label: 'Paja' },
  { key: 'puntosCuarzo', label: 'Puntos cuarzo' },
  { key: 'piedrasVolcanicas', label: 'Piedras volcánicas' },
  { key: 'hecesAveRaton', label: 'Heces de ave/ratón' },
  { key: 'larvas', label: 'Larvas' },
  { key: 'lanaVidrio', label: 'Lana/vidrio' },
  { key: 'semillaSilvestre', label: 'Semilla silvestre' },
  { key: 'otros', label: 'Otros' },
]

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Envasador' },
  { rol: 'V.º B.º', puesto: 'Supervisor de Producción' },
]

const CABECERA_VACIA = { loteMpId: '', producto: '' }
const CONTROL_ENVASES_VACIO = { tipoEnvase: '', loteEnvase: '', ingresos: null, envasadas: null, malConfeccion: null, fallaCosturadora: null, otros: null }
const CONTROL_ETIQUETA_VACIO = { ingresos: null, etiquetadas: null, rotula: null, arrugado: null, otros: null }
const REPROCESO_VACIO = { sacos: null, bigBag: null, kraft: null, otros: null, etapaProceso: '' }
const RECHAZOS_VACIO = Object.fromEntries(RECHAZOS_IMPUREZAS.map((r) => [r.key, null]))

let siguienteFilaId = 1
function filaVacia() {
  return { id: siguienteFilaId++, hora: '', etiquetaCorrecta: null, empaqueCorrecto: null, peso: null, cantidadEnvasados: null }
}

const suma = (obj) => Object.values(obj).reduce((acc, v) => acc + (v ?? 0), 0)

// Formulario 6 — control de envasado de PT. RP-18: el lote de envase es
// DISTINTO del lote de MP (lo asigna Compras, no tiene relación con
// producto ni cliente) — por eso son dos campos separados en "Control de
// envases", nunca el mismo selector.
export default function EnvasadoProductoTerminado() {
  const [lotesMp, setLotesMp] = useState(null)
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [controlEnvases, setControlEnvases] = useState(CONTROL_ENVASES_VACIO)
  const [controlEtiqueta, setControlEtiqueta] = useState(CONTROL_ETIQUETA_VACIO)
  const [filas, setFilas] = useState([filaVacia()])
  const [rechazos, setRechazos] = useState(RECHAZOS_VACIO)
  const [reproceso, setReproceso] = useState(REPROCESO_VACIO)
  const { areaImprimibleRef, generandoPdf, generarPdf } = useGenerarPdf({ backgroundColor: '#faf4e8' })
  const { enviando, ejecutar } = useSolicitud()

  useEffect(() => {
    let cancelado = false
    produccionService.listarLotesMp().then((data) => !cancelado && setLotesMp(data))
    return () => {
      cancelado = true
    }
  }, [])

  const actualizarCabecera = (campo) => (valor) => setCabecera((c) => ({ ...c, [campo]: valor }))
  const actualizarEnvases = (campo) => (valor) => setControlEnvases((c) => ({ ...c, [campo]: valor }))
  const actualizarEtiqueta = (campo) => (valor) => setControlEtiqueta((c) => ({ ...c, [campo]: valor }))
  const actualizarReproceso = (campo) => (valor) => setReproceso((c) => ({ ...c, [campo]: valor }))
  const actualizarRechazo = (campo) => (valor) => setRechazos((c) => ({ ...c, [campo]: valor }))
  const actualizarFila = (id, campo) => (valor) => setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((fs) => [...fs, filaVacia()])
  const quitarFila = (id) => setFilas((fs) => fs.filter((f) => f.id !== id))

  const saldoEnvases =
    (controlEnvases.ingresos ?? 0) -
    ((controlEnvases.envasadas ?? 0) + (controlEnvases.malConfeccion ?? 0) + (controlEnvases.fallaCosturadora ?? 0) + (controlEnvases.otros ?? 0))
  const saldoEtiqueta =
    (controlEtiqueta.ingresos ?? 0) -
    ((controlEtiqueta.etiquetadas ?? 0) + (controlEtiqueta.rotula ?? 0) + (controlEtiqueta.arrugado ?? 0) + (controlEtiqueta.otros ?? 0))
  const totalRechazos = suma(rechazos)
  const totalReproceso = (reproceso.sacos ?? 0) + (reproceso.bigBag ?? 0) + (reproceso.kraft ?? 0) + (reproceso.otros ?? 0)

  const totalProducidas = filas.reduce((acc, f) => acc + (f.cantidadEnvasados ?? 0), 0)
  const unidadesProducidas = filas
    .filter((f) => f.etiquetaCorrecta === true && f.empaqueCorrecto === true)
    .reduce((acc, f) => acc + (f.cantidadEnvasados ?? 0), 0)

  const registrar = async () => {
    try {
      await ejecutar(() =>
        produccionService.registrarEnvasado({ cabecera, controlEnvases, controlEtiqueta, filas, rechazos, reproceso }),
      )
      toast.success('Registro de envasado guardado.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Envasado de Producto Terminado"
          codigo="I-PRO-16/R-01"
          version="02"
          acciones={
            <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
              <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
              {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
            </Button>
          }
        />

        <SeccionFormulario numero={1} titulo="Cabecera">
          {!lotesMp ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <FormSelect label="Lote MP" value={cabecera.loteMpId} onChange={(e) => actualizarCabecera('loteMpId')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {lotesMp.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} · {l.product}
                  </option>
                ))}
              </FormSelect>
              <FormSelect label="Producto" value={cabecera.producto} onChange={(e) => actualizarCabecera('producto')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {PRODUCTOS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Control de envases"
          nota="Lote de envase es distinto del lote de MP — lo asigna Compras, no tiene relación con producto ni cliente."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormSelect label="Tipo de envase" value={controlEnvases.tipoEnvase} onChange={(e) => actualizarEnvases('tipoEnvase')(e.target.value)}>
              <option value="">Seleccionar…</option>
              {TIPOS_ENVASE.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </FormSelect>
            <FormInput
              label="Lote envase"
              value={controlEnvases.loteEnvase}
              onChange={(e) => actualizarEnvases('loteEnvase')(e.target.value)}
              placeholder="Asignado por Compras"
            />
            <NumeroCampo label="Ingresos" valor={controlEnvases.ingresos} onChange={actualizarEnvases('ingresos')} />
            <NumeroCampo label="Envasadas" valor={controlEnvases.envasadas} onChange={actualizarEnvases('envasadas')} />
            <NumeroCampo label="Mal confección" valor={controlEnvases.malConfeccion} onChange={actualizarEnvases('malConfeccion')} />
            <NumeroCampo label="Falla costuradora" valor={controlEnvases.fallaCosturadora} onChange={actualizarEnvases('fallaCosturadora')} />
            <NumeroCampo label="Otros" valor={controlEnvases.otros} onChange={actualizarEnvases('otros')} />
            <CampoComputado label="Saldo" valor={saldoEnvases} />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={3} titulo="Control de etiqueta">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumeroCampo label="Ingresos" valor={controlEtiqueta.ingresos} onChange={actualizarEtiqueta('ingresos')} />
            <NumeroCampo label="Etiquetadas" valor={controlEtiqueta.etiquetadas} onChange={actualizarEtiqueta('etiquetadas')} />
            <NumeroCampo label="Rotula" valor={controlEtiqueta.rotula} onChange={actualizarEtiqueta('rotula')} />
            <NumeroCampo label="Arrugado" valor={controlEtiqueta.arrugado} onChange={actualizarEtiqueta('arrugado')} />
            <NumeroCampo label="Otros" valor={controlEtiqueta.otros} onChange={actualizarEtiqueta('otros')} />
            <CampoComputado label="Saldo" valor={saldoEtiqueta} />
          </div>
        </SeccionFormulario>

        <SeccionFormulario
          numero={4}
          titulo="Unidades etiquetadas y envasadas (por turno)"
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar lectura
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">N°</th>
                  <th className="px-3 py-2.5">Hora</th>
                  <th className="px-3 py-2.5">Etiqueta correcta</th>
                  <th className="px-3 py-2.5">Empaque correcto</th>
                  <th className="px-3 py-2.5">Peso</th>
                  <th className="px-3 py-2.5">Cantidad envasados</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                    <td className="px-3 py-2 text-center font-semibold text-marron-cafe/60">{i + 1}</td>
                    <td className="px-3 py-2">
                      <input
                        type="time"
                        value={f.hora}
                        onChange={(e) => actualizarFila(f.id, 'hora')(e.target.value)}
                        className="w-24 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <OpcionSiNo
                        valor={f.etiquetaCorrecta}
                        onChange={actualizarFila(f.id, 'etiquetaCorrecta')}
                        etiquetaAccesible={`etiqueta correcta, lectura ${i + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <OpcionSiNo
                        valor={f.empaqueCorrecto}
                        onChange={actualizarFila(f.id, 'empaqueCorrecto')}
                        etiquetaAccesible={`empaque correcto, lectura ${i + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={f.peso ?? ''}
                        onChange={(e) => actualizarFila(f.id, 'peso')(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="—"
                        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="0"
                        value={f.cantidadEnvasados ?? ''}
                        onChange={(e) => actualizarFila(f.id, 'cantidadEnvasados')(e.target.value === '' ? null : Number(e.target.value))}
                        placeholder="—"
                        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => quitarFila(f.id)}
                        aria-label="Quitar lectura"
                        className="flex size-7 items-center justify-center rounded-full text-marron-cafe/40 transition-colors duration-150 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={5} titulo="Rechazos por impurezas">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECHAZOS_IMPUREZAS.map((r) => (
              <NumeroCampo key={r.key} label={r.label} valor={rechazos[r.key]} onChange={actualizarRechazo(r.key)} />
            ))}
            <CampoComputado label="Total" valor={totalRechazos} />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={6} titulo="Reproceso">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <NumeroCampo label="Sacos" valor={reproceso.sacos} onChange={actualizarReproceso('sacos')} />
            <NumeroCampo label="Big Bag" valor={reproceso.bigBag} onChange={actualizarReproceso('bigBag')} />
            <NumeroCampo label="K. Raft" valor={reproceso.kraft} onChange={actualizarReproceso('kraft')} />
            <NumeroCampo label="Otros" valor={reproceso.otros} onChange={actualizarReproceso('otros')} />
            <FormInput
              label="Etapa de proceso"
              value={reproceso.etapaProceso}
              onChange={(e) => actualizarReproceso('etapaProceso')(e.target.value)}
              placeholder="A qué etapa vuelve"
            />
            <CampoComputado label="Total" valor={totalReproceso} />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={7} titulo="Producto terminado">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoComputado label="Unidades producidas" valor={unidadesProducidas} hint="Etiqueta y empaque correctos" />
            <CampoComputado label="Total producidas" valor={totalProducidas} hint="Todas las lecturas registradas" />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={8} titulo="Firmas">
          <FirmasResponsables responsables={RESPONSABLES} />
        </SeccionFormulario>
      </div>

      <div className="flex justify-end print:hidden">
        <Button onClick={registrar} disabled={enviando}>
          {enviando ? 'Guardando…' : 'Guardar registro'}
        </Button>
      </div>
    </div>
  )
}

function NumeroCampo({ label, valor, onChange }) {
  return (
    <FormInput
      label={label}
      type="number"
      min="0"
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
    />
  )
}

function CampoComputado({ label, valor, hint }) {
  return (
    <div className="flex flex-col gap-1.5 text-sm text-marron-cafe">
      {label}
      <div className="flex min-w-0 flex-col gap-0.5 rounded-xl border border-marron-tierra/20 bg-marron-tierra/5 px-3 py-2">
        <span className="font-semibold text-marron-cafe">{valor.toLocaleString('es-BO')}</span>
        {hint && <span className="text-xs text-marron-cafe/50">{hint}</span>}
      </div>
    </div>
  )
}

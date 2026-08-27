import { useEffect, useMemo, useState } from 'react'
import { Download, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import { colorVar } from '../../../config/colorTokens'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormSelect from '../../FormSelect.jsx'
import Skeleton from '../../Skeleton.jsx'

const TURNOS = [1, 2, 3]
const RESPONSABLES_CONTROL = ['William Paco']
const SUPERVISORAS = ['Claudia Rojas', 'Gabriela Tarqui']

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Responsable de control' },
  { rol: 'Verifica', puesto: 'Supervisora' },
]

// Reglas exactas del relevamiento (I-PRO-03/R-01):
// - Secador 1 no debe trabajar por debajo de 70°C.
// - Humedad objetivo 10%-12%; alerta si >15% (vuelve al secador) o <7%.
const SECADOR_1_MIN = 70
const HUMEDAD_OBJETIVO_MIN = 10
const HUMEDAD_OBJETIVO_MAX = 12
const HUMEDAD_ALERTA_ALTA = 15
const HUMEDAD_ALERTA_BAJA = 7

const CABECERA_VACIA = { fecha: new Date().toLocaleDateString('en-CA'), turno: 1, loteMpId: '', loteEnvase: '', responsable: '', encargado: '' }

let siguienteFilaId = 1
function proximaHora(ultima) {
  if (!ultima) return '08:00'
  const [h, m] = ultima.split(':').map(Number)
  const total = h * 60 + m + 30
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
function filaVacia(horaAnterior) {
  return {
    id: siguienteFilaId++,
    hora: proximaHora(horaAnterior),
    secador1: null,
    secador2: null,
    humedad: null,
    observacion: '',
    correccion: '',
  }
}

// Formulario 3 — lectura de secadores y humedad cada 30 min. El sistema
// promedia la humedad del lote y dispara alertas (pedido explícito), tanto
// por fila (fuera del objetivo 10-12%) como sobre el promedio general.
export default function ControlTemperaturaHumedad() {
  const [lotesMp, setLotesMp] = useState(null)
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [filas, setFilas] = useState([filaVacia(null)])
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
  const actualizarFila = (id, campo) => (valor) =>
    setFilas((fs) => fs.map((f) => (f.id === id ? { ...f, [campo]: valor } : f)))
  const agregarFila = () => setFilas((fs) => [...fs, filaVacia(fs[fs.length - 1]?.hora)])
  const quitarFila = (id) => setFilas((fs) => fs.filter((f) => f.id !== id))

  const lecturasHumedad = filas.map((f) => f.humedad).filter((v) => v != null)
  const humedadPromedio =
    lecturasHumedad.length > 0 ? lecturasHumedad.reduce((a, b) => a + b, 0) / lecturasHumedad.length : null

  const estadoHumedadPromedio = useMemo(() => {
    if (humedadPromedio == null) return null
    if (humedadPromedio > HUMEDAD_ALERTA_ALTA || humedadPromedio < HUMEDAD_ALERTA_BAJA) {
      return { tono: 'negativo', label: `Humedad promedio ${humedadPromedio.toFixed(1)}% — fuera de rango` }
    }
    if (humedadPromedio >= HUMEDAD_OBJETIVO_MIN && humedadPromedio <= HUMEDAD_OBJETIVO_MAX) {
      return { tono: 'positivo', label: `Humedad promedio ${humedadPromedio.toFixed(1)}% — en objetivo` }
    }
    return { tono: 'ambar', label: `Humedad promedio ${humedadPromedio.toFixed(1)}% — cerca del límite` }
  }, [humedadPromedio])

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarSecado({ cabecera, filas, humedadPromedio }))
      toast.success('Lecturas de secado guardadas.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Control de Temperatura de Secado y Humedad"
          codigo="I-PRO-03/R-01"
          version="04"
          acciones={
            <div className="flex items-center gap-2">
              {estadoHumedadPromedio && <Badge tono={estadoHumedadPromedio.tono}>{estadoHumedadPromedio.label}</Badge>}
              <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
                <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
                {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
              </Button>
            </div>
          }
        />

        <SeccionFormulario numero={1} titulo="Cabecera">
          {!lotesMp ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-marron-cafe">
                Fecha
                <input
                  type="date"
                  value={cabecera.fecha}
                  onChange={(e) => actualizarCabecera('fecha')(e.target.value)}
                  className="min-w-0 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none focus-visible:border-verde-lima"
                />
              </label>

              <FormSelect label="Turno" value={cabecera.turno} onChange={(e) => actualizarCabecera('turno')(Number(e.target.value))}>
                {TURNOS.map((t) => (
                  <option key={t} value={t}>
                    Turno {t}
                  </option>
                ))}
              </FormSelect>

              <FormSelect label="Lote MP" value={cabecera.loteMpId} onChange={(e) => actualizarCabecera('loteMpId')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {lotesMp.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} · {l.product}
                  </option>
                ))}
              </FormSelect>

              <label className="flex min-w-0 flex-col gap-1.5 text-sm text-marron-cafe">
                Lote envase
                <input
                  type="text"
                  value={cabecera.loteEnvase}
                  onChange={(e) => actualizarCabecera('loteEnvase')(e.target.value)}
                  placeholder="Lo asigna Compras — independiente del lote MP"
                  className="min-w-0 rounded-xl border border-marron-tierra/20 bg-white px-3 py-2 text-sm text-marron-cafe outline-none placeholder:text-marron-cafe/35 focus-visible:border-verde-lima"
                />
              </label>

              <FormSelect
                label="Responsable"
                value={cabecera.responsable}
                onChange={(e) => actualizarCabecera('responsable')(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {RESPONSABLES_CONTROL.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </FormSelect>

              <FormSelect label="Encargado" value={cabecera.encargado} onChange={(e) => actualizarCabecera('encargado')(e.target.value)}>
                <option value="">Seleccionar…</option>
                {SUPERVISORAS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </FormSelect>
            </div>
          )}
        </SeccionFormulario>

        {lecturasHumedad.length >= 2 && <TendenciaSecado filas={filas} />}

        <SeccionFormulario
          numero={2}
          titulo="Lecturas cada 30 minutos"
          nota={`Secador 1 no debe bajar de ${SECADOR_1_MIN}°C. Humedad objetivo ${HUMEDAD_OBJETIVO_MIN}%-${HUMEDAD_OBJETIVO_MAX}%; alerta si >${HUMEDAD_ALERTA_ALTA}% (vuelve al secador) o <${HUMEDAD_ALERTA_BAJA}%.`}
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar lectura
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[880px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Hora</th>
                  <th className="px-3 py-2.5">Secador 1 (°C)</th>
                  <th className="px-3 py-2.5">Secador 2 (°C)</th>
                  <th className="px-3 py-2.5">Humedad (%H)</th>
                  <th className="px-3 py-2.5">Observación</th>
                  <th className="px-3 py-2.5">Corrección</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filas.map((f) => {
                  const secador1Bajo = f.secador1 != null && f.secador1 < SECADOR_1_MIN
                  const humedadAlta = f.humedad != null && f.humedad > HUMEDAD_ALERTA_ALTA
                  const humedadBaja = f.humedad != null && f.humedad < HUMEDAD_ALERTA_BAJA
                  return (
                    <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          value={f.hora}
                          onChange={(e) => actualizarFila(f.id, 'hora')(e.target.value)}
                          className="w-24 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <CeldaNumero valor={f.secador1} onChange={actualizarFila(f.id, 'secador1')} alerta={secador1Bajo} />
                          {secador1Bajo && <TriangleAlert className="size-4 shrink-0 text-rojo-pasankalla" strokeWidth={1.75} />}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <CeldaNumero valor={f.secador2} onChange={actualizarFila(f.id, 'secador2')} />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <CeldaNumero
                            valor={f.humedad}
                            onChange={actualizarFila(f.id, 'humedad')}
                            decimales={1}
                            alerta={humedadAlta || humedadBaja}
                          />
                          {(humedadAlta || humedadBaja) && (
                            <TriangleAlert className="size-4 shrink-0 text-rojo-pasankalla" strokeWidth={1.75} />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={f.observacion}
                          onChange={(e) => actualizarFila(f.id, 'observacion')(e.target.value)}
                          placeholder="—"
                          className="w-40 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={f.correccion}
                          onChange={(e) => actualizarFila(f.id, 'correccion')(e.target.value)}
                          placeholder="—"
                          className="w-40 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
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
                  )
                })}
              </tbody>
            </table>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={3} titulo="Firmas">
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

// Celda numérica compacta, propia de esta tabla — `alerta` la pinta en
// rojo cuando el valor está fuera de la regla (secador bajo/humedad fuera
// de rango), para que se note sin tener que leer el número contra la nota.
function CeldaNumero({ valor, onChange, decimales = 0, alerta = false }) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step={decimales > 0 ? 0.1 : 1}
      value={valor ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder="—"
      className={`w-20 rounded-lg border bg-white px-2 py-1.5 text-right text-xs tabular-nums outline-none focus-visible:border-verde-lima ${
        alerta ? 'border-rojo-pasankalla/50 text-rojo-pasankalla' : 'border-marron-tierra/20 text-marron-cafe'
      }`}
    />
  )
}

// Tendencia de las lecturas del turno — mismo criterio que
// GrowthChartCard/DistributionChartCard del dashboard genérico: SVG a mano,
// sin librería nueva. Local a este formulario porque la escala (°C vs. %H
// en dos ejes) es específica de esta pantalla, no reusable tal cual.
function TendenciaSecado({ filas }) {
  const width = 640
  const height = 140
  const padding = 12
  const plotWidth = width - padding * 2
  const plotHeight = height - padding * 2

  const puntos = (valores, max) =>
    valores
      .map((v, i) => {
        const x = padding + (filas.length > 1 ? (i / (filas.length - 1)) * plotWidth : 0)
        const y = v == null ? null : padding + plotHeight - (Math.min(v, max) / max) * plotHeight
        return y == null ? null : `${x},${y}`
      })
      .filter(Boolean)
      .join(' ')

  const series = [
    { nombre: 'Secador 1', valores: filas.map((f) => f.secador1), max: 100, color: 'marron-arcilla' },
    { nombre: 'Secador 2', valores: filas.map((f) => f.secador2), max: 100, color: 'oro-quinua' },
    { nombre: 'Humedad %', valores: filas.map((f) => f.humedad), max: 20, color: 'azul-andino' },
  ]

  return (
    <div className="rounded-3xl bg-marron-tierra/5 p-5">
      <p className="font-extrabold text-marron-cafe">Tendencia del turno</p>
      <div className="mt-2 mb-1 flex flex-wrap gap-3">
        {series.map((s) => (
          <span key={s.nombre} className="flex items-center gap-1.5 text-xs text-marron-cafe/70">
            <span className="size-2 rounded-full" style={{ background: colorVar(s.color) }} />
            {s.nombre}
          </span>
        ))}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        <line
          x1={padding}
          y1={padding + plotHeight}
          x2={width - padding}
          y2={padding + plotHeight}
          stroke="var(--color-marron-tierra)"
          strokeOpacity="0.15"
        />
        {series.map((s) => (
          <polyline
            key={s.nombre}
            points={puntos(s.valores, s.max)}
            fill="none"
            stroke={colorVar(s.color)}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
    </div>
  )
}

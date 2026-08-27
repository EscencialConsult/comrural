import { useEffect, useState } from 'react'
import { Download, Plus, Trash2 } from 'lucide-react'
import { produccionService } from '../../../services/produccionService'
import { useGenerarPdf } from '../../../hooks/useGenerarPdf'
import { useSolicitud } from '../../../hooks/useSolicitud'
import { toast } from '../../../lib/toast'
import Badge from '../../Badge.jsx'
import Button from '../../Button.jsx'
import CabeceraFormulario from '../../formularios/CabeceraFormulario.jsx'
import SeccionFormulario from '../../formularios/SeccionFormulario.jsx'
import FirmasResponsables from '../../formularios/FirmasResponsables.jsx'
import FormInput from '../../FormInput.jsx'
import FormSelect from '../../FormSelect.jsx'
import Skeleton from '../../Skeleton.jsx'

const TIPOS_QUINUA = ['Blanca', 'Negra', 'Roja']
const TURNOS = [1, 2, 3]

const RESPONSABLES = [
  { rol: 'Llena', puesto: 'Encargado de grupo' },
  { rol: 'Verifica', puesto: 'Supervisor de Producción' },
]

// Sección "Subproductos/Mermas" del papel (a-e) — nombres reales según RP-09:
// "producto bueno = quinua lavada; subproductos = para trillar y menuda;
// merma = paja húmeda, piedra y saponina" → 3 de merma + 2 de subproducto,
// mismo orden a-e que usa el formulario real.
const COLUMNAS_MERMA = [
  { key: 'a', label: 'a) Paja húmeda' },
  { key: 'b', label: 'b) Piedra' },
  { key: 'c', label: 'c) Saponina' },
  { key: 'd', label: 'd) Para trillar' },
  { key: 'e', label: 'e) Menuda' },
]

const CABECERA_VACIA = { tipoQuinua: '', loteMpId: '', numeroSacos: null, totalKg: null }

let siguienteFilaId = 1
function filaVacia() {
  return {
    id: siguienteFilaId++,
    fecha: new Date().toLocaleDateString('en-CA'),
    turno: 1,
    bolsasRecibidas: null,
    bolsasUtilizadas: null,
    sacosLavadosBolsas: null,
    sacosLavadosKg: null,
    a: null,
    b: null,
    c: null,
    d: null,
    e: null,
    observaciones: '',
  }
}

// Formulario 2 del relevamiento — registro central de Área A. Balance
// pedido (RP-10): Utilizados(A) + DIF = Lavados(B) + Merma(a+b+c+d+e), con
// DIF = "ganancia de peso por humedad en el lavado" (se espera positiva).
// Acá DIF se CALCULA como el residuo de esa ecuación por turno (no es un
// dato que se tipee aparte) y se marca en rojo si da negativo — sería una
// pérdida de peso inesperada, no la ganancia por humedad que describe la
// regla.
export default function ControlVolumenA() {
  const [lotesMp, setLotesMp] = useState(null)
  const [cabecera, setCabecera] = useState(CABECERA_VACIA)
  const [filas, setFilas] = useState([filaVacia()])
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
  const agregarFila = () => setFilas((fs) => [...fs, filaVacia()])
  const quitarFila = (id) => setFilas((fs) => fs.filter((f) => f.id !== id))

  const pesoPromedioKg =
    cabecera.numeroSacos > 0 && cabecera.totalKg != null ? cabecera.totalKg / cabecera.numeroSacos : null

  const filasConCalculo = filas.map((f) => {
    const saldoBolsas = (f.bolsasRecibidas ?? 0) - (f.bolsasUtilizadas ?? 0)
    const merma = COLUMNAS_MERMA.reduce((acc, { key }) => acc + (f[key] ?? 0), 0)
    const utilizadosKg = pesoPromedioKg != null ? (f.bolsasUtilizadas ?? 0) * pesoPromedioKg : null
    const dif = utilizadosKg != null ? (f.sacosLavadosKg ?? 0) + merma - utilizadosKg : null
    return { ...f, saldoBolsas, merma, dif }
  })

  const totales = filasConCalculo.reduce(
    (acc, f) => ({
      bolsasRecibidas: acc.bolsasRecibidas + (f.bolsasRecibidas ?? 0),
      bolsasUtilizadas: acc.bolsasUtilizadas + (f.bolsasUtilizadas ?? 0),
      sacosLavadosKg: acc.sacosLavadosKg + (f.sacosLavadosKg ?? 0),
      merma: acc.merma + f.merma,
      dif: acc.dif + (f.dif ?? 0),
    }),
    { bolsasRecibidas: 0, bolsasUtilizadas: 0, sacosLavadosKg: 0, merma: 0, dif: 0 },
  )

  // RP-07: "el registro es por turno; un lote se cierra cuando la suma de
  // los turnos completa el total ingresado" — comparado contra "No. Sacos"
  // de la cabecera, que es el total del lote a procesar.
  const loteCerrado = cabecera.numeroSacos > 0 && totales.bolsasUtilizadas >= cabecera.numeroSacos

  const registrar = async () => {
    try {
      await ejecutar(() => produccionService.registrarVolumenA({ cabecera, filas: filasConCalculo }))
      toast.success('Registro de Volumen A guardado.')
    } catch {
      toast.error('No se pudo guardar el registro.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div ref={areaImprimibleRef} className="flex flex-col gap-6">
        <CabeceraFormulario
          antetitulo="Registro"
          titulo="Control de Volumen de Producción — Área A"
          codigo="P-PRO-01/R-24"
          version="02"
          acciones={
            <div className="flex items-center gap-2">
              {cabecera.numeroSacos > 0 && (
                <Badge tono={loteCerrado ? 'liberado' : 'info'}>{loteCerrado ? 'Lote cerrado' : 'En proceso'}</Badge>
              )}
              <Button variant="secondary" onClick={generarPdf} disabled={generandoPdf} className="px-4 py-2 text-xs">
                <Download className="mr-1.5 size-3.5" strokeWidth={1.75} />
                {generandoPdf ? 'Generando PDF…' : 'Exportar PDF'}
              </Button>
            </div>
          }
        />

        <SeccionFormulario numero={1} titulo="Cabecera">
          {!lotesMp ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormSelect
                label="Tipo de quinua"
                value={cabecera.tipoQuinua}
                onChange={(e) => actualizarCabecera('tipoQuinua')(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {TIPOS_QUINUA.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </FormSelect>

              <FormSelect
                label="Lote MP"
                value={cabecera.loteMpId}
                onChange={(e) => actualizarCabecera('loteMpId')(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {lotesMp.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.code} · {l.product}
                  </option>
                ))}
              </FormSelect>

              <FormInput
                label="No. Sacos"
                type="number"
                min="0"
                value={cabecera.numeroSacos ?? ''}
                onChange={(e) => actualizarCabecera('numeroSacos')(e.target.value === '' ? null : Number(e.target.value))}
              />

              <FormInput
                label="Total Kg"
                type="number"
                min="0"
                value={cabecera.totalKg ?? ''}
                onChange={(e) => actualizarCabecera('totalKg')(e.target.value === '' ? null : Number(e.target.value))}
                hint={pesoPromedioKg != null ? `Promedio: ${pesoPromedioKg.toFixed(1)} kg/saco` : undefined}
              />
            </div>
          )}
        </SeccionFormulario>

        <SeccionFormulario
          numero={2}
          titulo="Filas por turno"
          nota="DIF = ganancia de peso por humedad en el lavado. Balance: Utilizados + DIF = Lavados + Merma."
          acciones={
            <Button variant="secondary" onClick={agregarFila} className="px-3 py-1.5 text-xs">
              <Plus className="mr-1 size-3.5" strokeWidth={2} />
              Agregar turno
            </Button>
          }
        >
          <div className="overflow-x-auto rounded-2xl bg-white/70">
            <table className="w-full min-w-[1200px] border-collapse text-sm">
              <thead>
                <tr className="border-b-2 border-verde-hoja/35 text-left text-xs font-bold uppercase tracking-wide text-verde-bosque">
                  <th className="px-3 py-2.5">Fecha</th>
                  <th className="px-3 py-2.5">Turno</th>
                  <th className="px-3 py-2.5">Bolsas recibidas</th>
                  <th className="px-3 py-2.5">Bolsas utilizadas</th>
                  <th className="px-3 py-2.5">Saldo bolsas</th>
                  <th className="px-3 py-2.5">Sacos lavados (bolsas)</th>
                  <th className="px-3 py-2.5">Sacos lavados (Kg)</th>
                  {COLUMNAS_MERMA.map((c) => (
                    <th key={c.key} className="px-3 py-2.5">
                      {c.label}
                    </th>
                  ))}
                  <th className="px-3 py-2.5">DIF</th>
                  <th className="px-3 py-2.5">Observaciones</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {filasConCalculo.map((f) => (
                  <tr key={f.id} className="border-b border-marron-tierra/15 last:border-b-0">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={f.fecha}
                        onChange={(e) => actualizarFila(f.id, 'fecha')(e.target.value)}
                        className="w-36 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={f.turno}
                        onChange={(e) => actualizarFila(f.id, 'turno')(Number(e.target.value))}
                        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      >
                        {TURNOS.map((t) => (
                          <option key={t} value={t}>
                            Turno {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <CeldaNumero valor={f.bolsasRecibidas} onChange={actualizarFila(f.id, 'bolsasRecibidas')} />
                    <CeldaNumero valor={f.bolsasUtilizadas} onChange={actualizarFila(f.id, 'bolsasUtilizadas')} />
                    <td className="px-3 py-2 text-center font-semibold text-marron-cafe/70">{f.saldoBolsas}</td>
                    <CeldaNumero valor={f.sacosLavadosBolsas} onChange={actualizarFila(f.id, 'sacosLavadosBolsas')} />
                    <CeldaNumero valor={f.sacosLavadosKg} onChange={actualizarFila(f.id, 'sacosLavadosKg')} decimales={1} />
                    {COLUMNAS_MERMA.map((c) => (
                      <CeldaNumero key={c.key} valor={f[c.key]} onChange={actualizarFila(f.id, c.key)} decimales={1} />
                    ))}
                    <td className="px-3 py-2 text-center">
                      {f.dif != null ? (
                        <span className={`font-semibold ${f.dif < 0 ? 'text-rojo-pasankalla' : 'text-verde-bosque'}`}>
                          {f.dif.toFixed(1)} kg
                        </span>
                      ) : (
                        <span className="text-marron-cafe/30">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={f.observaciones}
                        onChange={(e) => actualizarFila(f.id, 'observaciones')(e.target.value)}
                        placeholder="—"
                        className="w-40 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-xs text-marron-cafe outline-none focus-visible:border-verde-lima"
                      />
                    </td>
                    <td className="px-3 py-2 print:hidden">
                      <button
                        type="button"
                        onClick={() => quitarFila(f.id)}
                        aria-label="Quitar turno"
                        className="flex size-7 items-center justify-center rounded-full text-marron-cafe/40 transition-colors duration-150 hover:bg-rojo-pasankalla/10 hover:text-rojo-pasankalla"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-verde-hoja/35 text-xs font-bold text-marron-cafe">
                  <td className="px-3 py-2.5" colSpan={2}>
                    Totales
                  </td>
                  <td className="px-3 py-2.5">{totales.bolsasRecibidas}</td>
                  <td className="px-3 py-2.5">{totales.bolsasUtilizadas}</td>
                  <td className="px-3 py-2.5">{totales.bolsasRecibidas - totales.bolsasUtilizadas}</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5">{totales.sacosLavadosKg.toFixed(1)} kg</td>
                  <td className="px-3 py-2.5" colSpan={5}>
                    Merma total: {totales.merma.toFixed(1)} kg
                  </td>
                  <td className="px-3 py-2.5">{totales.dif.toFixed(1)} kg</td>
                  <td className="px-3 py-2.5" colSpan={2} />
                </tr>
              </tfoot>
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

// Celda numérica compacta, propia de esta tabla (no un componente
// compartido — el estilo/ancho está pensado solo para encajar entre las
// ~13 columnas de esta grilla, no para reusarse en otro formulario).
function CeldaNumero({ valor, onChange, decimales = 0 }) {
  return (
    <td className="px-3 py-2">
      <input
        type="number"
        inputMode="decimal"
        step={decimales > 0 ? 0.1 : 1}
        min="0"
        value={valor ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder="—"
        className="w-20 rounded-lg border border-marron-tierra/20 bg-white px-2 py-1.5 text-right text-xs tabular-nums text-marron-cafe outline-none focus-visible:border-verde-lima"
      />
    </td>
  )
}
